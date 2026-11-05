import React, { useState } from 'react';
import { Language, ClonedVoiceProfile } from '../../../types';
import { translations } from '../../../lib/i18n';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { calculateTtsTokens } from '../../../data/plans';
import {
  Volume2,
  Mic2,
  Play,
  Trash2,
  Plus,
  Sliders,
  CheckCircle2,
  Radio,
  AudioWaveform,
  AudioLines,
  Zap,
} from 'lucide-react';

interface TtsFormProps {
  text: string;
  onChangeText: (text: string) => void;
  voice: string;
  onChangeVoice: (voice: string) => void;
  clonedVoices: ClonedVoiceProfile[];
  selectedCloneProfile: ClonedVoiceProfile | null;
  onSelectCloneProfile: (profile: ClonedVoiceProfile | null) => void;
  onOpenCloneModal: () => void;
  onDeleteCloneVoice: (id: string) => void;
  lang: Language;
  onGenerate: () => void;
  loading: boolean;
}

export const TtsForm: React.FC<TtsFormProps> = ({
  text,
  onChangeText,
  voice,
  onChangeVoice,
  clonedVoices,
  selectedCloneProfile,
  onSelectCloneProfile,
  onOpenCloneModal,
  onDeleteCloneVoice,
  lang,
  onGenerate,
  loading,
}) => {
  const t = translations[lang];
  const [activeVoiceTab, setActiveVoiceTab] = useState<'cloned' | 'standard'>('cloned');
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);
  const audioSampleRef = React.useRef<HTMLAudioElement | null>(null);

  const samplePhrases = [
    {
      labelKm: 'ស្វាគមន៍មកកាន់កម្ពុជា',
      textKm: 'សូមស្វាគមន៍មកកាន់ប្រទេសកម្ពុជា ទឹកដីនៃប្រាសាទអង្គរវត្ត និងវប្បធម៌ដ៏រុងរឿង!',
      labelEn: 'Welcome to Cambodia',
      textEn: 'Welcome to Cambodia, the Kingdom of Wonder and rich cultural heritage!',
    },
    {
      labelKm: 'សួស្តីពេលព្រឹក',
      textKm: 'អរុណសួស្តី! សូមជូនពរឱ្យថ្ងៃនេះជាថ្ងៃដ៏ស្រស់បំព្រង និងពោរពេញដោយភាពជោគជ័យ។',
      labelEn: 'Good morning greeting',
      textEn: 'Good morning! Wishing you a wonderful, productive, and cheerful day ahead.',
    },
    {
      labelKm: 'សុភាសិតខ្មែរ',
      textKm: 'ចេះដប់មិនស្មើប្រសប់មួយ ចេះច្បាស់មិនស្មើអនុវត្តជាក់ស្តែង។',
      labelEn: 'Inspiring thought',
      textEn: 'Knowledge is power, but practice and dedication bring true mastery.',
    },
  ];

  const standardVoices = [
    { id: 'Kore', name: 'Kore (Warm & Natural)', nameKm: 'សំឡេងនារីរាក់ទាក់ (ធម្មជាតិ)', gender: 'Female' },
    { id: 'Puck', name: 'Puck (Lively & Clear)', nameKm: 'សំឡេងយុវជន (រហ័សរហួន)', gender: 'Male' },
    { id: 'Zephyr', name: 'Zephyr (Smooth & Friendly)', nameKm: 'សំឡេងនារីស្រទន់ (ពិរោះស្រទន់)', gender: 'Female' },
    { id: 'Fenrir', name: 'Fenrir (Deep & Authoritative)', nameKm: 'សំឡេងបុរសព័ត៌មាន (ផ្លូវការ)', gender: 'Male' },
    { id: 'Charon', name: 'Charon (Calm & Mature)', nameKm: 'សំឡេងបុរសចាស់ទុំ (ស្ងប់ស្ងាត់)', gender: 'Male' },
  ];

  const handlePlaySample = (id: string, url?: string) => {
    if (!url) return;
    if (audioSampleRef.current) {
      audioSampleRef.current.pause();
    }
    if (playingSampleId === id) {
      setPlayingSampleId(null);
      return;
    }
    audioSampleRef.current = new Audio(url);
    audioSampleRef.current.onended = () => setPlayingSampleId(null);
    audioSampleRef.current.play();
    setPlayingSampleId(id);
  };

  const isKhmer = lang === 'km';
  const tokenEstimate = calculateTtsTokens(text, isKhmer);

  return (
    <div className="space-y-6">
      {/* 1. Text Input Card */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5 font-khmer">
            <Volume2 className="w-4 h-4 text-emerald-600" />
            {t.ttsTitle}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 font-khmer">
              {tokenEstimate.chars} {isKhmer ? 'តួអក្សរ' : 'chars'} • {tokenEstimate.words} {isKhmer ? 'ពាក្យ' : 'words'}
            </span>
            <span
              className={`text-xs font-mono px-2.5 py-0.5 rounded-full font-bold transition-all ${
                tokenEstimate.isOverBase
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              }`}
            >
              {tokenEstimate.tokens} Tokens
            </span>
          </div>
        </div>

        <textarea
          rows={5}
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={t.ttsInputPlaceholder}
          className="w-full p-4 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-khmer text-sm leading-relaxed"
        />

        {/* Dynamic length warning / notification when text exceeds 200 chars */}
        {tokenEstimate.isOverBase && (
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-khmer">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-bold">
                {isKhmer ? 'អត្ថបទលើសពី 200 តួអក្សរ:' : 'Text exceeds 200 chars:'}
              </span>
              <span>
                {isKhmer
                  ? `គណនា ${tokenEstimate.tokens} Tokens (+8 Tokens រាល់ 200 តួអក្សរបន្ថែម)`
                  : `Calculated ${tokenEstimate.tokens} Tokens (+8 per 200 additional characters)`}
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-amber-200/90 text-amber-950 px-2 py-0.5 rounded-md shrink-0 ml-2">
              {tokenEstimate.tierDescription}
            </span>
          </div>
        )}

        {/* Sample phrases */}
        <div>
          <span className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
            {t.ttsSamplePhrases}:
          </span>
          <div className="flex flex-wrap gap-2">
            {samplePhrases.map((phrase, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onChangeText(lang === 'km' ? phrase.textKm : phrase.textEn)}
                className="px-2.5 py-1 rounded-lg border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-200 text-stone-700 hover:text-emerald-700 text-xs font-khmer transition-all"
              >
                {lang === 'km' ? phrase.labelKm : phrase.labelEn}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* 2. Voice Selection Card */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Mic2 className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              {t.ttsVoice}
            </h4>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={onOpenCloneModal}
            className="border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-700 font-khmer text-xs"
            icon={<Plus className="w-3.5 h-3.5 text-emerald-600" />}
          >
            {t.ttsCloneBtn}
          </Button>
        </div>

        {/* Voice Selection Tabs: Cloned vs Standard */}
        <div className="flex p-1 bg-stone-100 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setActiveVoiceTab('cloned')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold font-khmer flex items-center justify-center gap-1.5 transition-all ${
              activeVoiceTab === 'cloned'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <AudioLines className="w-3.5 h-3.5 text-emerald-600" />
            {t.ttsTabClonedVoices} ({clonedVoices.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveVoiceTab('standard');
              onSelectCloneProfile(null);
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold font-khmer flex items-center justify-center gap-1.5 transition-all ${
              activeVoiceTab === 'standard'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 text-stone-500" />
            {t.ttsTabStandardVoices} ({standardVoices.length})
          </button>
        </div>

        {/* TAB 1: CLONED VOICES */}
        {activeVoiceTab === 'cloned' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {clonedVoices.map((cv) => {
                const isSelected = selectedCloneProfile?.id === cv.id;
                return (
                  <div
                    key={cv.id}
                    onClick={() => {
                      onSelectCloneProfile(cv);
                      onChangeVoice(cv.bestBaseVoice);
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold ring-2 ring-emerald-200'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold font-khmer line-clamp-1">
                            {lang === 'km' && cv.nameKm ? cv.nameKm : cv.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-stone-400 font-khmer">
                            {cv.isPreset ? 'AI Khmer Preset' : 'សំឡេងចម្លងផ្ទាល់ខ្លួន'}
                          </span>
                          <span className="text-[9px] font-mono font-bold px-1 rounded bg-purple-100 text-purple-800 border border-purple-200">
                            VoxCPM2
                          </span>
                          {cv.referenceTranscript && (
                            <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200" title="Transcript conditioned">
                              +Text
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        cv.gender === 'Female' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {cv.gender}
                      </span>
                    </div>

                    {/* Acoustic traits pills */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-mono">
                        Pitch: {cv.pitch}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-mono truncate max-w-[90px]">
                        {cv.timbre}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-mono">
                        Pace: {cv.pace}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-stone-100/80">
                      {cv.sampleAudioUrl ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlaySample(cv.id, cv.sampleAudioUrl);
                          }}
                          className="text-[10px] text-emerald-600 hover:text-emerald-800 flex items-center gap-1 font-khmer"
                        >
                          <Play className="w-3 h-3" />
                          {playingSampleId === cv.id ? 'កំពុងចាក់...' : 'ស្តាប់គំរូ'}
                        </button>
                      ) : (
                        <span className="text-[10px] text-stone-400 font-mono">
                          Base: {cv.bestBaseVoice}
                        </span>
                      )}

                      {!cv.isPreset && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCloneVoice(cv.id);
                          }}
                          className="text-stone-400 hover:text-red-500 p-1 rounded transition-colors"
                          title={t.ttsDeleteClone}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Banner when a cloned voice is active */}
            {selectedCloneProfile && (
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      សំឡេងចម្លងសកម្ម៖ {lang === 'km' && selectedCloneProfile.nameKm ? selectedCloneProfile.nameKm : selectedCloneProfile.name}
                    </span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono">
                    Base: {selectedCloneProfile.bestBaseVoice}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/80 font-khmer leading-relaxed">
                  {selectedCloneProfile.prosodyInstructions}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STANDARD VOICES */}
        {activeVoiceTab === 'standard' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {standardVoices.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  onChangeVoice(v.id);
                  onSelectCloneProfile(null);
                }}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  voice === v.id && !selectedCloneProfile
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold ring-2 ring-emerald-200'
                    : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold font-khmer">
                    {lang === 'km' && v.nameKm ? v.nameKm : v.name}
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    Base: {v.id}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">
                  {v.gender}
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Generate button */}
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={onGenerate}
        loading={loading}
        disabled={!text.trim()}
        icon={<Volume2 className="w-4 h-4" />}
      >
        <span className="flex items-center justify-center gap-2">
          <span>
            {selectedCloneProfile
              ? `បង្កើតសំឡេងចម្លង (${selectedCloneProfile.name.slice(0, 20)})`
              : t.ttsGenerate}
          </span>
          <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-800/80 text-emerald-100 ml-1 shadow-xs">
            {tokenEstimate.tokens} Tokens
          </span>
        </span>
      </Button>
    </div>
  );
};
