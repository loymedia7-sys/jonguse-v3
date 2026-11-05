import fs from 'fs';
import path from 'path';
import os from 'os';
import { DownloadJob } from './types';

export const DOWNLOAD_TEMP_DIR = path.join(os.tmpdir(), 'jonguse_downloads');

// Ensure temporary download directory exists
try {
  if (!fs.existsSync(DOWNLOAD_TEMP_DIR)) {
    fs.mkdirSync(DOWNLOAD_TEMP_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('Failed to initialize download temp dir:', err);
}

const jobStore = new Map<string, DownloadJob>();

export function setJob(job: DownloadJob): void {
  jobStore.set(job.id, job);
}

export function getJob(id: string): DownloadJob | undefined {
  return jobStore.get(id);
}

export function deleteJob(id: string): void {
  const job = jobStore.get(id);
  if (job?.filePath && fs.existsSync(job.filePath)) {
    try {
      fs.unlinkSync(job.filePath);
    } catch (err) {
      console.warn(`Failed to unlink file for job ${id}:`, err);
    }
  }
  jobStore.delete(id);
}

export function listJobs(): DownloadJob[] {
  return Array.from(jobStore.values());
}

/**
 * Cleans up jobs older than 30 minutes or past their expiresAt timestamp.
 */
export function cleanupExpiredJobs(): number {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [id, job] of jobStore.entries()) {
    const isExpired = job.expiresAt ? now > job.expiresAt : now - job.createdAt > 30 * 60 * 1000;
    if (isExpired) {
      deleteJob(id);
      cleanedCount++;
    }
  }

  // Also clean up any orphan files older than 45 minutes in DOWNLOAD_TEMP_DIR
  try {
    if (fs.existsSync(DOWNLOAD_TEMP_DIR)) {
      const files = fs.readdirSync(DOWNLOAD_TEMP_DIR);
      for (const file of files) {
        const fullPath = path.join(DOWNLOAD_TEMP_DIR, file);
        try {
          const stats = fs.statSync(fullPath);
          if (now - stats.mtimeMs > 45 * 60 * 1000) {
            fs.unlinkSync(fullPath);
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn('Error during orphan download files cleanup:', err);
  }

  return cleanedCount;
}

let maintenanceStarted = false;

/**
 * Starts periodic cleanup timer for expired jobs and temporary files.
 */
export function startDownloaderMaintenance(intervalMs = 5 * 60 * 1000): void {
  if (maintenanceStarted) return;
  maintenanceStarted = true;

  cleanupExpiredJobs();

  setInterval(() => {
    try {
      const cleaned = cleanupExpiredJobs();
      if (cleaned > 0) {
        console.log(`[Downloader Maintenance] Cleaned ${cleaned} expired jobs.`);
      }
    } catch (err) {
      console.error('[Downloader Maintenance] Error cleaning jobs:', err);
    }
  }, intervalMs).unref();
}
