import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Executes an FFmpeg command with promise wrapping and detailed logging.
 */
export function runFfmpegCommand(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn('ffmpeg', args);
    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        const errorMsg = `FFmpeg exited with code ${code}:\n${stderr.slice(-1000)}`;
        console.error(errorMsg);
        reject(new Error(errorMsg));
      }
    });

    process.on('error', (err) => {
      reject(new Error(`Failed to start FFmpeg process: ${err.message}`));
    });
  });
}

/**
 * Extracts 16kHz Mono 16-bit PCM WAV audio from video (required for Gemini / Speech-to-Text STT)
 */
export async function extractAudioToWav16k(
  inputVideoPath: string,
  outputWavPath: string
): Promise<string> {
  // Ensure output directory exists
  const outDir = path.dirname(outputWavPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // -y : overwrite
  // -vn : disable video recording
  // -acodec pcm_s16le : 16-bit PCM WAV
  // -ar 16000 : 16kHz sampling rate
  // -ac 1 : Mono channel
  const args = [
    '-y',
    '-i',
    inputVideoPath,
    '-vn',
    '-acodec',
    'pcm_s16le',
    '-ar',
    '16000',
    '-ac',
    '1',
    outputWavPath,
  ];

  await runFfmpegCommand(args);
  return outputWavPath;
}

/**
 * Burns ASS (or SRT) subtitles into video using FFmpeg libass / subtitles filter.
 * Includes font directory pointing to `./fonts` for proper Khmer font rendering.
 */
export async function burnSubtitlesWithFfmpeg(
  videoPath: string,
  subtitlesPath: string,
  outputPath: string,
  fontsDir = path.join(process.cwd(), 'fonts')
): Promise<string> {
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Escape colon, backslash, single quote for FFmpeg filter syntax
  const sanitizedSubsPath = subtitlesPath.replace(/\\/g, '/').replace(/:/g, '\\:');
  const sanitizedFontsDir = fontsDir.replace(/\\/g, '/').replace(/:/g, '\\:');

  // Use libass ass filter with fontsdir and pad filter to ensure even dimensions (required by libx264 yuv420p)
  const filterString = `pad=ceil(iw/2)*2:ceil(ih/2)*2,ass='${sanitizedSubsPath}':fontsdir='${sanitizedFontsDir}'`;

  // Write to temporary output file first to avoid truncating input if paths collide
  const tempOutputPath = path.join(
    outDir,
    `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${path.basename(outputPath)}`
  );

  const args = [
    '-y',
    '-i',
    videoPath,
    '-vf',
    filterString,
    '-map',
    '0:v:0',
    '-map',
    '0:a?',
    '-c:v',
    'libx264',
    '-profile:v',
    'main',
    '-level',
    '4.0',
    '-preset',
    'veryfast',
    '-crf',
    '22',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-ar',
    '44100',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    tempOutputPath,
  ];

  try {
    await runFfmpegCommand(args);
    if (fs.existsSync(tempOutputPath)) {
      if (fs.existsSync(outputPath)) {
        try { fs.unlinkSync(outputPath); } catch {}
      }
      fs.renameSync(tempOutputPath, outputPath);
    }
  } catch (err: any) {
    // If ass filter fails or libass is configured differently, fallback to standard subtitles filter
    console.warn('FFmpeg ass filter error, attempting fallback subtitles filter:', err.message);
    const fallbackFilter = `pad=ceil(iw/2)*2:ceil(ih/2)*2,subtitles='${sanitizedSubsPath}':fontsdir='${sanitizedFontsDir}'`;
    const fallbackArgs = [
      '-y',
      '-i',
      videoPath,
      '-vf',
      fallbackFilter,
      '-map',
      '0:v:0',
      '-map',
      '0:a?',
      '-c:v',
      'libx264',
      '-profile:v',
      'main',
      '-level',
      '4.0',
      '-preset',
      'veryfast',
      '-crf',
      '22',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-ar',
      '44100',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      tempOutputPath,
    ];
    try {
      await runFfmpegCommand(fallbackArgs);
      if (fs.existsSync(tempOutputPath)) {
        if (fs.existsSync(outputPath)) {
          try { fs.unlinkSync(outputPath); } catch {}
        }
        fs.renameSync(tempOutputPath, outputPath);
      }
    } catch (fbErr: any) {
      if (fs.existsSync(tempOutputPath)) {
        try { fs.unlinkSync(tempOutputPath); } catch {}
      }
      throw fbErr;
    }
  }

  return outputPath;
}

/**
 * Generates audio waveform peak array (e.g. 100 points) for timeline visualization.
 */
export async function generateWaveformData(wavPath: string, numPoints = 120): Promise<number[]> {
  try {
    if (!fs.existsSync(wavPath)) return [];
    const buffer = fs.readFileSync(wavPath);
    // Standard WAV header is 44 bytes; remaining is 16-bit PCM (2 bytes per sample, signed little-endian)
    const dataOffset = 44;
    const totalSamples = Math.floor((buffer.length - dataOffset) / 2);
    if (totalSamples <= 0) return [];

    const samplesPerPoint = Math.max(1, Math.floor(totalSamples / numPoints));
    const peaks: number[] = [];

    for (let p = 0; p < numPoints; p++) {
      let maxAmp = 0;
      const startSample = p * samplesPerPoint;
      const endSample = Math.min(totalSamples, startSample + samplesPerPoint);

      for (let s = startSample; s < endSample; s += 8) { // downsample loop for speed
        const byteIdx = dataOffset + s * 2;
        if (byteIdx + 1 < buffer.length) {
          const val = Math.abs(buffer.readInt16LE(byteIdx));
          if (val > maxAmp) maxAmp = val;
        }
      }

      // Normalize to 0.05 - 1.0 range
      const normalized = Math.min(1.0, Math.max(0.06, maxAmp / 32768));
      peaks.push(Number(normalized.toFixed(3)));
    }

    return peaks;
  } catch (err) {
    console.warn('Could not generate waveform data:', err);
    // Return subtle simulated waveform
    return Array.from({ length: numPoints }, (_, i) => 0.2 + 0.5 * Math.abs(Math.sin(i * 0.25)));
  }
}
