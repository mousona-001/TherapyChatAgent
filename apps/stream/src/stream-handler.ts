import WebSocket from 'ws';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import Groq from 'groq-sdk';
import { twilioToPcm16k } from './audio-pipeline';
import { appendHistory, getHistory, cleanupCall } from './redis-session';
import { validateCrisisResponse } from './response-validator';

// ─── Config ───────────────────────────────────────────────────────────────────
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY ?? '';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? '';
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY ?? '';

if (!ELEVENLABS_API_KEY) console.error('[Config] ⚠️  ELEVENLABS_API_KEY missing!');
if (!ELEVENLABS_VOICE_ID) console.error('[Config] ⚠️  ELEVENLABS_VOICE_ID missing!');
if (!GROQ_API_KEY) console.error('[Config] ⚠️  GROQ_API_KEY missing!');
if (!DEEPGRAM_API_KEY) console.error('[Config] ⚠️  DEEPGRAM_API_KEY missing!');

// ─── VAD Threshold ────────────────────────────────────────────────────────────
// PCM16 RMS value above which we consider the user to be speaking.
// Silence ≈ 200, background noise ≈ 400–800, speech ≈ 1500+
const VAD_SILENCE_THRESHOLD = 1200;
// How many consecutive loud chunks before we trigger barge-in (avoids false positives)
const VAD_FRAMES_TO_TRIGGER = 2;

