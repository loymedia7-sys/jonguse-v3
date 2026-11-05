import React from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Language, UsageLogItem } from '../types';
import { translations } from '../lib/i18n';
import { History, Trash2, FileText, QrCode, Volume2, Clock, FileCode, Video } from 'lucide-react';

interface HistoryPageProps {
  lang: Language;
  logs: UsageLogItem[];
  onClearHistory: () => void;
  onNavigate: (tool: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  lang,
  logs,
  onClearHistory,
  onNavigate,
}) => {
  const t = translations[lang];

  const getToolIcon = (tool: string) => {
    switch (tool) {
      case 'srt':
        return <FileCode className="w-4 h-4 text-amber-600" />;
      case 'videostyle':
        return <Video className="w-4 h-4 text-rose-600" />;
      case 'ocr':
        return <FileText className="w-4 h-4 text-emerald-600" />;
      case 'qr':
        return <QrCode className="w-4 h-4 text-emerald-600" />;
      case 'tts':
        return <Volume2 className="w-4 h-4 text-emerald-600" />;
      default:
        return <Clock className="w-4 h-4 text-stone-600" />;
    }
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString();
  };

  return (
    <PageContainer
      title={t.recentActivity}
      subtitle={lang === 'km' ? 'ប្រវត្តិការប្រើប្រាស់ឧបករណ៍ AI ក្នុងឧបករណ៍របស់អ្នក' : 'Your recent sessions and generated outputs'}
      icon={<History className="w-5 h-5" />}
    >
      <div className="space-y-6">
        {logs.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-500 font-mono">
              {logs.length} items logged
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={onClearHistory}
              icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
            >
              {t.clearHistory}
            </Button>
          </div>
        )}

        {logs.length === 0 ? (
          <Card className="min-h-[280px] flex flex-col items-center justify-center text-center p-8 border-dashed bg-stone-50/50">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mb-3">
              <History className="w-6 h-6" />
            </div>
            <h4 className="font-bayon text-base text-stone-800 mb-1">
              {t.noHistory}
            </h4>
            <p className="text-xs text-stone-500 max-w-xs font-khmer">
              {lang === 'km'
                ? 'នៅពេលអ្នកប្រើប្រាស់ OCR, QR Code, រូបថត ID ឬសំឡេង TTS វានឹងបង្ហាញនៅទីនេះ'
                : 'Whenever you generate results with OCR, QR codes, or ID photos, they will appear here.'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {logs.map((item) => (
              <Card key={item.id} className="p-4 flex items-start gap-3 hover:border-stone-300">
                <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                  {getToolIcon(item.tool)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-stone-900 truncate">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(item.timestamp)}
                    </span>
                  </div>

                  {item.summary && (
                    <p className="text-xs text-stone-600 font-khmer line-clamp-2 mb-2">
                      {item.summary}
                    </p>
                  )}

                  {item.previewUrl && (
                    <div className="w-14 h-14 rounded-lg overflow-hidden border border-stone-200 bg-stone-100 mb-2">
                      <img
                        src={item.previewUrl}
                        alt="Preview thumbnail"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onNavigate(item.tool)}
                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    Open {item.tool.toUpperCase()} →
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
};
