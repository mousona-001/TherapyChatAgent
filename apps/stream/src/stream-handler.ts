import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import Groq from "groq-sdk";
import WebSocket from "ws";
import { appendHistory, cleanupCall, getHistory } from "./redis-session";
import { validateCrisisResponse } from "./response-validator";

function ts(): string {
	return new Date().toISOString();
}

function log(message: string): void {
	console.log(`[${ts()}] ${message}`);
}

function error(message: string, ...args: unknown[]): void {
	console.error(`[${ts()}] ${message}`, ...args);
}

// ─── Config ───────────────────────────────────────────────────────────────────
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY ?? "";
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "";
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY ?? "";

if (!ELEVENLABS_API_KEY)
	error("[Config] ⚠️  ELEVENLABS_API_KEY missing!");
if (!ELEVENLABS_VOICE_ID)
	error("[Config] ⚠️  ELEVENLABS_VOICE_ID missing!");
if (!GROQ_API_KEY) error("[Config] ⚠️  GROQ_API_KEY missing!");
if (!DEEPGRAM_API_KEY) error("[Config] ⚠️  DEEPGRAM_API_KEY missing!");

// ─── System Prompt ────────────────────────────────────────────────────────────
const CRISIS_SYSTEM_PROMPT = `You are a live crisis counsellor on a phone call. Sound like a calm, caring human being, not a bot, not a scripted assistant, and not a therapist giving a lecture.

How to speak:
- Use natural spoken English with contractions.
- Keep responses very brief: exactly 1 short spoken sentence in most cases.
- Start by reflecting the caller's feeling or situation in plain language, but do not just repeat their words back.
- If helpful, include one simple follow-up question in that same sentence.
- Use gentle spoken acknowledgments sometimes, like "yeah", "mm", "I hear you", or "right", but vary them naturally.
- Be specific to what they just said. Avoid generic filler like "How can I help you?" or "What do you need from me right now?" unless it truly fits.
- Sound like a grounded human on a real call. Avoid therapist clichés like "that takes courage" or "I'm here to listen" unless they truly fit the exact moment.
- Use simple everyday wording, not polished or poetic language.
- If they describe grief, fear, loneliness, or shame, name that experience directly and respond with warmth.
- If they ask what you are or how you work, answer briefly in plain language and then come back to them.
- If what they said is ambiguous, garbled, or could mean more than one thing, briefly say what you did hear and ask them to say it again more clearly instead of pretending you understood.
- If they say something like "I feel like quitting," clarify what they mean before assuming.

Safety rules:
- Never diagnose, prescribe, or give medical advice.
- Never recommend alcohol or drugs for coping.
- If they clearly say they are about to harm themselves or someone else right now, tell them to call 988 or 911 immediately and offer to stay with them on the line.
- If they say they are safe and want to end the call, close warmly, acknowledge their courage, and remind them 988 is available 24/7.`;

let _groq: Groq | null = null;
const getGroq = () => (_groq ??= new Groq({ apiKey: GROQ_API_KEY }));

const deepgram = createClient(DEEPGRAM_API_KEY, {
	global: {
		websocket: {
			client: WebSocket as unknown as typeof globalThis.WebSocket,
		},
	},
});

// ─── StreamHandler ────────────────────────────────────────────────────────────
export class StreamHandler {
	private callSid = "";
	private streamSid = "";
	private twilioWs: WebSocket;
	private deepgramConn: ReturnType<typeof deepgram.listen.live> | null = null;

	// In-memory state — avoids async Redis round-trips in the hot audio path
	private isSpeaking = false;
	private ttsAbortController: AbortController | null = null;
	private silenceTimer: ReturnType<typeof setTimeout> | null = null;

	// TTS speak queue — ensures sentences play sequentially, never overlapping
	private speakQueue: Promise<void> = Promise.resolve();
	// Incremented on barge-in so any queued-but-not-yet-started speak() calls are skipped
	private speakGeneration = 0;

