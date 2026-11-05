import React, { useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { FileDropzone } from '../components/ui/FileDropzone';
import { OcrResultView } from '../components/tools/ocr/OcrResultView';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { processOcr } from '../lib/api';
import { Language, OcrResult } from '../types';
import { translations } from '../lib/i18n';
import { FileText, Languages, Check, ArrowRight } from 'lucide-react';

interface OcrPageProps {
  lang: Language;
  onLogActivity: (tool: 'ocr', title: string, summary?: string, previewUrl?: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  tokens?: number;
  onCheckAndDeductTokens?: (cost: number, tool: string, title: string, summary?: string) => Promise<boolean>;
}

export const OcrPage: React.FC<OcrPageProps> = ({
  lang,
  onLogActivity,
  showToast,
  tokens,
  onCheckAndDeductTokens,
}) => {
  const t = translations[lang];
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [translate, setTranslate] = useState(false);
  const [targetLang, setTargetLang] = useState('English');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OcrResult | null>(null);

  const handleRunOcr = async () => {
    if (!selectedImage) return;

    if (onCheckAndDeductTokens) {
      const allowed = await onCheckAndDeductTokens(
        5,
        'ocr',
        'OCR Text Extraction',
        translate ? `Translate to ${targetLang}` : 'Document Text Scan'
      );
      if (!allowed) return;
    }

    setLoading(true);
    try {
      const data = await processOcr({
        imageBase64: selectedImage,
        targetLang: translate ? targetLang : undefined,
        translate,
      });
      setResult(data);
      onLogActivity('ocr', `OCR Scan: ${data.detectedLanguage}`, data.summary || data.extractedText.slice(0, 80), selectedImage);
      showToast(lang === 'km' ? 'ស្រង់អត្ថបទដោយជោគជ័យ!' : 'OCR completed successfully!');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || t.errorOccurred, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setResult(null);
  };

  return (
    <PageContainer
      title={t.ocrTitle}
      subtitle={t.ocrDesc}
      icon={<FileText className="w-5 h-5" />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Upload & Config */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="space-y-4">
            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              {t.upload}
            </h3>
            <FileDropzone
              selectedImage={selectedImage}
              onImageSelected={(b64) => setSelectedImage(b64)}
              onClear={() => setSelectedImage(null)}
              lang={lang}
            />

            {/* Translation option switch */}
            <div className="pt-3 border-t border-stone-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-700 font-khmer cursor-pointer flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t.ocrTranslateToggle}</span>
                </label>
                <input
                  type="checkbox"
                  checked={translate}
                  onChange={(e) => setTranslate(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {translate && (
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                    {t.ocrTargetLang}
                  </label>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="English">English (អង់គ្លេស)</option>
                    <option value="Khmer">Khmer (ភាសាខ្មែរ)</option>
                    <option value="French">French (បារាំង)</option>
                    <option value="Chinese">Chinese (ចិន)</option>
                    <option value="Japanese">Japanese (ជប៉ុន)</option>
                  </select>
                </div>
              )}
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleRunOcr}
              loading={loading}
              disabled={!selectedImage}
              icon={<FileText className="w-4 h-4" />}
            >
              <span>{lang === 'km' ? 'ចាប់ផ្តើមអានអត្ថបទ (Start OCR)' : 'Extract Text'}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-800/80 text-emerald-100 font-bold ml-1">
                5 Tokens
              </span>
            </Button>
          </Card>
        </div>

        {/* Right column: Results or Skeleton state */}
        <div className="lg:col-span-7">
          {loading ? (
            <Card className="min-h-[420px] flex items-center justify-center">
              <Spinner
                size="lg"
                text={lang === 'km' ? 'កំពុងវិភាគ និងស្រង់អក្សរ...' : 'Analyzing document and extracting text...'}
              />
            </Card>
          ) : result ? (
            <OcrResultView result={result} lang={lang} onReset={handleReset} />
          ) : (
            <Card className="min-h-[420px] flex flex-col items-center justify-center text-center p-8 border-dashed bg-stone-50/50">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="font-bayon text-base text-stone-800 mb-1">
                {lang === 'km' ? 'រង់ចាំការផ្ទុករូបភាព' : 'Ready to scan'}
              </h4>
              <p className="text-xs text-stone-500 max-w-sm font-khmer">
                {lang === 'km'
                  ? 'សូមផ្ទុករូបភាព ឬឯកសារនៅផ្នែកខាងឆ្វេង ដើម្បីស្រង់អត្ថបទដោយស្វ័យប្រវត្ត'
                  : 'Upload an image or document on the left to extract clear verbatim text.'}
              </p>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
};
