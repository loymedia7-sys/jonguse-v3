import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';
import { detectPlatform } from './platforms';
import { extractVideoInfoWithYtdlp, downloadMediaWithYtdlp } from './ytdlp';
import { fetchDouyinFromCustomApi } from './douyin';
import { globalDownloadQueue } from './queue';
import { setJob, getJob } from './store';
import { DownloadJob, VideoInfo, SignedDownloadPayload } from './types';

// Secret key for signing download tokens
const DOWNLOAD_SECRET_STR = process.env.DOWNLOAD_SECRET || 'jonguse_super_secure_downloader_secret_2026_key!';
const SECRET_KEY = crypto.createHash('sha256').update(DOWNLOAD_SECRET_STR).digest();

/**
 * Translates raw error messages into user-friendly English & Khmer messages.
 */
function translateError(err: any): { error: string; errorKm: string } {
  const msg = String(err?.message || err || '');

  if (msg.includes('Sign in to confirm you’re not a bot') || msg.includes('bot') || msg.includes('HTTP Error 429')) {
    return {
      error: 'Platform rate-limited or blocked this request (bot check). Please try again in a few moments.',
      errorKm: 'ប្រព័ន្ធត្រូវបានការពារដោយ Bot Check ពីវេទិកា។ សូមរង់ចាំបន្តិច រួចសាកល្បងម្ដងទៀត។',
    };
  }

  if (msg.includes('Private video') || msg.includes('This video is private')) {
    return {
      error: 'This video is private, friends-only, or requires login.',
      errorKm: 'វីដេអូនេះជាលក្ខណៈឯកជន (Private) ឬត្រូវមានសិទ្ធិចូលមើល។',
    };
  }

  if (msg.includes('Video unavailable') || msg.includes('not available') || msg.includes('does not exist')) {
    return {
      error: 'Video is unavailable, deleted, or removed by author.',
      errorKm: 'វីដេអូនេះមិនមាន ឬត្រូវបានម្ចាស់លុបចោលហើយ។',
    };
  }

  if (msg.includes('yt-dlp is not installed')) {
    return {
      error: 'Server downloader component (yt-dlp) is initializing. Please verify container setup.',
      errorKm: 'ម៉ាស៊ីនបម្រើកំពុងដំឡើងសមាសភាគ yt-dlp។ សូមសាកល្បងម្ដងទៀត។',
    };
  }

  return {
    error: msg.length > 120 ? `${msg.slice(0, 120)}...` : msg || 'Download failed. Please check the URL.',
    errorKm: 'ការទាញយកបានបរាជ័យ។ សូមពិនិត្យមើល Link វីដេអូឡើងវិញ។',
  };
}

/**
 * Fetches video metadata and available qualities.
 */
export async function fetchVideoInfo(url: string): Promise<VideoInfo> {
  const validation = detectPlatform(url);
  if (!validation.isValid || !validation.platform || !validation.cleanUrl) {
    const err = new Error(validation.error || 'Invalid video link');
    (err as any).errorKm = validation.errorKm || 'Link មិនត្រឹមត្រូវ';
    throw err;
  }

  const cleanUrl = validation.cleanUrl;
  const platform = validation.platform;

  // If Douyin and custom scraper configured, try that first
  if (platform === 'douyin') {
    const customResult = await fetchDouyinFromCustomApi(cleanUrl);
    if (customResult) return customResult;
  }

  // Fallback to yt-dlp
  try {
    return await extractVideoInfoWithYtdlp(cleanUrl, platform);
  } catch (err: any) {
    const { error, errorKm } = translateError(err);
    const friendlyErr = new Error(error);
    (friendlyErr as any).errorKm = errorKm;
    throw friendlyErr;
  }
}

/**
 * Creates and queues a new download job.
 */
export async function startDownloadJob(
  url: string,
  qualityId: string,
  userId?: string
): Promise<DownloadJob> {
  const validation = detectPlatform(url);
  if (!validation.isValid || !validation.platform || !validation.cleanUrl) {
    const err = new Error(validation.error || 'Invalid video link');
    (err as any).errorKm = validation.errorKm || 'Link មិនត្រឹមត្រូវ';
    throw err;
  }

  const jobId = `dl_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const now = Date.now();

  const job: DownloadJob = {
    id: jobId,
    url: validation.cleanUrl,
    platform: validation.platform,
    qualityId: qualityId || 'video_best',
    qualityLabel: qualityId === 'audio_mp3' ? 'MP3 Audio' : qualityId.replace('video_', '') + 'p Video',
    status: 'queued',
    progress: 0,
    userId,
    createdAt: now,
    expiresAt: now + 30 * 60 * 1000, // 30 mins retention
  };

  setJob(job);

  // Enqueue task to download worker
  globalDownloadQueue.enqueue(async () => {
    const current = getJob(jobId);
    if (!current) return;

    current.status = 'downloading';
    current.progress = 5;
    setJob(current);

    try {
      const result = await downloadMediaWithYtdlp(current, (pct) => {
        const live = getJob(jobId);
        if (live && live.status === 'downloading') {
          live.progress = Math.round(pct);
          setJob(live);
        }
      });

      const finished = getJob(jobId);
      if (finished) {
        finished.status = 'ready';
        finished.progress = 100;
        finished.filePath = result.filePath;
        finished.fileName = result.fileName;
        finished.fileSize = result.fileSize;
        finished.mimeType = result.mimeType;
        finished.completedAt = Date.now();
        finished.expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes to save
        setJob(finished);
      }
    } catch (err: any) {
      console.error(`Download job ${jobId} failed:`, err);
      const failed = getJob(jobId);
      if (failed) {
        const { error, errorKm } = translateError(err);
        failed.status = 'failed';
        failed.error = error;
        failed.errorKm = errorKm;
        setJob(failed);
      }
    }
  });

  return job;
}

/**
 * Creates a signed JWT for file downloading, valid for 10 minutes.
 */
export async function createSignedDownloadToken(jobId: string, fileName: string): Promise<string> {
  return await new SignJWT({ jobId, fileName })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m') // 10 minutes expiry
    .sign(SECRET_KEY);
}

/**
 * Verifies the signed download JWT.
 */
export async function verifySignedDownloadToken(token: string): Promise<SignedDownloadPayload> {
  const { payload } = await jwtVerify(token, SECRET_KEY);
  return payload as unknown as SignedDownloadPayload;
}