	// Processing lock — while an LLM call is in-flight or its speech is queued,
	// ignore new transcripts to prevent responses from stacking on top of each other.
	// Released immediately on barge-in so the user can always get a word in.
	private isProcessing = false;

	// Barge-in context — when the user interrupts, store what the AI was saying
	// so the next LLM call can decide whether to reference it.
	private currentlySpeakingText: string | null = null;
	private interruptedText: string | null = null;

	// Audio buffering — batch ElevenLabs bytes to 320-byte (40ms) chunks before sending to Twilio
	private audioBuffer: Buffer = Buffer.alloc(0);
	private readonly AUDIO_CHUNK_SIZE = 320;

	// Deepgram keep-alive — sends a heartbeat every 8s while the connection is open
	// to prevent Deepgram from closing it during long TTS playback with no audio input.
	private deepgramKeepAlive: ReturnType<typeof setInterval> | null = null;
	// Retry state — cap reconnects so a bad API key doesn't spin forever
	private deepgramRetries = 0;
	private readonly DEEPGRAM_MAX_RETRIES = 3;
	private pendingTranscript: string | null = null;
	private lastFinalTranscript = "";
	private lastFinalTranscriptAt = 0;
	private deepgramReady = false;
	private currentTtsStartedAt = 0;
	private currentUtteranceFinals: string[] = [];
	private currentUtteranceConfidences: number[] = [];
	private utteranceFlushTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(ws: WebSocket) {
		this.twilioWs = ws;
		log("[StreamHandler] Handler created — waiting for Twilio start");

		ws.on("message", (data) => {
			this.onTwilioMessage(data.toString()).catch((e) =>
				error("[StreamHandler] Unhandled error in onTwilioMessage:", e),
			);
		});

		ws.on("close", (code, reason) => {
			log(
				`[StreamHandler] WebSocket closed: code=${code} reason=${reason.toString()}`,
			);
			this.onClose().catch((e) =>
				error("[StreamHandler] Cleanup error:", e),
			);
		});

		ws.on("error", (err) => error("[StreamHandler] WebSocket error:", err));
	}

	// ─── Twilio Message Router ────────────────────────────────────────────────
	private async onTwilioMessage(raw: string): Promise<void> {
		let msg: Record<string, unknown>;
		try {
			msg = JSON.parse(raw);
		} catch {
			return;
		}

		const event = msg["event"] as string;
		if (event !== "media") log(`[Twilio] Event: ${event}`);

		switch (event) {
			case "connected":
				log("[Twilio] ✅ Connected");
				break;

			case "start": {
				const start = msg["start"] as Record<string, unknown>;
				this.callSid = start["callSid"] as string;
				this.streamSid = start["streamSid"] as string;
				log(`[Twilio] ✅ Stream started. callSid=${this.callSid}`);
				await this.initCall();
				break;
			}

			case "media": {
				const media = msg["media"] as Record<string, unknown>;
				this.onAudioChunk(media["payload"] as string);
				break;
			}

			case "dtmf":
				log(`[Twilio] DTMF: ${JSON.stringify(msg["dtmf"])}`);
				break;

			case "stop":
				log("[Twilio] Stop event");
				await this.onClose();
				break;
		}
	}

	// ─── Call Initialization ──────────────────────────────────────────────────
	private async initCall(): Promise<void> {
		log(`[StreamHandler] Initialising call: ${this.callSid}`);
		this.initDeepgram();
		await this.speak(
			"Hello, I'm here with you. Please take your time and tell me what's happening.",
		);
	}

