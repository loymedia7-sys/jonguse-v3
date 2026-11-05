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
  filesizeApprox?: number; // bytes
  vcodec?: string;
  acodec?: string;
}

export interface VideoInfo {
  url: string;
  platform: SupportedPlatform;
  title: string;
  thumbnail?: string;
  duration?: number; // seconds
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
  progress: number; // 0 to 100
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  error?: string;
  errorKm?: string;
  userId?: string;
  createdAt: number;
  completedAt?: number;
  expiresAt: number;
}

export interface SignedDownloadPayload {
  jobId: string;
  fileName: string;
  exp: number;
  iat: number;
}
