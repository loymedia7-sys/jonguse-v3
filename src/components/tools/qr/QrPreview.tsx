import React, { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { QrCodeConfig, Language } from '../../../types';
import { translations } from '../../../lib/i18n';
import { Button } from '../../ui/Button';
import { Download, QrCode } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QrPreviewProps {
  config: QrCodeConfig;
  lang: Language;
  onCheckAndDeductTokens?: (cost: number, tool: string, title: string, summary?: string) => Promise<boolean>;
  onLogActivity?: (tool: 'qr', title: string, summary?: string) => void;
}

export const QrPreview: React.FC<QrPreviewProps> = ({ config, lang, onCheckAndDeductTokens, onLogActivity }) => {
  const t = translations[lang];
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeInstance = useRef<QRCodeStyling | null>(null);

  // Compute final QR content
  const computeData = () => {
    if (config.type === 'wifi') {
      const ssid = config.wifiSsid || '';
      const pass = config.wifiPassword || '';
      const enc = config.wifiEncryption || 'WPA';
      return `WIFI:T:${enc};S:${ssid};P:${pass};;`;
    }
    if (config.type === 'url') {
      if (!config.content.startsWith('http://') && !config.content.startsWith('https://')) {
        return `https://${config.content}`;
      }
      return config.content;
    }
    return config.content || 'https://jonguse.app';
  };

  useEffect(() => {
    const data = computeData();

    if (!qrCodeInstance.current) {
      qrCodeInstance.current = new QRCodeStyling({
        width: 280,
        height: 280,
        type: 'canvas',
        data,
        image: config.logoUrl,
        dotsOptions: {
          color: config.fgColor,
          type: config.dotType,
        },
        backgroundOptions: {
          color: config.bgColor,
        },
        cornersSquareOptions: {
          color: config.fgColor,
          type: config.cornerSquareType,
        },
        cornersDotOptions: {
          color: config.fgColor,
        },
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: 6,
          imageSize: 0.35,
        },
      });

      if (qrRef.current) {
        qrRef.current.innerHTML = '';
        qrCodeInstance.current.append(qrRef.current);
      }
    } else {
      qrCodeInstance.current.update({
        data,
        image: config.logoUrl,
        dotsOptions: {
          color: config.fgColor,
          type: config.dotType,
        },
        backgroundOptions: {
          color: config.bgColor,
        },
        cornersSquareOptions: {
          color: config.fgColor,
          type: config.cornerSquareType,
        },
        cornersDotOptions: {
          color: config.fgColor,
        },
      });
    }
  }, [config]);

  const handleDownload = async (format: 'png' | 'svg' = 'png') => {
    if (onCheckAndDeductTokens) {
      const allowed = await onCheckAndDeductTokens(
        1,
        'qr',
        `Custom QR Code (${format.toUpperCase()})`,
        config.content ? config.content.slice(0, 40) : 'QR code export'
      );
      if (!allowed) return;
    }

    if (qrCodeInstance.current) {
      qrCodeInstance.current.download({
        name: `jong_use_qr_${Date.now()}`,
        extension: format,
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });

      onLogActivity?.('qr', `QR Code Download (${format.toUpperCase()})`, config.content);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 flex flex-col items-center justify-between h-full text-center">
      <div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <QrCode className="w-4 h-4 text-stone-700" />
          <h3 className="font-bold text-stone-800 text-sm">QR Code Preview</h3>
        </div>
        <p className="text-xs text-stone-500 mb-6">
          High-resolution vector-quality QR generated live
        </p>

        {/* QR Canvas Box */}
        <div
          className="p-4 rounded-2xl border border-stone-200 shadow-xs inline-flex items-center justify-center transition-all bg-white"
          style={{ backgroundColor: config.bgColor }}
        >
          <div ref={qrRef} className="rounded-lg overflow-hidden" />
        </div>
      </div>

      <div className="w-full mt-8 pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button
          variant="primary"
          size="md"
          className="w-full sm:w-auto flex items-center justify-center gap-1.5"
          onClick={() => handleDownload('png')}
          icon={<Download className="w-4 h-4" />}
        >
          <span>{t.download} PNG</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-800/80 text-emerald-100 font-bold ml-1">
            1 Token
          </span>
        </Button>
        <Button
          variant="outline"
          size="md"
          className="w-full sm:w-auto"
          onClick={() => handleDownload('svg')}
          icon={<Download className="w-4 h-4" />}
        >
          {t.download} SVG
        </Button>
      </div>
    </div>
  );
};
