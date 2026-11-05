import React, { useState } from 'react';
import { OcrResult, Language } from '../../../types';
import { translations } from '../../../lib/i18n';
import { ResultPanel } from '../../ui/ResultPanel';
import { BadgeCheck, Globe2, FileText, Check, Copy } from 'lucide-react';
import { Button } from '../../ui/Button';

interface OcrResultViewProps {
  result: OcrResult;
  lang: Language;
  onReset: () => void;
}

export const OcrResultView: React.FC<OcrResultViewProps> = ({ result, lang, onReset }) => {
  const t = translations[lang];
  const [copiedExtracted, setCopiedExtracted] = useState(false);
  const [copiedTranslated, setCopiedTranslated] = useState(false);

  const handleCopyExtracted = () => {
    navigator.clipboard.writeText(result.extractedText);
    setCopiedExtracted(true);
    setTimeout(() => setCopiedExtracted(false), 2500);
  };

  const handleCopyTranslated = () => {
    if (result.translatedText) {
      navigator.clipboard.writeText(result.translatedText);
      setCopiedTranslated(true);
      setTimeout(() => setCopiedTranslated(false), 2500);
    }
  };

  const handleDownloadText = () => {
    const textToDownload = result.translatedText
      ? `=== EXTRACTED OCR TEXT (${result.detectedLanguage}) ===\n\n${result.extractedText}\n\n=== TRANSLATION ===\n\n${result.translatedText}`
      : result.extractedText;

    const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jong_use_ocr_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ResultPanel
      title={t.ocrTitle}
      lang={lang}
      onDownload={handleDownloadText}
      onReset={onReset}
      triggerConfetti={true}
    >
      <div className="space-y-4">
        {/* Metadata stats */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 font-medium">
            <Globe2 className="w-3.5 h-3.5" />
            <span>{t.ocrDetectedLang}: <strong>{result.detectedLanguage}</strong></span>
          </div>

          {result.confidence && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 font-medium">
              <BadgeCheck className="w-3.5 h-3.5" />
              <span>{t.ocrConfidence}: {result.confidence}</span>
            </div>
          )}

          {result.summary && (
            <span className="text-stone-500 italic">
              • {result.summary}
            </span>
          )}
        </div>

        {/* Extracted Text Box */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              {t.ocrExtractedLabel}
            </h4>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyExtracted}
              icon={copiedExtracted ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copiedExtracted ? t.copied : t.copyText}
            </Button>
          </div>
          <div className="font-khmer text-sm text-stone-800 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto select-all pr-2">
            {result.extractedText}
          </div>
        </div>

        {/* Translated Text Box if present */}
        {result.translatedText && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-amber-600" />
                {t.ocrTranslatedLabel}
              </h4>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyTranslated}
                icon={copiedTranslated ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copiedTranslated ? t.copied : t.copyText}
              </Button>
            </div>
            <div className="font-khmer text-sm text-stone-800 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto select-all pr-2">
              {result.translatedText}
            </div>
          </div>
        )}
      </div>
    </ResultPanel>
  );
};
