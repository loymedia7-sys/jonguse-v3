import React, { useState, useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { TtsForm } from '../components/tools/tts/TtsForm';
import { AudioPlayer } from '../components/tools/tts/AudioPlayer';
import { VoiceCloneModal } from '../components/tools/tts/VoiceCloneModal';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { generateTts } from '../lib/api';
import { Language, ClonedVoiceProfile } from '../types';
import { translations } from '../lib/i18n';
import { Volume2, Mic } from 'lucide-react';
import { KHMER_CLONED_VOICE_PRESETS } from '../data/clonedVoicePresets';
import { calculateTtsTokens } from '../data/plans';

const STORAGE_KEY = 'jonguse_cloned_voices';

interface TtsPageProps {
  lang: Language;
  onLogActivity: (tool: 'tts', title: string, summary?: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  tokens?: number;
  onCheckAndDeductTokens?: (cost: number, tool: string, title: string, summary?: string) => Promise<boolean>;
}

export const TtsPage: React.FC<TtsPageProps> = ({
  lang,
  onLogActivity,
  showToast,
  tokens,
  onCheckAndDeductTokens,
}) => {
  const t = translations[lang];
  const [text, setText] = useState(
    lang === 'km'
      ? 'សូមស្វាគមន៍មកកាន់ ចង់ប្រើ (Jong Use) — បណ្តុំឧបករណ៍ AI សម្រាប់ភាសាខ្មែរ ជាមួយមុខងារចម្លងសំឡេង (Voice Cloning) ដ៏ទំនើប!'
      : 'Welcome to Jong Use, the Khmer and English AI digital utility suite featuring AI Voice Cloning!'
  );
  
  // Voice selection states
  const [clonedVoices, setClonedVoices] = useState<ClonedVoiceProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: ClonedVoiceProfile[] = JSON.parse(saved);
        // Ensure presets are always included
        const userCustom = parsed.filter((p) => !p.isPreset);
        return [...userCustom, ...KHMER_CLONED_VOICE_PRESETS];
      }
    } catch {
      // ignore
    }
    return KHMER_CLONED_VOICE_PRESETS;
  });

  const [selectedCloneProfile, setSelectedCloneProfile] = useState<ClonedVoiceProfile | null>(
    KHMER_CLONED_VOICE_PRESETS[0] || null
  );
  const [voice, setVoice] = useState(KHMER_CLONED_VOICE_PRESETS[0]?.bestBaseVoice || 'Fenrir');

  // Generation state
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lastMeta, setLastMeta] = useState<{
    voiceName: string;
    isCloned: boolean;
    clonedProfile: ClonedVoiceProfile | null;
  }>({
    voiceName: KHMER_CLONED_VOICE_PRESETS[0]?.name || 'Fenrir',
    isCloned: true,
    clonedProfile: KHMER_CLONED_VOICE_PRESETS[0] || null,
  });

  // Voice clone modal state
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);

  const saveCustomClonesToStorage = (updated: ClonedVoiceProfile[]) => {
    try {
      const userCustom = updated.filter((p) => !p.isPreset);
      // Strip massive base64 blobs before saving to localStorage to prevent quota exceeded errors
      const lightweight = userCustom.map((item) => ({
        ...item,
        referenceAudioBase64: undefined,
        sampleAudioUrl:
          item.sampleAudioUrl && item.sampleAudioUrl.startsWith('data:') && item.sampleAudioUrl.length > 30000
            ? undefined
            : item.sampleAudioUrl,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweight));
    } catch (err) {
      console.warn('LocalStorage save notice for cloned voices:', err);
    }
  };

  const handleSaveProfile = (newProfile: ClonedVoiceProfile) => {
    const updated = [newProfile, ...clonedVoices.filter((v) => v.id !== newProfile.id)];
    setClonedVoices(updated);
    saveCustomClonesToStorage(updated);
    setSelectedCloneProfile(newProfile);
    setVoice(newProfile.bestBaseVoice);
    onLogActivity('tts', `Cloned Voice: ${newProfile.name}`, `Traits: ${newProfile.gender}, ${newProfile.pitch}, ${newProfile.timbre}`);
    showToast(
      lang === 'km'
        ? `បានរក្សាទុកសំឡេង "${newProfile.name}" រួចរាល់!`
        : `Cloned voice profile "${newProfile.name}" saved!`,
      'success'
    );
  };

  const handleDeleteCloneVoice = (id: string) => {
    const updated = clonedVoices.filter((v) => v.id !== id);
    setClonedVoices(updated);
    saveCustomClonesToStorage(updated);
    if (selectedCloneProfile?.id === id) {
      const fallback = updated[0] || null;
      setSelectedCloneProfile(fallback);
      if (fallback) setVoice(fallback.bestBaseVoice);
    }
    showToast(lang === 'km' ? 'បានលុបសំឡេងចម្លង' : 'Deleted cloned voice', 'success');
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;

    const estimate = calculateTtsTokens(text, lang === 'km');

    if (onCheckAndDeductTokens) {
      const isCloned = !!selectedCloneProfile;
      const displayVoiceName = selectedCloneProfile
        ? (lang === 'km' && selectedCloneProfile.nameKm ? selectedCloneProfile.nameKm : selectedCloneProfile.name)
        : voice;
      const allowed = await onCheckAndDeductTokens(
        estimate.tokens,
        'tts',
        isCloned
          ? `Khmer TTS Cloned (${displayVoiceName} - ${estimate.chars} chars)`
          : `Khmer TTS (${voice} - ${estimate.chars} chars)`,
        `${estimate.chars} chars, ${estimate.words} words • ${estimate.tierDescription}`
      );
      if (!allowed) return;
    }

    setLoading(true);
    try {
      const isCloned = !!selectedCloneProfile;
      const data = await generateTts(
        text,
        lang,
        voice,
        selectedCloneProfile || undefined
      );

      setAudioUrl(data.audioBase64);
      const displayVoiceName = selectedCloneProfile
        ? (lang === 'km' && selectedCloneProfile.nameKm ? selectedCloneProfile.nameKm : selectedCloneProfile.name)
        : voice;

      setLastMeta({
        voiceName: displayVoiceName,
        isCloned,
        clonedProfile: selectedCloneProfile,
      });

      onLogActivity(
        'tts',
        isCloned ? `TTS Cloned (${displayVoiceName})` : `TTS Audio (${voice})`,
        text.slice(0, 80)
      );
      showToast(lang === 'km' ? 'បានបង្កើតសំឡេងជោគជ័យ!' : 'Audio generated successfully!');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || t.errorOccurred, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title={t.ttsTitle}
      subtitle={t.ttsDesc}
      icon={<Volume2 className="w-5 h-5" />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form */}
        <div className="lg:col-span-7">
          <TtsForm
            text={text}
            onChangeText={setText}
            voice={voice}
            onChangeVoice={setVoice}
            clonedVoices={clonedVoices}
            selectedCloneProfile={selectedCloneProfile}
            onSelectCloneProfile={setSelectedCloneProfile}
            onOpenCloneModal={() => setIsCloneModalOpen(true)}
            onDeleteCloneVoice={handleDeleteCloneVoice}
            lang={lang}
            onGenerate={handleGenerate}
            loading={loading}
          />
        </div>

        {/* Right Column: Audio Player / Result */}
        <div className="lg:col-span-5 sticky top-24">
          {loading ? (
            <Card className="min-h-[340px] flex items-center justify-center">
              <Spinner
                size="lg"
                text={
                  selectedCloneProfile
                    ? (lang === 'km'
                        ? `កំពុងសំយោគសំឡេងចម្លង "${selectedCloneProfile.name.slice(0, 25)}"...`
                        : `Synthesizing speech with cloned voice profile "${selectedCloneProfile.name.slice(0, 25)}"...`)
                    : (lang === 'km'
                        ? 'កំពុងសំយោគសំឡេងអានបែបធម្មជាតិ...'
                        : 'Generating natural speech audio...')
                }
              />
            </Card>
          ) : audioUrl ? (
            <AudioPlayer
              audioUrl={audioUrl}
              lang={lang}
              textSnippet={text}
              voiceName={lastMeta.voiceName}
              isCloned={lastMeta.isCloned}
              clonedProfile={lastMeta.clonedProfile}
            />
          ) : (
            <Card className="min-h-[340px] flex flex-col items-center justify-center text-center p-8 border-dashed bg-stone-50/50 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Volume2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bayon text-base text-stone-800 mb-1">
                  {lang === 'km' ? 'សំឡេងអានត្រៀមជាស្រេច' : 'AI Speech & Voice Clone'}
                </h4>
                <p className="text-xs text-stone-500 max-w-xs font-khmer leading-relaxed">
                  {lang === 'km'
                    ? 'ជ្រើសរើសសំឡេងចម្លង ឬចុច "ចម្លងសំឡេងថ្មី" ដើម្បីថតសំឡេងផ្ទាល់ខ្លួន រួចចុចបង្កើតសំឡេង!'
                    : 'Choose a cloned voice or click "Clone New Voice" to record your own voice, then click generate!'}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsCloneModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-khmer text-xs font-bold flex items-center gap-2 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <Mic className="w-4 h-4" />
                  {t.ttsCloneBtn}
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Voice Clone Modal */}
      <VoiceCloneModal
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        onSaveProfile={handleSaveProfile}
        lang={lang}
        showToast={showToast}
      />
    </PageContainer>
  );
};