	// ─── Deepgram Live ASR ────────────────────────────────────────────────────
	private initDeepgram(): void {
		try {
			this.deepgramConn = deepgram.listen.live({
				model: "nova-2-phonecall",
				language: "en-US",
				encoding: "linear16",
				sample_rate: 16000,
				interim_results: true,
				endpointing: 350,
				utterance_end_ms: 1000,
				no_delay: true,
				smart_format: true,
			});
			this.deepgramConn.setupConnection();

			const rawConn = this.deepgramConn.conn as
				| (WebSocket & {
						on?: (event: string, listener: (...args: unknown[]) => void) => void;
				  })
				| null;
			rawConn?.on?.("error", (err: unknown) => {
				const msg =
					(err as { message?: string } | undefined)?.message ??
					JSON.stringify(err);
				error(`[Deepgram/ws] ❌ Transport error: ${msg}`);
			});
			rawConn?.on?.("unexpected-response", (_req: unknown, res: unknown) => {
				const statusCode =
					(res as { statusCode?: number } | undefined)?.statusCode ?? "unknown";
				const statusMessage =
					(res as { statusMessage?: string } | undefined)?.statusMessage ?? "";
				error(
					`[Deepgram/ws] ❌ Handshake rejected: HTTP ${statusCode} ${statusMessage}`.trim(),
				);
			});

			this.deepgramConn.on(LiveTranscriptionEvents.Open, () => {
				this.deepgramReady = true;
				log("[Deepgram] ✅ Live transcription active");
				this.deepgramRetries = 0; // reset counter on successful open
				// Start heartbeat to keep the connection alive during TTS playback
				if (this.deepgramKeepAlive) clearInterval(this.deepgramKeepAlive);
				this.deepgramKeepAlive = setInterval(() => {
					try {
						this.deepgramConn?.keepAlive();
					} catch {}
				}, 8_000);
			});

			this.deepgramConn.on(LiveTranscriptionEvents.Transcript, async (data) => {
				const alt = data.channel?.alternatives?.[0];
				const text = alt?.transcript?.trim();
				if (!text) return;
				const confidence = alt?.confidence ?? 0;

				const isFinal = data.is_final;
				const isSpeechFinal = Boolean(
					(data as { speech_final?: boolean }).speech_final,
				);
				log(
					`[Deepgram] ${isFinal ? "✅ Final" : "… Interim"}: "${text}" (confidence=${confidence.toFixed(2)})`,
				);

				this.resetSilenceTimer();

				// Deepgram speech is a stronger signal than local VAD for barge-in.
				if (this.isSpeaking && text.length >= 3 && this.shouldInterruptForText(text)) {
					log(
						`[Barge-in] 🛑 Transcript speech detected — interrupting TTS: "${text}"`,
					);
					this.cancelTts();
				}

				if (isFinal) {
					this.appendUtteranceFinal(text, confidence);
					if (isSpeechFinal) {
						this.flushUtteranceFinals("speech_final");
					} else {
						this.scheduleUtteranceFlush();
					}
				}
			});

			this.deepgramConn.on(LiveTranscriptionEvents.UtteranceEnd, () => {
				log("[Deepgram] Utterance end");
				this.flushUtteranceFinals("utterance_end");
			});

			this.deepgramConn.on(LiveTranscriptionEvents.Error, (err) => {
				// Extract as much info as possible — ErrorEvent is often opaque
				const msg =
					(err as unknown as { message?: string })?.message ??
					(err as unknown as { error?: { message?: string } })?.error
						?.message ??
					JSON.stringify(err);
				error(`[Deepgram] ❌ Error: ${msg}`);
			});

			this.deepgramConn.on(LiveTranscriptionEvents.Close, (event) => {
					const code =
						(event as { code?: number } | undefined)?.code ?? 1005;
					const reasonValue =
						(event as { reason?: string | Buffer } | undefined)?.reason ?? "";
					const reasonStr = Buffer.isBuffer(reasonValue)
						? reasonValue.toString()
						: reasonValue;
					log(
						`[Deepgram] Connection closed — code=${code} reason=${reasonStr || "(none)"}`,
					);
					this.deepgramReady = false;
					if (this.utteranceFlushTimer) {
						clearTimeout(this.utteranceFlushTimer);
						this.utteranceFlushTimer = null;
					}
					if (this.deepgramKeepAlive) {
						clearInterval(this.deepgramKeepAlive);
						this.deepgramKeepAlive = null;
					}
					// Reconnect unless the call is over or we've hit the retry cap
					if (this.callSid && this.twilioWs.readyState === WebSocket.OPEN) {
						if (this.deepgramRetries >= this.DEEPGRAM_MAX_RETRIES) {
							error(
								`[Deepgram] ❌ Giving up after ${this.DEEPGRAM_MAX_RETRIES} reconnect attempts. Check DEEPGRAM_API_KEY.`,
							);
							return;
						}
						this.deepgramRetries++;
						const delay = this.deepgramRetries * 1_000;
						log(
							`[Deepgram] Reconnecting in ${delay}ms (attempt ${this.deepgramRetries}/${this.DEEPGRAM_MAX_RETRIES})...`,
						);
						setTimeout(() => this.initDeepgram(), delay);
					}
				});
		} catch (e) {
			error("[Deepgram] ❌ Failed to initialise:", e);
		}
	}

