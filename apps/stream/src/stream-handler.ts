import WebSocket from 'ws';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import Groq from 'groq-sdk';
import { twilioToPcm16k } from './audio-pipeline';
import {
  setState,
  getState,
  appendHistory,
  getHistory,
  setPatientId,
  getPatientId,
  cleanupCall,
  CallState,
} from './redis-session';
import { validateCrisisResponse } from './response-validator';

const CRISIS_SYSTEM_PROMPT = `You are a compassionate AI crisis support agent on a live phone call with someone in mental distress. 

STRICT RULES:
- Respond in maximum 2 short sentences. Voice responses must be brief and calm.
- ONLY provide crisis de-escalation and direct professional resource referral (988 Lifeline, 911).
- NEVER diagnose, prescribe, or suggest self-treatment.
- NEVER discuss anything outside immediate safety and professional help.
- If the person says they are safe and want to end the call, say goodbye warmly and remind them 988 is available 24/7.
- If they go silent for 15 seconds, say: "I'm still here. Take your time."
- Your tone must always be calm, warm, and non-judgmental.`;

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID!;
const GROQ_API_KEY = process.env.GROQ_API_KEY!;

const groq = new Groq({ apiKey: GROQ_API_KEY });
const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

export class StreamHandler {
  private callSid: string = '';
  private twilioWs: WebSocket;
  private streamSid: string = '';

  private deepgramConn: ReturnType<typeof deepgram.listen.live> | null = null;
  private ttsAbortController: AbortController | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(ws: WebSocket) {
    this.twilioWs = ws;
    ws.on('message', (data) => this.onTwilioMessage(data.toString()));
    ws.on('close', () => this.onClose());
  }

