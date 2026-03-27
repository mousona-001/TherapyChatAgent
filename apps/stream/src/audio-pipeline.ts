import { mulaw } from 'alawmulaw';

/**
 * Decode Twilio's base64-encoded mulaw audio to PCM16 at 8kHz.
 */
export function decodeBase64Mulaw(base64: string): Buffer {
  const mulawBytes = Buffer.from(base64, 'base64');
  const pcm16 = mulaw.decode(mulawBytes);
  return Buffer.from(pcm16.buffer);
}

/**
 * Naively upsample 8kHz PCM16 to 16kHz by duplicating each sample.
 * This is sufficient for speech intelligibility with Deepgram nova-3.
 * Each sample is 2 bytes (Int16).
 */
export function resample8to16(pcm8k: Buffer): Buffer {
  const sampleCount = pcm8k.length / 2;
  const out = Buffer.alloc(sampleCount * 4); // 2x samples, 2 bytes each
  for (let i = 0; i < sampleCount; i++) {
    const sample = pcm8k.readInt16LE(i * 2);
    out.writeInt16LE(sample, i * 4);
    out.writeInt16LE(sample, i * 4 + 2);
  }
  return out;
}

/**
 * Full pipeline: base64 mulaw (8kHz) → PCM16 (16kHz) for Deepgram.
 */
export function twilioToPcm16k(base64Payload: string): Buffer {
  const pcm8k = decodeBase64Mulaw(base64Payload);
  return resample8to16(pcm8k);
}
