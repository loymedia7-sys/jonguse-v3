import { auth } from '../firebase';

export type SupportedPlatform = 'tiktok' | 'douyin' | 'facebook' | 'pinterest' | 'youtube';

export interface QualityOption {
  id: string;
  label: string;
  resolution?: string;
  height?: number;
  width?: number;
  isAudioOnly?: boolean;
  ext: string;
  formatId?: string;
  filesizeApprox?: number;
}

export interface VideoInfo {
  url: string;
  platform: SupportedPlatform;
  title: string;
  thumbnail?: string;
  duration?: number;
  author?: string;
  qualities: QualityOption[];
}

export type JobStatus = 'queued' | 'downloading' | 'processing' | 'ready' | 'failed';

export interface DownloadJob {
  id: string;
  url: string;
  platform: SupportedPlatform;
  qualityId: string;
  qualityLabel: string;
  status: JobStatus;
  progress: number;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  error?: string;
  errorKm?: string;
  createdAt: number;
  completedAt?: number;
  expiresAt: number;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const idToken = await currentUser.getIdToken();
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }
    }
  } catch (err) {
    console.warn('Could not attach Firebase auth token:', err);
  }

  return headers;
}

/**
 * Fetches video metadata and available qualities from server.
 */
export async function fetchVideoInfo(url: string): Promise<VideoInfo> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/download/info', {
    method: 'POST',
    headers,
    body: JSON.stringify({ url }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    const error = new Error(data.error || 'Failed to inspect video link');
    (error as any).errorKm = data.errorKm;
    throw error;
  }

  return data.info;
}

/**
 * Starts a download job with selected quality.
 */
export async function startDownload(url: string, qualityId: string): Promise<DownloadJob> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/download/start', {
    method: 'POST',
    headers,
    body: JSON.stringify({ url, qualityId }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    const error = new Error(data.error || 'Failed to start download');
    (error as any).errorKm = data.errorKm;
    throw error;
  }

  return data.job;
}

/**
 * Polls status for a download job until completion or error.
 */
export function pollJobStatus(
  jobId: string,
  onUpdate: (job: DownloadJob, downloadUrl?: string) => void,
  intervalMs = 1200
): () => void {
  let isCancelled = false;

  const check = async () => {
    if (isCancelled) return;

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/download/status/${jobId}`, {
        headers,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        onUpdate({
          id: jobId,
          url: '',
          platform: 'tiktok',
          qualityId: '',
          qualityLabel: '',
          status: 'failed',
          progress: 0,
          error: errData.error || 'Failed to fetch status',
          errorKm: errData.errorKm || 'មិនអាចពិនិត្យស្ថានភាពបានទេ',
          createdAt: Date.now(),
          expiresAt: Date.now(),
        });
        return;
      }

      const data = await res.json();
      if (data.success && data.job) {
        onUpdate(data.job, data.downloadUrl);

        if (data.job.status === 'ready' || data.job.status === 'failed') {
          return; // Terminal state reached
        }
      }
    } catch (err: any) {
      console.warn('Status poll error:', err);
    }

    if (!isCancelled) {
      setTimeout(check, intervalMs);
    }
  };

  check();

  return () => {
    isCancelled = true;
  };
}