  // ─── Twilio Message Router ────────────────────────────────────────────────
  private async onTwilioMessage(raw: string): Promise<void> {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg['event']) {
      case 'connected':
        console.log('[Stream] Twilio WebSocket connected');
        break;

      case 'start': {
        const start = msg['start'] as Record<string, unknown>;
        this.callSid = start['callSid'] as string;
        this.streamSid = start['streamSid'] as string;
        await this.initCall();
        break;
      }

      case 'media': {
        const media = msg['media'] as Record<string, unknown>;
        const payload = media['payload'] as string;
        await this.onAudioChunk(payload);
        break;
      }

      case 'stop':
        await this.onClose();
        break;
    }
  }

  // ─── Call Initialization ──────────────────────────────────────────────────
  private async initCall(): Promise<void> {
    console.log(`[Stream] Init call: ${this.callSid}`);
    await setState(this.callSid, 'LISTENING');
    this.initDeepgram();
    // Greet the patient
    await this.speak("Hello, I'm here with you. Please take your time and tell me what's happening.");
  }

  // ─── Deepgram Live ASR ────────────────────────────────────────────────────
  private initDeepgram(): void {
    this.deepgramConn = deepgram.listen.live({
      model: 'nova-3',
      language: 'en-US',
      encoding: 'linear16',
      sample_rate: 16000,
      interim_results: true,
      endpointing: 300,
      smart_format: true,
    });

    this.deepgramConn.on(LiveTranscriptionEvents.Open, () => {
      console.log('[Deepgram] Connection open');
    });

    this.deepgramConn.on(LiveTranscriptionEvents.Transcript, async (data) => {
      const alt = data.channel?.alternatives?.[0];
      const text = alt?.transcript?.trim();
      if (!text) return;

      // Reset silence timer on any speech
      this.resetSilenceTimer();

      const isFinal = data.is_final;

      // Barge-in: if AI is speaking and patient starts talking again
      if (await getState(this.callSid) === 'SPEAKING') {
        console.log('[Stream] Barge-in detected — cancelling TTS');
        await this.cancelTts();
      }

      // Only process final transcripts to avoid double-responding
      if (isFinal && text.length > 2) {
        await this.onFinalTranscript(text);
      }
    });

    this.deepgramConn.on(LiveTranscriptionEvents.Error, (err) => {
      console.error('[Deepgram] Error:', err);
    });
  }

  // ─── Audio Chunk Processing ───────────────────────────────────────────────
  private async onAudioChunk(base64Payload: string): Promise<void> {
    const state = await getState(this.callSid);
    // Only feed Deepgram when listening
    if ((state === 'LISTENING' || state === 'SPEAKING') && this.deepgramConn) {
      try {
        const pcm16k = twilioToPcm16k(base64Payload);
        // Deepgram expects ArrayBuffer / SharedArrayBuffer
        this.deepgramConn.send(pcm16k.buffer.slice(pcm16k.byteOffset, pcm16k.byteOffset + pcm16k.byteLength) as ArrayBuffer);
      } catch (e) {
        console.error('[Audio] Pipeline error:', e);
      }
    }
  }

  // ─── Final Transcript → LLM → TTS ────────────────────────────────────────
  private async onFinalTranscript(text: string): Promise<void> {
    console.log(`[Deepgram] Final: "${text}"`);
    await setState(this.callSid, 'PROCESSING');
    await appendHistory(this.callSid, { role: 'patient', text });

    try {
      const history = await getHistory(this.callSid);
      const messages = [
        { role: 'system' as const, content: CRISIS_SYSTEM_PROMPT },
        ...history.map(t => ({
          role: t.role === 'patient' ? 'user' as const : 'assistant' as const,
          content: t.text,
        })),
      ];

      // Stream Groq response
      const stream = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        stream: true,
        max_tokens: 80,
      });

      let fullText = '';
      for await (const chunk of stream) {
        fullText += chunk.choices[0]?.delta?.content ?? '';
      }

      // Safety validation
      const safe = await validateCrisisResponse(fullText);
      await appendHistory(this.callSid, { role: 'agent', text: safe });
      await this.speak(safe);
    } catch (e) {
      console.error('[LLM] Error:', e);
      await setState(this.callSid, 'LISTENING');
    }
  }

  // ─── TTS via ElevenLabs → Twilio ─────────────────────────────────────────
  private async speak(text: string): Promise<void> {
    await setState(this.callSid, 'SPEAKING');
    this.ttsAbortController = new AbortController();
    const signal = this.ttsAbortController.signal;

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream?output_format=ulaw_8000`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_flash_v2_5',
            voice_settings: { stability: 0.8, similarity_boost: 0.75 },
          }),
          signal,
        }
      );

      if (!response.ok || !response.body) throw new Error(`ElevenLabs error: ${response.status}`);

      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done || signal.aborted) break;
        this.sendAudioToTwilio(Buffer.from(value));
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        console.error('[TTS] ElevenLabs stream error:', e.message);
      }
    } finally {
      if (!signal.aborted) {
        await setState(this.callSid, 'LISTENING');
      }
    }
  }

  // ─── Barge-In: Cancel TTS ────────────────────────────────────────────────
  private async cancelTts(): Promise<void> {
    this.ttsAbortController?.abort();
    this.ttsAbortController = null;
    // Flush Twilio's audio buffer
    this.twilioWs.send(JSON.stringify({ event: 'clear', streamSid: this.streamSid }));
    await setState(this.callSid, 'LISTENING');
  }

  // ─── Send Audio to Twilio ─────────────────────────────────────────────────
  private sendAudioToTwilio(audioChunk: Buffer): void {
    if (this.twilioWs.readyState !== WebSocket.OPEN) return;
    const msg = {
      event: 'media',
      streamSid: this.streamSid,
      media: { payload: audioChunk.toString('base64') },
    };
    this.twilioWs.send(JSON.stringify(msg));
  }

  // ─── Silence Handling ─────────────────────────────────────────────────────
  private resetSilenceTimer(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(async () => {
      const state = await getState(this.callSid);
      if (state === 'LISTENING') {
        await this.speak("I'm still here. Take your time.");
      }
    }, 15_000);
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  private async onClose(): Promise<void> {
    console.log(`[Stream] Call ended: ${this.callSid}`);
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.ttsAbortController?.abort();
    this.deepgramConn?.finish();
    if (this.callSid) await cleanupCall(this.callSid);
  }
}
