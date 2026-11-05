/**
 * Extracts 16kHz Mono 16-bit PCM WAV audio & waveform directly in the browser using the Web Audio API.
 * This runs client-side in pure JavaScript with zero dependencies and works even when
 * the server deployment container (e.g. Cloud Run) has no FFmpeg installed.
 */

export interface ExtractedAudioResult {
  blob: Blob;
  waveform: number[];
  durationSec: number;
}

export async function extractAudioFromMediaFile(
  file: File,
  maxDurationSec = 600 // up to 10 minutes
): Promise<Blob | null> {
  const result = await extractAudioAndWaveformFromMediaFile(file, maxDurationSec);
  return result ? result.blob : null;
}

export async function extractAudioAndWaveformFromMediaFile(
  file: File,
  maxDurationSec = 600
): Promise<ExtractedAudioResult | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    const audioCtx = new AudioContextClass();
    let decodedBuffer: AudioBuffer;
    try {
      decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } finally {
      await audioCtx.close();
    }

    if (!decodedBuffer) return null;

    const targetSampleRate = 16000;
    const duration = Math.min(decodedBuffer.duration, maxDurationSec);
    const numChannels = 1; // Mono
    const length = Math.floor(duration * targetSampleRate);

    // Use OfflineAudioContext to render downsampled mono 16kHz
    const offlineCtx = new OfflineAudioContext(numChannels, length, targetSampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = decodedBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const pcmData = renderedBuffer.getChannelData(0);

    // 1. Calculate 100-point normalized waveform directly from PCM
    const waveform = extractWaveformFromPcm(pcmData, 100);

    // 2. Encode to 16-bit PCM WAV
    const wavBuffer = encodeWav16Bit(pcmData, targetSampleRate);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });

    return {
      blob,
      waveform,
      durationSec: duration,
    };
  } catch (err) {
    console.warn('Client-side audio extraction warning (will fallback to direct server handling):', err);
    return null;
  }
}

/**
 * Extracts normalized [0, 1] waveform peaks from Float32 PCM samples
 */
export function extractWaveformFromPcm(samples: Float32Array, points = 100): number[] {
  if (!samples || samples.length === 0) {
    return Array.from({ length: points }, () => 0.2);
  }

  const blockSize = Math.floor(samples.length / points);
  if (blockSize <= 0) {
    return Array.from({ length: points }, () => 0.3);
  }

  const waveform: number[] = [];
  let maxFound = 0.01;

  for (let i = 0; i < points; i++) {
    const start = i * blockSize;
    let sum = 0;
    const count = Math.min(blockSize, samples.length - start);
    for (let j = 0; j < count; j++) {
      sum += Math.abs(samples[start + j]);
    }
    const val = count > 0 ? sum / count : 0;
    if (val > maxFound) maxFound = val;
    waveform.push(val);
  }

  // Normalize so peaks reach ~0.8-0.95
  return waveform.map((v) => Number(Math.max(0.08, Math.min(1.0, (v / maxFound) * 0.9)).toFixed(3)));
}

/**
 * Encodes Float32Array PCM samples into a standard 16-bit PCM WAV ArrayBuffer
 */
function encodeWav16Bit(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (1 = PCM) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples with clipping protection
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