// ─── System Prompt ────────────────────────────────────────────────────────────
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

  // In-memory state — avoids async Redis round-trips in the hot audio path
  private isSpeaking = false;
  private ttsAbortController: AbortController | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;

  // VAD: track consecutive loud frames to avoid false barge-in on noise bursts
  private vadLoudFrames = 0;

  constructor(ws: WebSocket) {
    this.twilioWs = ws;
    console.log('[StreamHandler] Handler created — waiting for Twilio start');

    ws.on('message', (data) => {
      this.onTwilioMessage(data.toString()).catch(e =>
        console.error('[StreamHandler] Unhandled error in onTwilioMessage:', e)
      );
    });

    ws.on('close', (code, reason) => {
      console.log(`[StreamHandler] WebSocket closed: code=${code} reason=${reason.toString()}`);
      this.onClose().catch(e => console.error('[StreamHandler] Cleanup error:', e));
    });

    ws.on('error', (err) => console.error('[StreamHandler] WebSocket error:', err));
  }

  // ─── Twilio Message Router ────────────────────────────────────────────────
  private async onTwilioMessage(raw: string): Promise<void> {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(raw); } catch { return; }

    const event = msg['event'] as string;
    if (event !== 'media') console.log(`[Twilio] Event: ${event}`);

    switch (event) {
      case 'connected':
        console.log('[Twilio] ✅ Connected');
        break;

      case 'start': {
        const start = msg['start'] as Record<string, unknown>;
        this.callSid = start['callSid'] as string;
        this.streamSid = start['streamSid'] as string;
        console.log(`[Twilio] ✅ Stream started. callSid=${this.callSid}`);
        await this.initCall();
        break;
      }

      case 'media': {
        const media = msg['media'] as Record<string, unknown>;
        this.onAudioChunk(media['payload'] as string);
        break;
      }

      case 'dtmf':
        console.log(`[Twilio] DTMF: ${JSON.stringify(msg['dtmf'])}`);
        break;

      case 'stop':
        console.log('[Twilio] Stop event');
        await this.onClose();
        break;
    }
  }

  // ─── Call Initialization ──────────────────────────────────────────────────
  private async initCall(): Promise<void> {
    console.log(`[StreamHandler] Initialising call: ${this.callSid}`);
    this.initDeepgram();
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
        endpointing: 150,     // down from 300ms — faster sentence detection
        utterance_end_ms: 1000,
        no_delay: true,       // prioritise low latency over accuracy
        smart_format: true,
      });

      this.deepgramConn.on(LiveTranscriptionEvents.Open, () =>
        console.log('[Deepgram] ✅ Live transcription active')
      );

      this.deepgramConn.on(LiveTranscriptionEvents.Transcript, async (data) => {
        const alt = data.channel?.alternatives?.[0];
        const text = alt?.transcript?.trim();
        if (!text) return;

        const isFinal = data.is_final;
        console.log(`[Deepgram] ${isFinal ? '✅ Final' : '… Interim'}: "${text}"`);

        this.resetSilenceTimer();

        if (isFinal && text.length > 2) {
          await this.onFinalTranscript(text).catch(e =>
            console.error('[STT→LLM] Error:', e)
          );
        }
      });

      this.deepgramConn.on(LiveTranscriptionEvents.Error, (err) =>
        console.error('[Deepgram] ❌ Error:', err)
      );

      this.deepgramConn.on(LiveTranscriptionEvents.Close, () =>
        console.log('[Deepgram] Connection closed')
      );

    } catch (e) {
      console.error('[Deepgram] ❌ Failed to initialise:', e);
    }
  }

  // ─── Audio Chunk: VAD + forward to Deepgram ───────────────────────────────
  // NOTE: kept synchronous to avoid async overhead on every 20ms chunk
  private onAudioChunk(base64Payload: string): void {
    if (!this.deepgramConn) return;
    try {
      const pcm8k = Buffer.from(base64Payload, 'base64');
      // Fast in-place mulaw→PCM16 decode (no full pipeline needed for VAD)
      // We import mulaw decode from alawmulaw
      const { mulaw } = require('alawmulaw') as typeof import('alawmulaw');
      const pcm16 = Buffer.from(mulaw.decode(pcm8k).buffer);

      // ── VAD Barge-In ───────────────────────────────────────────────────────
      if (this.isSpeaking) {
        const rms = this.computeRms(pcm16);
        if (rms > VAD_SILENCE_THRESHOLD) {
          this.vadLoudFrames++;
          if (this.vadLoudFrames >= VAD_FRAMES_TO_TRIGGER) {
            console.log(`[VAD] 🛑 Barge-in (RMS=${rms.toFixed(0)}) — interrupting TTS immediately`);
            this.vadLoudFrames = 0;
            this.cancelTts(); // synchronous cancel — no await needed
          }
        } else {
          this.vadLoudFrames = 0;
        }
      }

      // ── Feed Deepgram ──────────────────────────────────────────────────────
      // Upsample 8kHz → 16kHz by duplicating each sample
      const pcm16k = this.upsample8to16(pcm16);
      const ab = pcm16k.buffer.slice(
        pcm16k.byteOffset,
        pcm16k.byteOffset + pcm16k.byteLength
      ) as ArrayBuffer;
      this.deepgramConn.send(ab);

    } catch (e) {
      console.error('[Audio] ❌ Pipeline error:', e);
    }
  }

  // Inline upsample to avoid module boundary overhead on the hot path
  private upsample8to16(pcm8k: Buffer): Buffer {
    const samples = pcm8k.length / 2;
    const out = Buffer.alloc(samples * 4);
    for (let i = 0; i < samples; i++) {
      const s = pcm8k.readInt16LE(i * 2);
      out.writeInt16LE(s, i * 4);
      out.writeInt16LE(s, i * 4 + 2);
    }
    return out;
  }

  // RMS amplitude of PCM16 buffer
  private computeRms(pcm16: Buffer): number {
    const samples = pcm16.length / 2;
    if (samples === 0) return 0;
    let sum = 0;
    for (let i = 0; i < pcm16.length; i += 2) {
      const s = pcm16.readInt16LE(i);
      sum += s * s;
    }
    return Math.sqrt(sum / samples);
  }

  // ─── Final Transcript → LLM → TTS ────────────────────────────────────────
  private async onFinalTranscript(text: string): Promise<void> {
    console.log(`[LLM] Processing: "${text}"`);
    await appendHistory(this.callSid, { role: 'patient', text });

    const history = await getHistory(this.callSid);
    const messages = [
      { role: 'system' as const, content: CRISIS_SYSTEM_PROMPT },
      ...history.map(t => ({
        role: t.role === 'patient' ? 'user' as const : 'assistant' as const,
        content: t.text,
      })),
    ];

    console.log('[LLM] Calling Groq (streaming)...');

    // ── Sentence-level streaming: start TTS as soon as first sentence arrives ──
    const stream = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      stream: true,
      max_tokens: 80,
      temperature: 0.6,
    });

    let buffer = '';
    let firstSentenceSent = false;

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? '';
      buffer += token;

      // As soon as we have a complete first sentence, start TTS immediately
      // without waiting for the full response
      const sentenceEnd = buffer.search(/[.!?]\s/);
      if (!firstSentenceSent && sentenceEnd !== -1) {
        const firstSentence = buffer.slice(0, sentenceEnd + 1).trim();
        buffer = buffer.slice(sentenceEnd + 2);
        firstSentenceSent = true;

        const safeSentence = await validateCrisisResponse(firstSentence);
        console.log(`[LLM] First sentence: "${safeSentence}"`);
        await appendHistory(this.callSid, { role: 'agent', text: safeSentence });

        // Fire TTS for the first sentence without awaiting — let the second sentence collect
        this.speak(safeSentence).catch(e => console.error('[TTS] Sentence 1 error:', e));
      }
    }

    // Speak any remaining text (second sentence)
    const remainder = buffer.trim();
    if (remainder.length > 2) {
      const safeRemainder = await validateCrisisResponse(remainder);
      console.log(`[LLM] Remainder: "${safeRemainder}"`);
      await appendHistory(this.callSid, { role: 'agent', text: safeRemainder });
      await this.speak(safeRemainder);
    }
  }

  // ─── TTS via ElevenLabs → Twilio ─────────────────────────────────────────
  private async speak(text: string): Promise<void> {
    console.log(`[TTS] → "${text.slice(0, 60)}"`);
    this.isSpeaking = true;
    this.ttsAbortController = new AbortController();
    const signal = this.ttsAbortController.signal;

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream?output_format=ulaw_8000&optimize_streaming_latency=4`,
        {
          method: 'POST',
          headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            model_id: 'eleven_flash_v2_5',
            voice_settings: { stability: 0.75, similarity_boost: 0.75, speed: 1.0 },
          }),
          signal,
        }
      );

      console.log(`[TTS] ElevenLabs status: ${response.status}`);

      if (!response.ok) {
        const err = await response.text();
        console.error(`[TTS] ❌ ElevenLabs error ${response.status}: ${err}`);
        return;
      }

      if (!response.body) {
        console.error('[TTS] ❌ No body');
        return;
      }

      let chunks = 0;
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done || signal.aborted) break;
        this.sendAudioToTwilio(Buffer.from(value));
        chunks++;
      }
      console.log(`[TTS] ✅ Sent ${chunks} audio chunks`);

    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        console.error('[TTS] ❌ Error:', e.message);
      }
    } finally {
      if (!signal.aborted) {
        this.isSpeaking = false;
      }
    }
  }

  // ─── Barge-In: Cancel TTS immediately ────────────────────────────────────
  private cancelTts(): void {
    this.ttsAbortController?.abort();
    this.ttsAbortController = null;
    this.isSpeaking = false;
    if (this.twilioWs.readyState === WebSocket.OPEN) {
      // Flush Twilio's audio buffer immediately
      this.twilioWs.send(JSON.stringify({ event: 'clear', streamSid: this.streamSid }));
    }
    console.log('[Barge-in] ✅ TTS cancelled and Twilio buffer cleared');
  }

  // ─── Send Audio to Twilio ─────────────────────────────────────────────────
  private sendAudioToTwilio(audioChunk: Buffer): void {
    if (this.twilioWs.readyState !== WebSocket.OPEN) return;
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
      if (!this.isSpeaking) {
        console.log('[StreamHandler] 15s silence — prompting');
        await this.speak("I'm still here. Take your time.").catch(() => {});
      }
    }, 15_000);
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  private async onClose(): Promise<void> {
    console.log(`[StreamHandler] 🧹 Cleaning up: ${this.callSid}`);
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.cancelTts();
    try { this.deepgramConn?.finish(); } catch {}
    if (this.callSid) await cleanupCall(this.callSid).catch(() => {});
    console.log('[StreamHandler] ✅ Done');
  }
}
