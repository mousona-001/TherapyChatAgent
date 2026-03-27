import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ElevenLabsAdapter {
  private readonly logger = new Logger(ElevenLabsAdapter.name);
  private readonly apiKey = process.env.ELEVENLABS_API_KEY!;
  private readonly voiceId = process.env.ELEVENLABS_VOICE_ID!;

  /**
   * One-shot TTS — generates a full audio buffer (MP3).
   * Used only for the initial notification call (before the stream connects).
   */
  async generateSpeech(text: string): Promise<Buffer> {
    this.logger.log(`Generating ElevenLabs speech for: "${text.slice(0, 60)}..."`);

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.75, similarity_boost: 0.75 },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`ElevenLabs TTS failed: ${response.status} - ${errorText}`);
      throw new Error(`ElevenLabs TTS failed: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
