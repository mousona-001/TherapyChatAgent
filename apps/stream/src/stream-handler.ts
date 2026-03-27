import WebSocket from 'ws';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import Groq from 'groq-sdk';
import { twilioToPcm16k } from './audio-pipeline';
import {
  setState,
  appendHistory,
  getHistory,
  cleanupCall,
} from './redis-session';
import { validateCrisisResponse } from './response-validator';

// ─── Config ───────────────────────────────────────────────────────────────────
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY ?? '';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? '';
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY ?? '';

if (!ELEVENLABS_API_KEY) console.error('[Config] ⚠️  ELEVENLABS_API_KEY is missing!');
if (!ELEVENLABS_VOICE_ID) console.error('[Config] ⚠️  ELEVENLABS_VOICE_ID is missing!');
if (!GROQ_API_KEY) console.error('[Config] ⚠️  GROQ_API_KEY is missing!');
if (!DEEPGRAM_API_KEY) console.error('[Config] ⚠️  DEEPGRAM_API_KEY is missing!');

const CRISIS_SYSTEM_PROMPT = `You are a trained crisis counsellor on a live phone call. You are warm, calm, and genuinely present. Your role is to provide immediate emotional support and de-escalation — not therapy, not diagnosis.

THERAPEUTIC APPROACH:
- Use active listening: reflect back what the person says to show you heard them. Example: "It sounds like you're feeling completely overwhelmed right now."
- Validate their feelings without judgment. Never say "I understand" — instead say things like "That makes complete sense given what you're going through."
- Ask one open-ended question at a time. Never pepper them with multiple questions.
- Use their name if you know it. Use "I" statements to stay connected: "I'm right here with you."
- Follow motivational interviewing: build on their strengths and reasons for calling. Calling for help is a courageous act — acknowledge it.
- If they express suicidal ideation, use safe messaging: don't ask "do you have a plan?" — instead ask "Are you safe right now?"
- Speak in natural, spoken English. No lists, no bullet points, no clinical jargon.
- Pace your responses like a real person — short, warm, never rushed.

STRICT SAFETY RULES:
- Maximum 2 short sentences per response. This is a phone call, not an essay.
- NEVER give medical advice, diagnoses, or medication suggestions.
- NEVER suggest coping strategies involving substances.
- If they mention a specific plan to harm themselves, calmly ask them to call 988 or 911 immediately, and offer to stay on the line.
- If they say they're safe and want to end the call, warmly close: acknowledge their courage, remind them 988 is 24/7, and say goodbye with care.

EXAMPLE RESPONSES (for reference, not to repeat verbatim):
- "It sounds like you've been carrying this for a really long time. I'm glad you reached out."
- "You don't have to have it all figured out right now. I'm just here with you."
- "That took real courage to say. Can you tell me a bit more about what tonight feels like for you?"
- "I hear you. Are you somewhere safe right now?"`;

let _groq: Groq | null = null;
const getGroq = () => _groq ??= new Groq({ apiKey: GROQ_API_KEY });

const deepgram = createClient(DEEPGRAM_API_KEY);

// ─── StreamHandler ────────────────────────────────────────────────────────────
export class StreamHandler {
  private callSid = '';
  private streamSid = '';
  private twilioWs: WebSocket;
  private deepgramConn: ReturnType<typeof deepgram.listen.live> | null = null;
  private ttsAbortController: AbortController | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(ws: WebSocket) {
    this.twilioWs = ws;
    console.log('[StreamHandler] New handler created — waiting for Twilio start event');

    ws.on('message', (data) => {
      this.onTwilioMessage(data.toString()).catch(e =>
        console.error('[StreamHandler] Unhandled error in onTwilioMessage:', e)
      );
    });

    ws.on('close', (code, reason) => {
      console.log(`[StreamHandler] WebSocket closed: code=${code} reason=${reason.toString()}`);
      this.onClose().catch(e => console.error('[StreamHandler] Error during cleanup:', e));
    });

    ws.on('error', (err) => {
      console.error('[StreamHandler] WebSocket error:', err);
    });
  }

