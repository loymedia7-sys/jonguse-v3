import React, { useState } from 'react';
import { ResultPanel } from '../../ui/ResultPanel';
import { Button } from '../../ui/Button';
import { Language } from '../../../types';
import { translations } from '../../../lib/i18n';
import { Download, Grid, Image as ImageIcon } from 'lucide-react';
import confetti from 'canvas-confetti';

interface IdPhotoResultProps {
  imageUrl: string;
  lang: Language;
  onReset: () => void;
}

export const IdPhotoResult: React.FC<IdPhotoResultProps> = ({ imageUrl, lang, onReset }) => {
  const t = translations[lang];
  const [printSheetUrl, setPrintSheetUrl] = useState<string | null>(null);
  const [isGeneratingSheet, setIsGeneratingSheet] = useState(false);

  // Function to create a 4-up or 8-up photo sheet canvas
  const generatePrintSheet = () => {
    setIsGeneratingSheet(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // 1200 x 1800 px for standard 4x6 inch print at 300 DPI
      const canvas = document.createElement('canvas');
      canvas.width = 1800;
      canvas.height = 1200;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // White photo sheet
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw 6 passport copies (2 rows x 3 cols)
        const photoWidth = 450;
        const photoHeight = 550;
        const gapX = 110;
        const gapY = 50;
        const startX = 80;
        const startY = 30;

        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 3; col++) {
            const x = startX + col * (photoWidth + gapX);
            const y = startY + row * (photoHeight + gapY);

            // Subtle cut guides
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 2, y - 2, photoWidth + 4, photoHeight + 4);

            ctx.drawImage(img, x, y, photoWidth, photoHeight);
          }
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setPrintSheetUrl(dataUrl);
        setIsGeneratingSheet(false);
      }
    };
    img.src = imageUrl;
  };

  const handleDownloadSingle = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `jong_use_idphoto_${Date.now()}.png`;
    a.click();
  };

  const handleDownloadSheet = () => {
    if (!printSheetUrl) {
      generatePrintSheet();
      return;
    }
    const a = document.createElement('a');
    a.href = printSheetUrl;
    a.download = `jong_use_passport_print_sheet_${Date.now()}.jpg`;
    a.click();
  };

  return (
    <ResultPanel
      title={t.idPhotoTitle}
      lang={lang}
      onDownload={handleDownloadSingle}
      onReset={onReset}
      triggerConfetti={true}
    >
      <div className="flex flex-col items-center justify-center space-y-6 py-2">
        {/* Passport frame preview */}
        <div className="relative group">
          <div className="w-56 h-72 rounded-xl overflow-hidden border-4 border-white shadow-xl ring-1 ring-stone-300 bg-stone-100 flex items-center justify-center">
            <img
              src={imageUrl}
              alt="Generated ID Photo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-stone-900/90 text-white text-[11px] font-bold shadow-md whitespace-nowrap">
            3x4 / 4x6 Official Headshot
          </div>
        </div>

        {/* Print sheet action */}
        <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-stone-50/80 p-4 text-center space-y-3">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-stone-800">
            <Grid className="w-4 h-4 text-emerald-600" />
            <span>4x6 Photo Sheet (6x Passport Copies)</span>
          </div>
          <p className="text-xs text-stone-500">
            Ready to print at any photo store on standard 4x6 inch paper
          </p>

          <Button
            size="sm"
            variant="secondary"
            className="w-full"
            onClick={printSheetUrl ? handleDownloadSheet : generatePrintSheet}
            loading={isGeneratingSheet}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            {printSheetUrl ? 'Download 6-Photo Sheet (JPG)' : 'Generate 6-Photo Sheet'}
          </Button>
        </div>
      </div>
    </ResultPanel>
  );
};
