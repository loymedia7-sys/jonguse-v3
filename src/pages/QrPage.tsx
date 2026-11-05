import React, { useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { QrForm } from '../components/tools/qr/QrForm';
import { QrPreview } from '../components/tools/qr/QrPreview';
import { QrCodeConfig, Language } from '../types';
import { translations } from '../lib/i18n';
import { QrCode } from 'lucide-react';

interface QrPageProps {
  lang: Language;
  onLogActivity: (tool: 'qr', title: string, summary?: string) => void;
  showToast?: (msg: string) => void;
  tokens?: number;
  onCheckAndDeductTokens?: (cost: number, tool: string, title: string, summary?: string) => Promise<boolean>;
}

export const QrPage: React.FC<QrPageProps> = ({
  lang,
  onLogActivity,
  onCheckAndDeductTokens,
}) => {
  const t = translations[lang];

  const [config, setConfig] = useState<QrCodeConfig>({
    type: 'url',
    content: 'https://jonguse.app',
    fgColor: '#0f172a',
    bgColor: '#ffffff',
    dotType: 'rounded',
    cornerSquareType: 'extra-rounded',
  });

  const handleConfigChange = (newConfig: QrCodeConfig) => {
    setConfig(newConfig);
  };

  return (
    <PageContainer
      title={t.qrTitle}
      subtitle={t.qrDesc}
      icon={<QrCode className="w-5 h-5" />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Form & Customizer */}
        <div className="lg:col-span-7">
          <QrForm config={config} onChange={handleConfigChange} lang={lang} />
        </div>

        {/* Right column: Sticky Live Preview */}
        <div className="lg:col-span-5 sticky top-24">
          <QrPreview
            config={config}
            lang={lang}
            onCheckAndDeductTokens={onCheckAndDeductTokens}
            onLogActivity={onLogActivity}
          />
        </div>
      </div>
    </PageContainer>
  );
};
