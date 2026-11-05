import { spawn, execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { SupportedPlatform, VideoInfo, QualityOption, DownloadJob } from './types';
import { DOWNLOAD_TEMP_DIR } from './store';

const execFileAsync = promisify(execFile);

const COOKIES_PATH = process.env.YTDLP_COOKIES_PATH || '';
const PROXY_URL = process.env.YTDLP_PROXY || '';

export function ensureYtdlpBinaryInstalled(): void {
  try {
    if (!fs.existsSync('/usr/local/bin/yt-dlp') && !fs.existsSync('/usr/bin/yt-dlp')) {
      const { exec } = require('child_process');
      exec('curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && chmod a+rx /usr/local/bin/yt-dlp', (err: any) => {
        if (!err) console.log('yt-dlp binary installed to /usr/local/bin/yt-dlp');
      });
    }
  } catch (e) {
    // ignore
  }
}

// Check at startup
ensureYtdlpBinaryInstalled();

function getYtdlpBinary(): string {
  if (process.env.YTDLP_PATH && fs.existsSync(process.env.YTDLP_PATH)) {
    return process.env.YTDLP_PATH;
  }
  if (fs.existsSync('/usr/local/bin/yt-dlp')) {
    return '/usr/local/bin/yt-dlp';
  }
  if (fs.existsSync('/usr/bin/yt-dlp')) {
    return '/usr/bin/yt-dlp';
  }
  return 'yt-dlp';
}

function getBaseYtdlpArgs(): string[] {
  const args = [
    '--no-warnings',
    '--prefer-free-formats',
    '--socket-timeout', '20',
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  ];

  if (COOKIES_PATH && fs.existsSync(COOKIES_PATH)) {
    args.push('--cookies', COOKIES_PATH);
  }

  if (PROXY_URL) {
    args.push('--proxy', PROXY_URL);
  }

  return args;
}

/**
 * High-speed native TikTok resolver using direct CDN endpoints (TikWM).
 * Solves bot-checks and webpage layout changes on TikTok links completely.
 */
async function fetchTikTokDirectInfo(url: string): Promise<VideoInfo | null> {
  try {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== 0 || !data.data) return null;

    const item = data.data;
    const qualities: QualityOption[] = [];

    if (item.play) {
      qualities.push({
        id: 'video_best',
        label: 'HD No Watermark (MP4)',
        resolution: '1080p HD',
        height: 1080,
        isAudioOnly: false,
        ext: 'mp4',
        filesizeApprox: item.size || undefined,
        formatId: item.play, // Direct URL stored in formatId
      });
    }

    if (item.wmplay) {
      qualities.push({
        id: 'video_wm',
        label: 'Standard Watermark (MP4)',
        resolution: '720p',
        height: 720,
        isAudioOnly: false,
        ext: 'mp4',
        filesizeApprox: item.wm_size || undefined,
        formatId: item.wmplay,
      });
    }

    if (item.music) {
      qualities.push({
        id: 'audio_mp3',
        label: 'Audio Only (MP3)',
        isAudioOnly: true,
        ext: 'mp3',
        formatId: item.music,
      });
    }

    return {
      url,
      platform: 'tiktok',
      title: item.title || item.music_info?.title || 'TikTok Video',
      thumbnail: item.cover || item.origin_cover || item.dynamic_cover,
      duration: item.duration || undefined,
      author: item.author?.unique_id || item.author?.nickname || 'TikTok User',
      qualities: qualities.length > 0 ? qualities : [
        { id: 'video_best', label: 'Best Available (MP4)', isAudioOnly: false, ext: 'mp4' },
        { id: 'audio_mp3', label: 'Audio Only (MP3)', isAudioOnly: true, ext: 'mp3' },
      ],
    };
  } catch (err) {
    console.warn('TikWM fallback resolution notice:', err);
    return null;
  }
}

/**
 * Downloads media from a direct URL with chunked progress updates.
 */
