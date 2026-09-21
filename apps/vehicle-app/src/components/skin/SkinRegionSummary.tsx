'use client';

import React from 'react';
import { TrendingUp, FileText, Lightbulb, ArrowRight } from 'lucide-react';
import { SkinRegionData } from '../../data/skinDemoFixture';

interface SkinRegionSummaryProps {
  currentRegion: SkinRegionData;
  onOpenModal: (modal: 'trend' | 'observation' | 'actions') => void;
  onNavigateToCare: () => void;
}

export const SkinRegionSummary: React.FC<SkinRegionSummaryProps> = ({
  currentRegion,
  onOpenModal,
  onNavigateToCare
}) => {
  const { metrics } = currentRegion;

  return (
    <div className="space-y-5 w-full">
      {/* Bölge Başlığı ve Rozet */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white tracking-wide">
            {currentRegion.nameTr}
          </h3>
          <span
            className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
              currentRegion.isAttentionRequired
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {currentRegion.badgeText}
          </span>
        </div>

        {/* 4 Gerçek Engine Metriği Göstergeleri */}
        <div className="space-y-2.5">
          {/* 1. Kızarıklık Eğilimi */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">{metrics.redness.label}</span>
              <span
                className={`font-mono font-bold ${
                  metrics.redness.status === 'amber'
                    ? 'text-amber-400'
                    : 'text-slate-300'
                }`}
              >
                {metrics.redness.displayValue}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  metrics.redness.status === 'amber'
                    ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                    : 'bg-togg-turquoise'
                }`}
                style={{ width: `${metrics.redness.score}%` }}
              />
            </div>
          </div>

          {/* 2. Ton / Parlaklık */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">{metrics.luminance.label}</span>
              <span className="text-sky-400 font-semibold font-mono">
                {metrics.luminance.displayValue}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-sky-400 rounded-full transition-all duration-300"
                style={{ width: `${metrics.luminance.score}%` }}
              />
            </div>
          </div>

          {/* 3. Doku Değişimi */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">{metrics.texture.label}</span>
              <span className="text-togg-turquoise font-semibold font-mono">
                {metrics.texture.displayValue}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-togg-turquoise rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(0,229,255,0.4)]"
                style={{ width: `${metrics.texture.score}%` }}
              />
            </div>
          </div>

          {/* 4. Referansa Göre Değişim */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">{metrics.baselineChange.label}</span>
              <span
                className={`font-semibold font-mono ${
                  metrics.baselineChange.status === 'amber'
                    ? 'text-amber-400 font-bold'
                    : 'text-emerald-400'
                }`}
              >
                {metrics.baselineChange.displayValue}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  metrics.baselineChange.status === 'amber'
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
                style={{ width: `${metrics.baselineChange.score}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3 İkincil Eylem Butonu */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        <button
          onClick={() => onOpenModal('trend')}
          className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-togg-turquoise/10 border border-togg-turquoise/20 flex items-center justify-center text-togg-turquoise group-hover:scale-110 transition-transform">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-slate-300 group-hover:text-white leading-tight">
            Zaman İçinde<br />Değişim
          </span>
        </button>

        <button
          onClick={() => onOpenModal('observation')}
          className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-togg-turquoise/10 border border-togg-turquoise/20 flex items-center justify-center text-togg-turquoise group-hover:scale-110 transition-transform">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-slate-300 group-hover:text-white leading-tight">
            Gözlem Notu
          </span>
        </button>

        <button
          onClick={() => onOpenModal('actions')}
          className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-togg-turquoise/10 border border-togg-turquoise/20 flex items-center justify-center text-togg-turquoise group-hover:scale-110 transition-transform">
            <Lightbulb className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-slate-300 group-hover:text-white leading-tight">
            Önerilen<br />Aksiyonlar
          </span>
        </button>
      </div>

      {/* Büyük Turkuaz Ana CTA Butonu */}
      <div className="pt-1">
        <button
          onClick={onNavigateToCare}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-[#00d2eb] hover:bg-[#00e5ff] text-slate-950 font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(0,210,235,0.35)] hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
        >
          <span>Uzman Seçeneklerini Gör</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
