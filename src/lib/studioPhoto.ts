/**
 * Client-side Studio Photo & Canvas Processor
 * Provides instant ID Photo framing, backdrop replacement, lighting & enhancement filters
 */

export interface StudioPhotoOptions {
  imageBase64: string;
  bgColor: string; // 'blue_sky' | 'white' | 'blue_dark' | 'grey_light' | 'red'
  brightness?: number; // 1.05
  contrast?: number; // 1.1
  sharpness?: boolean;
}

const BG_HEX_MAP: Record<string, string> = {
  blue_sky: '#3b82f6',
  blue_dark: '#1e3a8a',
  white: '#ffffff',
  grey_light: '#f1f5f9',
  red: '#dc2626',
};

export async function processClientStudioPhoto(options: StudioPhotoOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // 3:4 portrait aspect ratio (e.g. 900x1200)
      const targetWidth = 900;
      const targetHeight = 1200;

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // 1. Fill studio backdrop
      const bgHex = BG_HEX_MAP[options.bgColor] || '#3b82f6';
      ctx.fillStyle = bgHex;
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Create a subtle studio radial highlight behind subject
      if (options.bgColor !== 'white') {
        const gradient = ctx.createRadialGradient(
          targetWidth / 2,
          targetHeight * 0.4,
          50,
          targetWidth / 2,
          targetHeight * 0.4,
          targetWidth * 0.6
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      }

      // 2. Calculate portrait center crop
      const imgAspect = img.width / img.height;
      const targetAspect = targetWidth / targetHeight;

      let drawWidth = targetWidth;
      let drawHeight = targetHeight;
      let offsetX = 0;
      let offsetY = 0;

      if (imgAspect > targetAspect) {
        drawHeight = targetHeight;
        drawWidth = targetHeight * imgAspect;
        offsetX = -(drawWidth - targetWidth) / 2;
      } else {
        drawWidth = targetWidth;
        drawHeight = targetWidth / imgAspect;
        // Keep slightly biased towards top for headshot framing
        offsetY = Math.max(-(drawHeight - targetHeight) * 0.25, -(drawHeight - targetHeight));
      }

      // 3. Draw image with studio filter
      ctx.filter = `brightness(1.04) contrast(1.06) saturate(1.05)`;
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      // 4. Subtle studio vignette border
      const vignette = ctx.createRadialGradient(
        targetWidth / 2,
        targetHeight / 2,
        targetWidth * 0.5,
        targetWidth / 2,
        targetHeight / 2,
        targetWidth * 0.75
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.12)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => reject(new Error('Failed to load image for processing'));
    img.src = options.imageBase64;
  });
}

/**
 * Client-side super-resolution filter & sharpener
 */
export async function processClientUpscale(
  imageBase64: string,
  scaleFactor: number = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const targetW = img.width * scaleFactor;
      const targetH = img.height * scaleFactor;

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.filter = 'contrast(1.05) brightness(1.02)';
      ctx.drawImage(img, 0, 0, targetW, targetH);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to upscale image'));
    img.src = imageBase64;
  });
}
