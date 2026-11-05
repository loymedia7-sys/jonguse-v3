import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { optionalAuthMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { infoRateLimiter, startDownloadRateLimiter } from '../middleware/rateLimit';
import {
  fetchVideoInfo,
  startDownloadJob,
  createSignedDownloadToken,
  verifySignedDownloadToken,
} from '../downloader/service';
import { getJob } from '../downloader/store';

const router = Router();

/**
 * POST /api/download/info
 * Inspects the video link and returns title, thumbnail, duration, author,
 * and the actual video/audio resolutions available.
 */
router.post(
  '/info',
  optionalAuthMiddleware,
  infoRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({
          error: 'URL is required.',
          errorKm: 'សូមបញ្ជាក់ Link វីដេអូ។',
        });
      }

      const info = await fetchVideoInfo(url.trim());
      return res.json({
        success: true,
        info,
      });
    } catch (err: any) {
      console.error('Downloader info route error:', err);
      return res.status(400).json({
        error: err.message || 'Failed to inspect video link.',
        errorKm: err.errorKm || 'មិនអាចត្រួតពិនិត្យ link វីដេអូបានទេ។',
      });
    }
  }
);

/**
 * POST /api/download/start
 * Queues a download job for the chosen quality.
 */
router.post(
  '/start',
  optionalAuthMiddleware,
  startDownloadRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { url, qualityId } = req.body;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({
          error: 'URL is required.',
          errorKm: 'សូមបញ្ជាក់ Link វីដេអូ។',
        });
      }

      // [POSTGRES HOOK]: When server-side token enforcement is enabled,
      // verify user balance here before creating the job.

      const job = await startDownloadJob(url.trim(), qualityId || 'video_best', req.userId);

      return res.json({
        success: true,
        jobId: job.id,
        job,
      });
    } catch (err: any) {
      console.error('Downloader start route error:', err);
      return res.status(400).json({
        error: err.message || 'Failed to start download job.',
        errorKm: err.errorKm || 'មិនអាចចាប់ផ្ដើមទាញយកវីដេអូបានទេ។',
      });
    }
  }
);

/**
 * GET /api/download/status/:jobId
 * Polls the current job status and progress.
 * When status is 'ready', returns a 10-minute signed download URL.
 */
router.get(
  '/status/:jobId',
  optionalAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { jobId } = req.params;
      const job = getJob(jobId);

      if (!job) {
        return res.status(404).json({
          error: 'Download job not found or has expired.',
          errorKm: 'មិនស្វែងរកឃើញ ឬការងារទាញយកនេះបានផុតកំណត់ហើយ។',
        });
      }

      let downloadUrl: string | undefined;

      if (job.status === 'ready' && job.fileName && job.filePath) {
        const token = await createSignedDownloadToken(job.id, job.fileName);
        downloadUrl = `/api/download/file?token=${encodeURIComponent(token)}`;
      }

      return res.json({
        success: true,
        job: {
          id: job.id,
          url: job.url,
          platform: job.platform,
          qualityId: job.qualityId,
          qualityLabel: job.qualityLabel,
          status: job.status,
          progress: job.progress,
          fileName: job.fileName,
          fileSize: job.fileSize,
          mimeType: job.mimeType,
          error: job.error,
          errorKm: job.errorKm,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
          expiresAt: job.expiresAt,
        },
        downloadUrl,
      });
    } catch (err: any) {
      console.error('Downloader status error:', err);
      return res.status(500).json({
        error: 'Failed to retrieve download job status.',
        errorKm: 'មិនអាចពិនិត្យស្ថានភាពការទាញយកបានទេ។',
      });
    }
  }
);

/**
 * GET /api/download/file?token=...
 * Streams the completed media file to the user using the signed JWT.
 */
router.get('/file', async (req, res) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).send('Missing download token.');
    }

    let payload: any;
    try {
      payload = await verifySignedDownloadToken(token);
    } catch (err: any) {
      return res.status(403).send('Download link is invalid or has expired (links expire in 10 minutes).');
    }

    const job = getJob(payload.jobId);
    if (!job || !job.filePath || !fs.existsSync(job.filePath)) {
      return res.status(404).send('File not found or has been cleaned up from storage.');
    }

    const fileName = job.fileName || payload.fileName || 'download';
    const fileSize = job.fileSize || fs.statSync(job.filePath).size;
    const mimeType = job.mimeType || 'application/octet-stream';

    // Set download headers
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    const fileStream = fs.createReadStream(job.filePath);
    fileStream.pipe(res);
  } catch (err: any) {
    console.error('Downloader file streaming error:', err);
    if (!res.headersSent) {
      res.status(500).send('Failed to stream download file.');
    }
  }
});

export default router;