	// ─── Audio Chunk: VAD + forward to Deepgram ───────────────────────────────
	// NOTE: kept synchronous to avoid async overhead on every 20ms chunk
	private onAudioChunk(base64Payload: string): void {
		if (!this.deepgramConn) return;
		try {
			const pcm8k = Buffer.from(base64Payload, "base64");
			// Fast in-place mulaw→PCM16 decode (no full pipeline needed for VAD)
			// We import mulaw decode from alawmulaw
			const { mulaw } = require("alawmulaw") as typeof import("alawmulaw");
			const pcm16 = Buffer.from(mulaw.decode(pcm8k).buffer);

			// ── Feed Deepgram ──────────────────────────────────────────────────────
			// Upsample 8kHz → 16kHz by duplicating each sample
			const pcm16k = this.upsample8to16(pcm16);
			const ab = pcm16k.buffer.slice(
				pcm16k.byteOffset,
				pcm16k.byteOffset + pcm16k.byteLength,
			) as ArrayBuffer;
			this.deepgramConn.send(ab);
		} catch (e) {
			error("[Audio] ❌ Pipeline error:", e);
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
	private async onFinalTranscript(
		text: string,
		metadata?: { confidence?: number; source?: string },
	): Promise<void> {
		if (this.isProcessing) {
			this.pendingTranscript = text;
			log(
				`[LLM] Queued while busy: "${text}"`,
			);
			return;
		}
		this.isProcessing = true;
		const turnStartedAt = Date.now();
		const confidence =
			metadata?.confidence !== undefined ? metadata.confidence.toFixed(2) : "n/a";
		log(`[LLM] Processing: "${text}" (confidence=${confidence})`);
		log(`[Latency] Turn started: transcript→processing = 0ms`);
		await appendHistory(this.callSid, { role: "patient", text });

		if (this.shouldClarifyTranscript(text, metadata?.confidence)) {
			const clarification = this.buildClarificationResponse(text);
			log(`[LLM] Clarifying low-confidence transcript: "${clarification}"`);
			await appendHistory(this.callSid, { role: "agent", text: clarification });
			this.enqueueSpeech(clarification, turnStartedAt, "clarification");
			this.speakQueue = this.speakQueue
				.then(() => {
					this.isProcessing = false;
					log(
						`[Latency] Turn completed: +${Date.now() - turnStartedAt}ms`,
					);
					this.drainPendingTranscript();
				})
				.catch(() => {
					this.isProcessing = false;
					this.drainPendingTranscript();
				});
			return;
		}

		const history = await getHistory(this.callSid);
		const messages: {
			role: "system" | "user" | "assistant";
			content: string;
		}[] = [
			{ role: "system", content: CRISIS_SYSTEM_PROMPT },
			...history.map((t) => ({
				role: t.role === "patient" ? ("user" as const) : ("assistant" as const),
				content: t.text,
			})),
		];

		// If the caller interrupted while AI was mid-sentence, tell the LLM what was
		// being said so it can decide whether to incorporate it or pivot entirely.
		if (this.interruptedText) {
			messages.push({
				role: "system",
				content: `Note: you were mid-sentence saying "${this.interruptedText}" when the caller interrupted. If what they just said is related, briefly acknowledge the thread and address their new message. If it's a new topic, pivot fully and don't mention what you were saying.`,
			});
			this.interruptedText = null;
		}

		log("[LLM] Calling Groq (streaming)...");

		// ── Sentence-level streaming: start TTS as soon as first sentence arrives ──
		const stream = await getGroq().chat.completions.create({
			model: "llama-3.3-70b-versatile",
			messages,
			stream: true,
			max_tokens: 36,
			temperature: 0.35,
		});
		log(
			`[Latency] Groq stream opened: +${Date.now() - turnStartedAt}ms`,
		);

		let buffer = "";
		let spokenResponseSent = false;

		for await (const chunk of stream) {
			const token = chunk.choices[0]?.delta?.content ?? "";
			buffer += token;

			// Voice calls feel much faster when we speak one short sentence only.
			// As soon as we have a complete sentence, speak it and stop waiting for more.
			const sentenceEnd = buffer.search(/[.!?]\s/);
			if (!spokenResponseSent && sentenceEnd !== -1) {
				const firstSentence = buffer.slice(0, sentenceEnd + 1).trim();
				spokenResponseSent = true;

				const safeSentence = await validateCrisisResponse(firstSentence);
				log(
					`[Latency] First sentence ready: +${Date.now() - turnStartedAt}ms`,
				);
				log(`[LLM] First sentence: "${safeSentence}"`);
				await appendHistory(this.callSid, {
					role: "agent",
					text: safeSentence,
				});

				// Enqueue one short spoken response only — avoids a second TTS round trip.
				this.enqueueSpeech(safeSentence, turnStartedAt, "first sentence");
				break;
			}
		}

		// If the model never closed the sentence while streaming, speak the trimmed buffer once.
		if (!spokenResponseSent) {
			const fallback = buffer.trim();
			if (fallback.length > 2) {
				const safeFallback = await validateCrisisResponse(fallback);
				log(
					`[Latency] Fallback response ready: +${Date.now() - turnStartedAt}ms`,
				);
				log(`[LLM] Fallback: "${safeFallback}"`);
				await appendHistory(this.callSid, { role: "agent", text: safeFallback });
				this.enqueueSpeech(safeFallback, turnStartedAt, "fallback");
			}
		}

		// Release the processing lock once all enqueued speech for this turn finishes.
		// This lets the next user transcript start a fresh turn.
		this.speakQueue = this.speakQueue
			.then(() => {
				this.isProcessing = false;
				log(
					`[Latency] Turn completed: +${Date.now() - turnStartedAt}ms`,
				);
				this.drainPendingTranscript();
			})
			.catch(() => {
				this.isProcessing = false;
				this.drainPendingTranscript();
			});
	}

	// ─── TTS via ElevenLabs → Twilio ─────────────────────────────────────────
	private async speak(
		text: string,
		turnStartedAt?: number,
		label?: string,
	): Promise<void> {
		log(`[TTS] → "${text.slice(0, 60)}"`);
		this.isSpeaking = true;
		this.currentTtsStartedAt = Date.now();
		this.currentlySpeakingText = text;
		this.ttsAbortController = new AbortController();
		const signal = this.ttsAbortController.signal;
		const ttsStartedAt = Date.now();
		if (turnStartedAt) {
			log(
				`[Latency] ${label ?? "speech"} TTS request: +${ttsStartedAt - turnStartedAt}ms`,
			);
		}

		try {
			const response = await fetch(
				`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream?output_format=ulaw_8000&optimize_streaming_latency=4`,
				{
					method: "POST",
					headers: {
						"xi-api-key": ELEVENLABS_API_KEY,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						text,
						model_id: "eleven_flash_v2_5",
						voice_settings: {
							stability: 0.32,
							similarity_boost: 0.72,
							style: 0.05,
							use_speaker_boost: true,
							speed: 1.02,
						},
					}),
					signal,
				},
			);

			log(`[TTS] ElevenLabs status: ${response.status}`);

			if (!response.ok) {
				const err = await response.text();
				error(`[TTS] ❌ ElevenLabs error ${response.status}: ${err}`);
				return;
			}

			if (!response.body) {
				error("[TTS] ❌ No body");
				return;
			}

			let chunks = 0;
			let firstAudioLogged = false;
			const reader = response.body.getReader();
			while (true) {
				// Check abort BEFORE the read so we stop immediately when barge-in fires,
				// even if Node's HTTP buffer still has data ready to return synchronously.
				if (signal.aborted) {
					reader.cancel().catch(() => {});
					break;
				}
				const { done, value } = await reader.read();
				if (done || signal.aborted) {
					reader.cancel().catch(() => {});
					break;
				}
				if (!firstAudioLogged) {
					firstAudioLogged = true;
					const now = Date.now();
					log(
						`[Latency] ${label ?? "speech"} first audio chunk: +${
							turnStartedAt ? now - turnStartedAt : now - ttsStartedAt
						}ms`,
					);
				}
				this.sendAudioToTwilio(Buffer.from(value));
				chunks++;
			}
			if (!signal.aborted) this.flushAudioBuffer();
			log(
				`[TTS] ✅ Sent ${chunks} audio chunks in ${Date.now() - ttsStartedAt}ms`,
			);
		} catch (e: unknown) {
			if (e instanceof Error && e.name !== "AbortError") {
				error("[TTS] ❌ Error:", e.message);
			}
		} finally {
			if (!signal.aborted) {
				this.isSpeaking = false;
				this.currentlySpeakingText = null;
			}
		}
	}

	// ─── Enqueue Speech: serialise TTS calls so sentences never play simultaneously ──
	private enqueueSpeech(
		text: string,
		turnStartedAt?: number,
		label?: string,
	): void {
		const gen = this.speakGeneration;
		this.speakQueue = this.speakQueue
			.then(() => {
				if (this.speakGeneration !== gen) return; // cancelled by barge-in
				return this.speak(text, turnStartedAt, label);
			})
			.catch(() => {});
	}

	// ─── Barge-In: Cancel TTS immediately ────────────────────────────────────
	private cancelTts(): void {
		this.speakGeneration++; // invalidates any enqueued-but-not-yet-started speak() calls
		// Save what was being said so the next LLM turn has context
		if (this.isSpeaking && this.currentlySpeakingText) {
			this.interruptedText = this.currentlySpeakingText;
		}
		this.currentlySpeakingText = null;
		this.ttsAbortController?.abort();
		this.ttsAbortController = null;
		this.isSpeaking = false;
		this.currentTtsStartedAt = 0;
		this.isProcessing = false; // release lock so user can start a new turn immediately
		this.audioBuffer = Buffer.alloc(0);
		if (this.twilioWs.readyState === WebSocket.OPEN) {
			// Flush Twilio's audio buffer immediately
			this.twilioWs.send(
				JSON.stringify({ event: "clear", streamSid: this.streamSid }),
			);
		}
		log("[Barge-in] ✅ TTS cancelled and Twilio buffer cleared");
	}

	private shouldIgnoreDuplicateFinal(text: string): boolean {
		const normalized = text.trim().toLowerCase();
		const now = Date.now();
		if (
			normalized === this.lastFinalTranscript &&
			now - this.lastFinalTranscriptAt < 2_000
		) {
			log(`[Deepgram] Duplicate final ignored: "${text}"`);
			return true;
		}
		this.lastFinalTranscript = normalized;
		this.lastFinalTranscriptAt = now;
		return false;
	}

	private shouldProcessFinalTranscript(text: string): boolean {
		const normalized = text.trim().toLowerCase();
		const wordCount = normalized.split(/\s+/).filter(Boolean).length;
		const meaningfulShortReply =
			/^(yeah|yes|yep|no|nope|right|exactly|okay|ok|true|correct|maybe|sure|i am|i'm okay|not really|yeah actually|yes actually|no actually|well yes|well no|right actually|okay actually)[.!? ]*$/.test(
				normalized,
			);
		const incompleteTail =
			/\b(and|or|but|so|because|then|if|when|like|to|of|for|with|about|currently)\.?$/.test(
				normalized,
			);
		const weakFragment =
			wordCount <= 2 &&
			!meaningfulShortReply &&
			!/^(hello|hello\?|hi|hi\?|hey|hey\?|help|help me|are you there|you there)$/.test(
				normalized,
			);
		if (incompleteTail || weakFragment) {
			log(`[Deepgram] Incomplete final ignored: "${text}"`);
			return false;
		}
		return true;
	}

	private shouldInterruptForText(text: string): boolean {
		const normalized = text.trim().toLowerCase();
		const ttsAgeMs = Date.now() - this.currentTtsStartedAt;
		if (ttsAgeMs < 350) return false;
		if (normalized.length < 3) return false;
		return /[a-z]/i.test(normalized);
	}

	private appendUtteranceFinal(text: string, confidence: number): void {
		const normalized = text.trim();
		if (!normalized) return;
		const previous = this.currentUtteranceFinals.at(-1);
		if (previous?.toLowerCase() === normalized.toLowerCase()) return;
		this.currentUtteranceFinals.push(normalized);
		this.currentUtteranceConfidences.push(confidence);
	}

	private scheduleUtteranceFlush(): void {
		if (this.utteranceFlushTimer) clearTimeout(this.utteranceFlushTimer);
		this.utteranceFlushTimer = setTimeout(() => {
			this.flushUtteranceFinals("timer");
		}, 900);
	}

	private flushUtteranceFinals(reason: "speech_final" | "utterance_end" | "timer"): void {
		if (this.utteranceFlushTimer) {
			clearTimeout(this.utteranceFlushTimer);
			this.utteranceFlushTimer = null;
		}
		const combined = this.currentUtteranceFinals.join(" ").trim();
		if (!combined) return;
		if (!this.shouldProcessFinalTranscript(combined)) {
			if (this.shouldDiscardIncompleteUtterance(combined, reason)) {
				log(`[Deepgram] Discarding incomplete utterance (${reason}): "${combined}"`);
				this.currentUtteranceFinals = [];
				this.currentUtteranceConfidences = [];
				return;
			}
			log(`[Deepgram] Holding incomplete utterance (${reason}): "${combined}"`);
			return;
		}
		const confidenceValues = [...this.currentUtteranceConfidences];
		this.currentUtteranceFinals = [];
		this.currentUtteranceConfidences = [];
		if (this.shouldIgnoreDuplicateFinal(combined)) return;
		const avgConfidence =
			confidenceValues.length > 0
				? confidenceValues.reduce((sum, value) => sum + value, 0) /
					confidenceValues.length
				: 0;
		log(
			`[Deepgram] Flushed utterance (${reason}): "${combined}" (avg_confidence=${avgConfidence.toFixed(2)})`,
		);
		this.onFinalTranscript(combined, {
			confidence: avgConfidence,
			source: reason,
		}).catch((e) =>
			error("[STT→LLM] Error:", e),
		);
	}

	private shouldDiscardIncompleteUtterance(
		text: string,
		reason: "speech_final" | "utterance_end" | "timer",
	): boolean {
		const normalized = text.trim().toLowerCase();
		const fillerOnly =
			/^(uh|um|hmm|mm)[.!? ]*$/.test(
				normalized,
			);
		if (fillerOnly) return true;
		if (
			reason === "utterance_end" &&
			/^(hello|hello\?|hi|hey)[.!? ]*$/.test(normalized)
		) {
			return true;
		}
		return false;
	}

	private async waitForDeepgramOpen(timeoutMs: number): Promise<void> {
		const startedAt = Date.now();
		while (!this.deepgramReady && Date.now() - startedAt < timeoutMs) {
			await new Promise((resolve) => setTimeout(resolve, 25));
		}
		log(
			this.deepgramReady
				? `[Deepgram] Ready after ${Date.now() - startedAt}ms`
				: `[Deepgram] Not ready after ${timeoutMs}ms, continuing anyway`,
		);
	}

	private drainPendingTranscript(): void {
		if (!this.pendingTranscript) return;
		const pending = this.pendingTranscript;
		this.pendingTranscript = null;
		log(`[LLM] Draining queued transcript: "${pending}"`);
		this.onFinalTranscript(pending).catch((e) =>
			error("[STT→LLM] Queued transcript error:", e),
		);
	}

	// ─── Send Audio to Twilio ─────────────────────────────────────────────────
	// Accumulates bytes and emits in 320-byte (40ms mulaw) chunks to avoid Twilio glitches.
	// Call flushAudioBuffer() after the stream ends to send any trailing bytes.
	private sendAudioToTwilio(audioChunk: Buffer): void {
		if (this.twilioWs.readyState !== WebSocket.OPEN) return;
		this.audioBuffer = Buffer.concat([this.audioBuffer, audioChunk]);
		while (this.audioBuffer.length >= this.AUDIO_CHUNK_SIZE) {
			const chunk = this.audioBuffer.subarray(0, this.AUDIO_CHUNK_SIZE);
			this.audioBuffer = this.audioBuffer.subarray(this.AUDIO_CHUNK_SIZE);
			this.twilioWs.send(
				JSON.stringify({
					event: "media",
					streamSid: this.streamSid,
					media: { payload: chunk.toString("base64") },
				}),
			);
		}
	}

	private flushAudioBuffer(): void {
		if (
			this.audioBuffer.length === 0 ||
			this.twilioWs.readyState !== WebSocket.OPEN
		)
			return;
		this.twilioWs.send(
			JSON.stringify({
				event: "media",
				streamSid: this.streamSid,
				media: { payload: this.audioBuffer.toString("base64") },
			}),
		);
		this.audioBuffer = Buffer.alloc(0);
	}

	// ─── Silence Timer ────────────────────────────────────────────────────────
	private resetSilenceTimer(): void {
		if (this.silenceTimer) clearTimeout(this.silenceTimer);
		this.silenceTimer = setTimeout(async () => {
			if (!this.isSpeaking) {
				log("[StreamHandler] 15s silence — prompting");
				await this.speak("I'm still here. Take your time.").catch(() => {});
			}
		}, 15_000);
	}

	// ─── Cleanup ──────────────────────────────────────────────────────────────
	private async onClose(): Promise<void> {
		log(`[StreamHandler] 🧹 Cleaning up: ${this.callSid}`);
		if (this.silenceTimer) clearTimeout(this.silenceTimer);
		if (this.utteranceFlushTimer) clearTimeout(this.utteranceFlushTimer);
		if (this.deepgramKeepAlive) {
			clearInterval(this.deepgramKeepAlive);
			this.deepgramKeepAlive = null;
		}
		this.currentUtteranceFinals = [];
		this.currentUtteranceConfidences = [];
		this.cancelTts();
		// Clear callSid BEFORE finishing Deepgram so the Close handler doesn't
		// attempt a reconnect after the call has ended.
		const sid = this.callSid;
		this.callSid = "";
		try {
			this.deepgramConn?.finish();
		} catch {}
		if (sid) await cleanupCall(sid).catch(() => {});
		log("[StreamHandler] ✅ Done");
	}

	private shouldClarifyTranscript(text: string, confidence?: number): boolean {
		const normalized = text.trim().toLowerCase();
		if (confidence !== undefined && confidence < 0.72) return true;
		if (/\bi feel like quitting\b/.test(normalized)) return true;
		if (
			confidence !== undefined &&
			confidence < 0.82 &&
			/\b(internet|rust|role)\b/.test(normalized)
		) {
			return true;
		}
		return false;
	}

	private buildClarificationResponse(text: string): string {
		const normalized = text.trim().toLowerCase();
		if (/\bi feel like quitting\b/.test(normalized)) {
			return "When you say quitting, do you mean life feels unbearable right now, or do you mean something else?";
		}
		return "I want to make sure I heard you right, can you say that again a little more clearly?";
	}
}