  // ─── Twilio Message Router ────────────────────────────────────────────────
  private async onTwilioMessage(raw: string): Promise<void> {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw);
    } catch {
      console.warn('[StreamHandler] Non-JSON message received — ignoring');
      return;
    }

    const event = msg['event'] as string;
    if (event !== 'media') console.log(`[Twilio] Event: ${event}`);

    switch (event) {
      case 'connected':
        console.log('[Twilio] ✅ Connected — waiting for start event...');
        break;

      case 'start': {
        const start = msg['start'] as Record<string, unknown>;
        this.callSid = start['callSid'] as string;
        this.streamSid = start['streamSid'] as string;
        console.log(`[Twilio] ✅ Stream started. callSid=${this.callSid} streamSid=${this.streamSid}`);
        console.log(`[Twilio] Stream tracks: ${JSON.stringify(start['tracks'])}`);
        await this.initCall();
        break;
      }

      case 'media': {
        const media = msg['media'] as Record<string, unknown>;
        await this.onAudioChunk(media['payload'] as string);
        break;
      }

      case 'dtmf':
        console.log(`[Twilio] DTMF key pressed: ${JSON.stringify(msg['dtmf'])}`);
        break;

      case 'stop':
        console.log('[Twilio] Stop event received — ending call');
        await this.onClose();
        break;

      default:
        console.log(`[Twilio] Unknown event: ${event}`);
    }
  }

  // ─── Call Initialization ──────────────────────────────────────────────────
  private async initCall(): Promise<void> {
    console.log(`[StreamHandler] Initialising call: ${this.callSid}`);
    await setState(this.callSid, 'LISTENING');

    console.log('[Deepgram] Initialising live transcription...');
    this.initDeepgram();

    console.log('[ElevenLabs] Sending greeting...');
    await this.speak("Hello, I'm here with you. Please take your time and tell me what's happening.");
  }

  // ─── Deepgram Live ASR ────────────────────────────────────────────────────
  private initDeepgram(): void {
    try {
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
        console.log('[Deepgram] ✅ Connection open — live transcription active');
      });

      this.deepgramConn.on(LiveTranscriptionEvents.Transcript, async (data) => {
        const alt = data.channel?.alternatives?.[0];
        const text = alt?.transcript?.trim();
        if (!text) return;

        const isFinal = data.is_final;
        console.log(`[Deepgram] ${isFinal ? '✅ Final' : '… Interim'}: "${text}"`);

        this.resetSilenceTimer();

        if (this.ttsAbortController && !this.ttsAbortController.signal.aborted) {
          console.log('[StreamHandler] 🛑 Barge-in detected — cancelling TTS');
          await this.cancelTts();
        }

        if (isFinal && text.length > 2) {
          await this.onFinalTranscript(text);
        }
      });

      this.deepgramConn.on(LiveTranscriptionEvents.Error, (err) => {
        console.error('[Deepgram] ❌ Error:', err);
      });

      this.deepgramConn.on(LiveTranscriptionEvents.Close, () => {
        console.log('[Deepgram] Connection closed');
      });

    } catch (e) {
      console.error('[Deepgram] ❌ Failed to initialise:', e);
    }
  }

  // ─── Audio Chunk Processing ───────────────────────────────────────────────
  private async onAudioChunk(base64Payload: string): Promise<void> {
    if (!this.deepgramConn) return;
    try {
      const pcm16k = twilioToPcm16k(base64Payload);
      const ab = pcm16k.buffer.slice(pcm16k.byteOffset, pcm16k.byteOffset + pcm16k.byteLength) as ArrayBuffer;
      this.deepgramConn.send(ab);
    } catch (e) {
      console.error('[Audio] ❌ Pipeline error:', e);
    }
  }

  // ─── Final Transcript → LLM → TTS ────────────────────────────────────────
  private async onFinalTranscript(text: string): Promise<void> {
    console.log(`[LLM] Processing: "${text}"`);
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

      console.log(`[LLM] Calling Groq with ${messages.length} messages...`);
      const stream = await getGroq().chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        stream: true,
        max_tokens: 80,
      });

      let fullText = '';
      for await (const chunk of stream) {
        fullText += chunk.choices[0]?.delta?.content ?? '';
      }
      console.log(`[LLM] ✅ Groq response: "${fullText}"`);

      const safe = await validateCrisisResponse(fullText);
      console.log(`[Safety] ✅ Validated: "${safe}"`);

      await appendHistory(this.callSid, { role: 'agent', text: safe });
      await this.speak(safe);

    } catch (e) {
      console.error('[LLM] ❌ Error processing transcript:', e);
      await setState(this.callSid, 'LISTENING');
    }
  }

  // ─── TTS via ElevenLabs → Twilio ─────────────────────────────────────────
  private async speak(text: string): Promise<void> {
    console.log(`[TTS] Synthesising: "${text.slice(0, 60)}..."`);
    await setState(this.callSid, 'SPEAKING');
    this.ttsAbortController = new AbortController();
    const signal = this.ttsAbortController.signal;

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream?output_format=ulaw_8000`;
    console.log(`[TTS] Calling ElevenLabs: voiceId=${ELEVENLABS_VOICE_ID} model=eleven_flash_v2_5`);

    try {
      const response = await fetch(url, {
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
      });

      console.log(`[TTS] ElevenLabs response status: ${response.status}`);

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`[TTS] ❌ ElevenLabs error ${response.status}: ${errBody}`);
        await setState(this.callSid, 'LISTENING');
        return;
      }

      if (!response.body) {
        console.error('[TTS] ❌ ElevenLabs returned no body');
        await setState(this.callSid, 'LISTENING');
        return;
      }

      console.log('[TTS] ✅ Streaming audio to Twilio...');
      let chunkCount = 0;
      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done || signal.aborted) break;
        chunkCount++;
        this.sendAudioToTwilio(Buffer.from(value));
      }

      console.log(`[TTS] ✅ Finished streaming. Sent ${chunkCount} audio chunks.`);

    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        console.error('[TTS] ❌ ElevenLabs stream error:', e.message);
      }
    } finally {
      if (!signal.aborted) {
        await setState(this.callSid, 'LISTENING').catch(() => {});
      }
    }
  }

  // ─── Barge-In ─────────────────────────────────────────────────────────────
  private async cancelTts(): Promise<void> {
    this.ttsAbortController?.abort();
    this.ttsAbortController = null;
    if (this.twilioWs.readyState === WebSocket.OPEN) {
      this.twilioWs.send(JSON.stringify({ event: 'clear', streamSid: this.streamSid }));
      console.log('[Twilio] Sent clear — buffer flushed');
    }
    await setState(this.callSid, 'LISTENING');
  }

  // ─── Send Audio to Twilio ─────────────────────────────────────────────────
  private sendAudioToTwilio(audioChunk: Buffer): void {
    if (this.twilioWs.readyState !== WebSocket.OPEN) {
      console.warn('[Twilio] WebSocket not open — dropping audio chunk');
      return;
    }
    this.twilioWs.send(JSON.stringify({
      event: 'media',
      streamSid: this.streamSid,
      media: { payload: audioChunk.toString('base64') },
    }));
  }

  // ─── Silence Timer ────────────────────────────────────────────────────────
  private resetSilenceTimer(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(async () => {
      console.log('[StreamHandler] 15s silence detected — sending prompt');
      await this.speak("I'm still here. Take your time.").catch(e =>
        console.error('[StreamHandler] Error speaking silence prompt:', e)
      );
    }, 15_000);
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  private async onClose(): Promise<void> {
    console.log(`[StreamHandler] 🧹 Cleaning up call: ${this.callSid}`);
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.ttsAbortController?.abort();
    try { this.deepgramConn?.finish(); } catch {}
    if (this.callSid) await cleanupCall(this.callSid).catch(() => {});
    console.log('[StreamHandler] ✅ Cleanup complete');
  }
}