async function downloadDirectMedia(
  downloadUrl: string,
  targetExt: string,
  job: DownloadJob,
  onProgress: (pct: number) => void
): Promise<{ filePath: string; fileName: string; fileSize: number; mimeType: string }> {
  const sanitizedId = job.id.replace(/[^a-zA-Z0-9_-]/g, '');
  const outFileName = `${sanitizedId}_video.${targetExt}`;
  const outFilePath = path.join(DOWNLOAD_TEMP_DIR, outFileName);

  const res = await fetch(downloadUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to download stream: HTTP ${res.status}`);
  }

  const contentLength = Number(res.headers.get('content-length')) || 0;
  let receivedBytes = 0;

  const fileStream = fs.createWriteStream(outFilePath);
  const reader = res.body?.getReader();

  if (!reader) {
    throw new Error('Unable to create stream reader.');
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    if (value) {
      fileStream.write(Buffer.from(value));
      receivedBytes += value.length;
      if (contentLength > 0) {
        const pct = Math.min(99, Math.round((receivedBytes / contentLength) * 100));
        onProgress(pct);
      }
    }
  }

  fileStream.end();

  const stats = fs.statSync(outFilePath);
  const mimeType = targetExt === 'mp3' ? 'audio/mpeg' : 'video/mp4';

  return {
    filePath: outFilePath,
    fileName: outFileName,
    fileSize: stats.size,
    mimeType,
  };
}

/**
 * Extracts video metadata and available resolutions.
 */
export async function extractVideoInfoWithYtdlp(
  url: string,
  platform: SupportedPlatform
): Promise<VideoInfo> {
  // If TikTok, try native high-speed direct resolution first
  if (platform === 'tiktok') {
    const tiktokDirect = await fetchTikTokDirectInfo(url);
    if (tiktokDirect) return tiktokDirect;
  }

  const bin = getYtdlpBinary();
  const args = [
    ...getBaseYtdlpArgs(),
    '--dump-single-json',
    '--no-playlist',
    url,
  ];

  let stdout: string;
  try {
    const res = await execFileAsync(bin, args, {
      maxBuffer: 20 * 1024 * 1024,
      timeout: 30000,
    });
    stdout = res.stdout;
  } catch (err: any) {
    const stderr = String(err.stderr || err.message || '');
    console.error(`yt-dlp info error for ${url}:`, stderr);

    // If TikTok failed via yt-dlp, retry TikWM directly
    if (platform === 'tiktok') {
      const retryDirect = await fetchTikTokDirectInfo(url);
      if (retryDirect) return retryDirect;
    }

    if (stderr.includes('Sign in to confirm you’re not a bot') || stderr.includes('bot')) {
      throw new Error('Platform required bot verification. Please try again later or configure cookies.');
    }
    if (stderr.includes('Private video') || stderr.includes('This video is private')) {
      throw new Error('This video is private and cannot be downloaded.');
    }
    if (stderr.includes('Video unavailable') || stderr.includes('not available')) {
      throw new Error('Video is unavailable or has been removed.');
    }
    if (err.code === 'ENOENT') {
      throw new Error('yt-dlp is initializing. Please verify container setup.');
    }
    throw new Error(err.message || 'Failed to inspect video details.');
  }

  let data: any;
  try {
    data = JSON.parse(stdout);
  } catch {
    throw new Error('Failed to parse video format metadata.');
  }

  const title = data.title || data.fulltitle || 'Untitled Video';
  const thumbnail = data.thumbnail || (Array.isArray(data.thumbnails) && data.thumbnails.length > 0 ? data.thumbnails[data.thumbnails.length - 1].url : undefined);
  const duration = typeof data.duration === 'number' ? Math.round(data.duration) : undefined;
  const author = data.uploader || data.creator || data.channel || data.artist || undefined;

  const rawFormats: any[] = Array.isArray(data.formats) ? data.formats : [];
  const qualities: QualityOption[] = [];
  const seenHeights = new Set<number>();

  for (const fmt of rawFormats) {
    const height = typeof fmt.height === 'number' ? fmt.height : undefined;
    const vcodec = fmt.vcodec;
    if (!height || height < 144) continue;
    if (vcodec === 'none') continue;

    const standardHeight = height >= 2160 ? 2160
      : height >= 1440 ? 1440
      : height >= 1080 ? 1080
      : height >= 720 ? 720
      : height >= 480 ? 480
      : height >= 360 ? 360
      : 240;

    if (!seenHeights.has(standardHeight)) {
      seenHeights.add(standardHeight);
      const isHD = standardHeight >= 720;
      const is4K = standardHeight >= 2160;
      const is2K = standardHeight >= 1440;
      const label = is4K ? `${standardHeight}p (4K Ultra HD)`
        : is2K ? `${standardHeight}p (2K Quad HD)`
        : standardHeight === 1080 ? `${standardHeight}p (Full HD)`
        : isHD ? `${standardHeight}p (HD)`
        : `${standardHeight}p (Standard)`;

      qualities.push({
        id: `video_${standardHeight}`,
        label,
        resolution: `${fmt.width || '?'}x${standardHeight}`,
        height: standardHeight,
        width: fmt.width,
        isAudioOnly: false,
        ext: 'mp4',
        formatId: fmt.format_id,
        filesizeApprox: fmt.filesize || fmt.filesize_approx,
      });
    }
  }

  qualities.sort((a, b) => (b.height || 0) - (a.height || 0));

  if (qualities.length === 0) {
    qualities.push({
      id: 'video_best',
      label: 'Best Available (MP4)',
      isAudioOnly: false,
      ext: 'mp4',
    });
  }

  qualities.push({
    id: 'audio_mp3',
    label: 'Audio Only (MP3)',
    isAudioOnly: true,
    ext: 'mp3',
  });

  return {
    url,
    platform,
    title,
    thumbnail,
    duration,
    author,
    qualities,
  };
}

/**
 * Downloads the video/audio and updates progress.
 */
export async function downloadMediaWithYtdlp(
  job: DownloadJob,
  onProgress: (pct: number) => void
): Promise<{ filePath: string; fileName: string; fileSize: number; mimeType: string }> {
  // If TikTok, inspect direct stream from TikWM
  if (job.platform === 'tiktok') {
    try {
      const tiktokInfo = await fetchTikTokDirectInfo(job.url);
      if (tiktokInfo && tiktokInfo.qualities.length > 0) {
        const isAudio = job.qualityId === 'audio_mp3';
        const targetQ = tiktokInfo.qualities.find(q => isAudio ? q.isAudioOnly : !q.isAudioOnly) || tiktokInfo.qualities[0];
        if (targetQ?.formatId && targetQ.formatId.startsWith('http')) {
          return await downloadDirectMedia(targetQ.formatId, targetQ.ext, job, onProgress);
        }
      }
    } catch (e) {
      console.warn('Direct TikTok download fallback to yt-dlp:', e);
    }
  }

  const bin = getYtdlpBinary();
  const isAudio = job.qualityId === 'audio_mp3';
  const heightMatch = job.qualityId.match(/video_(\d+)/);
  const targetHeight = heightMatch ? parseInt(heightMatch[1], 10) : undefined;

  const sanitizedId = job.id.replace(/[^a-zA-Z0-9_-]/g, '');
  const outTemplate = path.join(DOWNLOAD_TEMP_DIR, `${sanitizedId}_%(title).60B.%(ext)s`);

  const args = [...getBaseYtdlpArgs(), '--no-playlist'];

  if (isAudio) {
    args.push(
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '-o', outTemplate,
      job.url
    );
  } else if (targetHeight) {
    args.push(
      '-f', `bestvideo[height<=${targetHeight}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${targetHeight}]+bestaudio/best[height<=${targetHeight}]/best`,
      '--merge-output-format', 'mp4',
      '-o', outTemplate,
      job.url
    );
  } else {
    args.push(
      '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best',
      '--merge-output-format', 'mp4',
      '-o', outTemplate,
      job.url
    );
  }

  return new Promise((resolve, reject) => {
    let resolved = false;
    let finalFilePath = '';
    const child = spawn(bin, args);

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      const match = text.match(/\[download\]\s+([\d.]+)%/);
      if (match) {
        const pct = Math.min(99, Math.max(1, parseFloat(match[1])));
        onProgress(pct);
      }

      const destMatch = text.match(/\[(?:download|Merger|ExtractAudio)\] Destination:\s+(.+)/);
      if (destMatch && destMatch[1]) {
        finalFilePath = destMatch[1].trim();
      }
      const alreadyMatch = text.match(/\[download\]\s+(.+)\s+has already been downloaded/);
      if (alreadyMatch && alreadyMatch[1]) {
        finalFilePath = alreadyMatch[1].trim();
      }
    });

    let stderrBuffer = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderrBuffer += chunk.toString();
    });

    child.on('error', (err: any) => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`Failed to start download process: ${err.message}`));
      }
    });

    child.on('close', (code: number) => {
      if (resolved) return;
      resolved = true;

      if (code !== 0) {
        const errorMsg = stderrBuffer || `Process exited with code ${code}`;
        console.error('yt-dlp download failed:', errorMsg);
        return reject(new Error(errorMsg));
      }

      try {
        if (!finalFilePath || !fs.existsSync(finalFilePath)) {
          const files = fs.readdirSync(DOWNLOAD_TEMP_DIR);
          const matched = files.find(f => f.startsWith(sanitizedId));
          if (matched) {
            finalFilePath = path.join(DOWNLOAD_TEMP_DIR, matched);
          }
        }

        if (!finalFilePath || !fs.existsSync(finalFilePath)) {
          return reject(new Error('Downloaded output file could not be located.'));
        }

        const stats = fs.statSync(finalFilePath);
        const fileName = path.basename(finalFilePath);
        const ext = path.extname(finalFilePath).toLowerCase();
        const mimeType = ext === '.mp3' ? 'audio/mpeg' : ext === '.mp4' ? 'video/mp4' : 'application/octet-stream';

        resolve({
          filePath: finalFilePath,
          fileName,
          fileSize: stats.size,
          mimeType,
        });
      } catch (err: any) {
        reject(new Error(`Error verifying downloaded file: ${err.message}`));
      }
    });
  });
}
