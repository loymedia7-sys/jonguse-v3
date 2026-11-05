import React, { useState } from 'react';
import { Language } from '../../../types';
import { translations } from '../../../lib/i18n';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Scissors, Image as ImageIcon, Download, Check, RefreshCw } from 'lucide-react';
import { ResultPanel } from '../../ui/ResultPanel';

interface UpscaleUploaderProps {
  inputImage: string;
  resultImage: string | null;
  mode: 'upscale' | 'bgremove';
  onChangeMode: (mode: 'upscale' | 'bgremove') => void;
  scale: string;
  onChangeScale: (scale: string) => void;
  bgColor: string;
  onChangeBgColor: (color: string) => void;
  enhanceFaces: boolean;
  onToggleEnhanceFaces: () => void;
  onProcess: () => void;
  onReset: () => void;
  loading: boolean;
  lang: Language;
}

export const UpscaleUploader: React.FC<UpscaleUploaderProps> = ({
  inputImage,
  resultImage,
  mode,
  onChangeMode,
  scale,
  onChangeScale,
  bgColor,
  onChangeBgColor,
  enhanceFaces,
  onToggleEnhanceFaces,
  onProcess,
  onReset,
  loading,
  lang,
}) => {
  const t = translations[lang];
  const [sliderPos, setSliderPos] = useState(50);

  const bgChoices = [
    { id: 'white', label: t.bgRemoveWhite, colorHex: '#ffffff' },
    { id: 'transparent', label: t.bgRemoveTransparent, colorHex: 'transparent' },
    { id: 'blue_sky', label: t.bgRemoveBlue, colorHex: '#3b82f6' },
  ];

  const handleDownload = () => {
    if (!resultImage) return;
    const a = document.createElement('a');
    a.href = resultImage;
    a.download = `jong_use_${mode}_${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* 1. Mode Switcher */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChangeMode('upscale')}
          className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
            mode === 'upscale'
              ? 'border-emerald-600 bg-emerald-50/70 text-emerald-700 shadow-xs ring-2 ring-emerald-200'
              : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>{t.upscaleTitle}</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeMode('bgremove')}
          className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
            mode === 'bgremove'
              ? 'border-emerald-600 bg-emerald-50/70 text-emerald-700 shadow-xs ring-2 ring-emerald-200'
              : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>{t.bgRemoveTitle}</span>
        </button>
      </div>

      {/* 2. Mode Settings */}
      {mode === 'upscale' ? (
        <Card className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              {t.upscaleFactor}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['2x', '4x'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChangeScale(s)}
                  className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                    scale === s
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-stone-200 bg-white text-stone-600'
                  }`}
                >
                  {s} Super-Resolution
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
            <span className="text-xs font-medium text-stone-700 font-khmer">
              {t.upscaleFaceEnhance}
            </span>
            <input
              type="checkbox"
              checked={enhanceFaces}
              onChange={onToggleEnhanceFaces}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
            />
          </div>
        </Card>
      ) : (
        <Card className="space-y-3">
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
            {t.bgRemoveTargetColor}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {bgChoices.map((bg) => (
              <button
                key={bg.id}
                type="button"
                onClick={() => onChangeBgColor(bg.id)}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  bgColor === bg.id
                    ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-200'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div
                  className="w-5 h-5 rounded-md border border-stone-300 shadow-2xs"
                  style={{
                    backgroundColor: bg.colorHex,
                    backgroundImage:
                      bg.id === 'transparent'
                        ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                        : 'none',
                    backgroundSize: '8px 8px',
                  }}
                />
                <span className="text-[11px] font-khmer">{bg.label}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Action Button */}
      {!resultImage && (
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={onProcess}
          loading={loading}
          disabled={!inputImage}
          icon={mode === 'upscale' ? <ImageIcon className="w-4 h-4" /> : <Scissors className="w-4 h-4" />}
        >
          {mode === 'upscale' ? t.upscaleAction : t.bgRemoveAction}
        </Button>
      )}

      {/* Before / After Result View */}
      {resultImage && (
        <ResultPanel
          title={mode === 'upscale' ? t.upscaleTitle : t.bgRemoveTitle}
          lang={lang}
          onDownload={handleDownload}
          onReset={onReset}
          triggerConfetti={true}
        >
          <div className="space-y-4">
            <div className="relative aspect-4/3 rounded-xl overflow-hidden border border-stone-200 bg-stone-900 flex items-center justify-center select-none">
              {/* After image */}
              <img
                src={resultImage}
                alt="Enhanced Result"
                className="absolute inset-0 w-full h-full object-contain"
              />

              {/* Before image clip */}
              <div
                className="absolute inset-0 overflow-hidden border-r-2 border-white shadow-2xl"
                style={{ width: `${sliderPos}%` }}
              >
                <img
                  src={inputImage}
                  alt="Original Input"
                  className="absolute inset-0 w-full h-full object-contain max-w-none"
                  style={{ width: '100%', height: '100%' }}
                />
                <span className="absolute top-3 left-3 px-2 py-1 rounded bg-black/70 text-white text-[10px] font-bold">
                  Original
                </span>
              </div>

              <span className="absolute top-3 right-3 px-2 py-1 rounded bg-emerald-600/90 text-white text-[10px] font-bold shadow-xs">
                AI Enhanced
              </span>
            </div>

            {/* Slider comparison controller */}
            <div className="space-y-1">
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-ew-resize h-1.5 bg-stone-200 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[11px] text-stone-500 font-medium">
                <span>◀ Drag to compare Original</span>
                <span>Enhanced Result ▶</span>
              </div>
            </div>
          </div>
        </ResultPanel>
      )}
    </div>
  );
};
