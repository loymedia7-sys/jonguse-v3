import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Check, Copy, Download, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { translations } from '../../lib/i18n';
import { Language } from '../../types';

interface ResultPanelProps {
  title?: string;
  lang?: Language;
  onCopy?: () => void;
  onDownload?: () => void;
  onReset?: () => void;
  copied?: boolean;
  triggerConfetti?: boolean;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({
  title,
  lang = 'km',
  onCopy,
  onDownload,
  onReset,
  copied = false,
  triggerConfetti = false,
  children,
  actions,
}) => {
  const t = translations[lang];

  useEffect(() => {
    if (triggerConfetti) {
      confetti({
        particleCount: 75,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#f59e0b', '#10b981', '#ec4899'],
      });
    }
  }, [triggerConfetti]);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-stone-800 text-sm">{title || t.recentActivity}</h3>
        </div>

        <div className="flex items-center gap-1.5">
          {onCopy && (
            <Button
              size="sm"
              variant={copied ? 'secondary' : 'outline'}
              onClick={onCopy}
              icon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copied ? t.copied : t.copyText}
            </Button>
          )}
          {onDownload && (
            <Button
              size="sm"
              variant="primary"
              onClick={onDownload}
              icon={<Download className="w-3.5 h-3.5" />}
            >
              {t.download}
            </Button>
          )}
          {onReset && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onReset}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              title={t.reset}
            >
              {t.reset}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">{children}</div>

      {actions && <div className="mt-4 pt-3 border-t border-stone-100">{actions}</div>}
    </div>
  );
};
