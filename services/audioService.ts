/**
 * Decodes a base64 string into a Uint8Array.
 */
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM data into an AudioBuffer.
 * Gemini TTS typically returns raw PCM.
 */
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 to Float32 [-1.0, 1.0]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export class AudioPlayer {
  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private isPlaying: boolean = false;

  constructor() {
    // Initialize context lazily to comply with browser autoplay policies
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000 
      });
    }
    return this.ctx;
  }

  async playBase64(base64Data: string): Promise<void> {
    this.stop(); // Stop any current audio

    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    try {
      const bytes = decodeBase64(base64Data);
      const audioBuffer = await decodeAudioData(bytes, ctx);
      
      this.source = ctx.createBufferSource();
      this.source.buffer = audioBuffer;
      this.source.connect(ctx.destination);
      
      this.isPlaying = true;
      this.source.onended = () => {
        this.isPlaying = false;
      };
      this.source.start(0);
    } catch (err) {
      console.error("Audio playback error:", err);
      this.isPlaying = false;
    }
  }

  stop() {
    if (this.source) {
      try {
        this.source.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      this.source.disconnect();
      this.source = null;
    }
    this.isPlaying = false;
  }
}

export const audioPlayer = new AudioPlayer();
