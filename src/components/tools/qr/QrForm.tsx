import React, { useState } from 'react';
import { QrCodeConfig, Language } from '../../../types';
import { translations } from '../../../lib/i18n';
import { Link2, Wifi, AlignLeft, Palette, Image as ImageIcon, X } from 'lucide-react';
import { Card } from '../../ui/Card';

interface QrFormProps {
  config: QrCodeConfig;
  onChange: (config: QrCodeConfig) => void;
  lang: Language;
}

export const QrForm: React.FC<QrFormProps> = ({ config, onChange, lang }) => {
  const t = translations[lang];

  const presets = [
    { name: 'Emerald', fg: '#065f46', bg: '#f0fdf4' },
    { name: 'Midnight', fg: '#0f172a', bg: '#ffffff' },
    { name: 'Royal Indigo', fg: '#4338ca', bg: '#f8fafc' },
    { name: 'Crimson', fg: '#991b1b', bg: '#fef2f2' },
    { name: 'Deep Purple', fg: '#581c87', bg: '#faf5ff' },
  ];

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onChange({ ...config, logoUrl: reader.result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. QR Type Selector */}
      <div>
        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
          {t.qrType}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'url', label: 'URL / Link', icon: <Link2 className="w-4 h-4" /> },
            { id: 'wifi', label: 'Wi-Fi Network', icon: <Wifi className="w-4 h-4" /> },
            { id: 'text', label: 'Plain Text', icon: <AlignLeft className="w-4 h-4" /> },
          ].map((type) => {
            const isSelected = config.type === type.id;
            return (
              <button
                key={type.id}
                id={`qr-type-${type.id}`}
                type="button"
                onClick={() => onChange({ ...config, type: type.id as any })}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-emerald-50 hover:border-emerald-300'
                }`}
              >
                {type.icon}
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Content Input */}
      <Card className="space-y-4">
        {config.type === 'url' && (
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Website URL
            </label>
            <div className="relative">
              <input
                type="text"
                value={config.content}
                onChange={(e) => onChange({ ...config, content: e.target.value })}
                placeholder="https://example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>
        )}

        {config.type === 'text' && (
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              {t.qrContent}
            </label>
            <textarea
              rows={3}
              value={config.content}
              onChange={(e) => onChange({ ...config, content: e.target.value })}
              placeholder="Enter any text, address, message..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-khmer"
            />
          </div>
        )}

        {config.type === 'wifi' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t.qrWifiSsid}
              </label>
              <input
                type="text"
                value={config.wifiSsid || ''}
                onChange={(e) => onChange({ ...config, wifiSsid: e.target.value })}
                placeholder="Home_WiFi_5G"
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t.qrWifiPassword}
              </label>
              <input
                type="text"
                value={config.wifiPassword || ''}
                onChange={(e) => onChange({ ...config, wifiPassword: e.target.value })}
                placeholder="WiFi password..."
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t.qrWifiEncryption}
              </label>
              <select
                value={config.wifiEncryption || 'WPA'}
                onChange={(e) => onChange({ ...config, wifiEncryption: e.target.value as any })}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
              >
                <option value="WPA">WPA / WPA2 (Standard)</option>
                <option value="WEP">WEP (Older routers)</option>
                <option value="nopass">None (Open network)</option>
              </select>
            </div>
          </div>
        )}
      </Card>

      {/* 3. Style & Color Customization */}
      <Card className="space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
          <Palette className="w-4 h-4 text-emerald-600" />
          <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
            Custom Styles & Colors
          </h4>
        </div>

        {/* Color Presets */}
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-2">
            Color Palette
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {presets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => onChange({ ...config, fgColor: preset.fg, bgColor: preset.bg })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  config.fgColor === preset.fg
                    ? 'border-emerald-600 bg-emerald-600 text-white font-bold shadow-sm'
                    : 'border-stone-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-stone-700'
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-stone-300"
                  style={{ backgroundColor: preset.fg }}
                />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dot Style */}
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-2">
            {t.qrDotStyle}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['rounded', 'dots', 'classy-rounded', 'square', 'extra-rounded'] as const).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => onChange({ ...config, dotType: style })}
                className={`px-3 py-2 rounded-xl border text-xs font-medium capitalize transition-all cursor-pointer ${
                  config.dotType === style
                    ? 'border-emerald-600 bg-emerald-600 text-white font-bold shadow-sm'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-emerald-50 hover:border-emerald-300'
                }`}
              >
                {style.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Center Logo Upload */}
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-2">
            {t.qrLogo}
          </label>
          {config.logoUrl ? (
            <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50">
              <div className="flex items-center gap-3">
                <img
                  src={config.logoUrl}
                  alt="QR Logo"
                  className="w-10 h-10 rounded-lg object-contain bg-white border border-stone-200 p-1"
                />
                <span className="text-xs text-stone-600 font-medium">Custom logo attached</span>
              </div>
              <button
                type="button"
                onClick={() => onChange({ ...config, logoUrl: undefined })}
                className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-500 cursor-pointer"
                title="Remove logo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-stone-300 hover:border-emerald-500 bg-stone-50/50 hover:bg-emerald-50/40 cursor-pointer transition-all">
              <ImageIcon className="w-4 h-4 text-stone-400" />
              <span className="text-xs font-medium text-stone-600">Upload logo (PNG, JPG)</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </label>
          )}
        </div>
      </Card>
    </div>
  );
};
