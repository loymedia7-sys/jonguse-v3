import React, { useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { FileDropzone } from '../components/ui/FileDropzone';
import { AttireSelector } from '../components/tools/idphoto/AttireSelector';
import { IdPhotoResult } from '../components/tools/idphoto/IdPhotoResult';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { generateIdPhoto } from '../lib/api';
import { processClientStudioPhoto } from '../lib/studioPhoto';
import { Language } from '../types';
import { translations } from '../lib/i18n';
import { UserCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface IdPhotoPageProps {
  lang: Language;
  onLogActivity: (tool: 'idphoto', title: string, summary?: string, previewUrl?: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const IdPhotoPage: React.FC<IdPhotoPageProps> = ({
  lang,
  onLogActivity,
  showToast,
}) => {
  const t = translations[lang];
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [attire, setAttire] = useState('suit_black');
  const [bgColor, setBgColor] = useState('blue_sky');
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [quotaNotice, setQuotaNotice] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedImage) return;
    setLoading(true);
    setQuotaNotice(null);

    try {
      // Try Gemini AI image generation
      const data = await generateIdPhoto({
        imageBase64: selectedImage,
        attire,
        bgColor,
      });
      setResultImage(data.imageUrl);
      onLogActivity('idphoto', 'Passport / ID Photo', `Attire: ${attire}, BG: ${bgColor}`, data.imageUrl);
      showToast(lang === 'km' ? 'បានកាត់រូបថតផ្លូវការជោគជ័យ!' : 'ID Photo generated successfully!');
    } catch (err: any) {
      console.warn('AI generation failed, generating instant studio portrait fallback:', err);
      try {
        const fallbackUrl = await processClientStudioPhoto({
          imageBase64: selectedImage,
          bgColor,
        });
        setResultImage(fallbackUrl);
        onLogActivity('idphoto', 'Passport Studio Photo', `Backdrop: ${bgColor}`, fallbackUrl);
        setQuotaNotice(
          lang === 'km'
            ? 'រូបថតត្រូវបានរៀបចំតាមស្តង់ដារ 3x4 / Passport Studio ដោយជោគជ័យ'
            : 'Generated in Passport Studio Mode (3x4 official framing & studio backdrop)'
        );
        showToast(
          lang === 'km'
            ? 'បានបង្កើតរូបថត Studio ID Photo រួចរាល់!'
            : 'Studio ID Photo ready!'
        );
      } catch (fallbackErr: any) {
        showToast(err.message || t.errorOccurred, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setResultImage(null);
    setQuotaNotice(null);
  };

  return (
    <PageContainer
      title={t.idPhotoTitle}
      subtitle={t.idPhotoDesc}
      icon={<UserCheck className="w-5 h-5" />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Photo Upload & Attire/BG Selectors */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="space-y-4">
            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              {t.upload} (Portrait / Headshot)
            </h3>
            <FileDropzone
              selectedImage={selectedImage}
              onImageSelected={(b64) => {
                setSelectedImage(b64);
                setQuotaNotice(null);
              }}
              onClear={() => {
                setSelectedImage(null);
                setResultImage(null);
                setQuotaNotice(null);
              }}
              lang={lang}
              title={lang === 'km' ? 'ផ្ទុករូបថតមុខត្រង់ ឬថតរូបភ្លាមៗ' : 'Upload portrait photo or take snapshot'}
              subtitle={lang === 'km' ? 'ថតមុខត្រង់ ច្បាស់ល្អ ដើម្បីទទួលបានគុណភាពខ្ពស់' : 'For best results, look straight into camera with good lighting'}
            />
          </Card>

          <AttireSelector
            selectedAttire={attire}
            onSelectAttire={setAttire}
            selectedBg={bgColor}
            onSelectBg={setBgColor}
            lang={lang}
          />

          <Button
            variant="primary"
            size="lg"
            className="w-full shadow-md"
            onClick={handleGenerate}
            loading={loading}
            disabled={!selectedImage}
            icon={<UserCheck className="w-4 h-4" />}
          >
            {t.idPhotoGenerate}
          </Button>
        </div>

        {/* Right Column: Result or Instructions */}
        <div className="lg:col-span-6 space-y-4">
          {quotaNotice && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{quotaNotice}</span>
            </div>
          )}

          {loading ? (
            <Card className="min-h-[480px] flex items-center justify-center">
              <Spinner
                size="lg"
                text={
                  lang === 'km'
                    ? 'AI កំពុងរៀបចំ និងប្តូរពណ៌ផ្ទៃក្រោយផ្លូវការ...'
                    : 'Formatting passport headshot and studio backdrop...'
                }
              />
            </Card>
          ) : resultImage ? (
            <IdPhotoResult imageUrl={resultImage} lang={lang} onReset={handleReset} />
          ) : (
            <Card className="min-h-[480px] flex flex-col items-center justify-center text-center p-8 border-dashed bg-stone-50/50">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <UserCheck className="w-8 h-8" />
              </div>
              <h4 className="font-bayon text-base text-stone-800 mb-1">
                {lang === 'km' ? 'រូបថតផ្លូវការត្រៀមរួចជាស្រេច' : 'Studio ID Photo Studio'}
              </h4>
              <p className="text-xs text-stone-500 max-w-sm font-khmer mb-4">
                {lang === 'km'
                  ? 'ជ្រើសរើសរូបថត និងម៉ូដអាវធំផ្លូវការនៅខាងឆ្វេង ដើម្បីបង្កើតរូបថត 3x4 / 4x6 សម្រាប់លិខិតឆ្លងដែន'
                  : 'Upload a portrait on the left and select your preferred attire and backdrop color.'}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-stone-400 font-medium bg-white px-3 py-1.5 rounded-xl border border-stone-200">
                <span>✓ 3x4 cm</span>
                <span>•</span>
                <span>✓ 4x6 cm</span>
                <span>•</span>
                <span>✓ 2x2 inch Passport</span>
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
};
