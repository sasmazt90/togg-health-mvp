'use client';

import React from 'react';
import { SkinRegionData } from '../../data/skinDemoFixture';
import { SkinFacePanel } from './SkinFacePanel';
import { SkinRegionSummary } from './SkinRegionSummary';

interface SkinResultViewProps {
  currentRegion: SkinRegionData;
  onPrev: () => void;
  onNext: () => void;
  onOpenModal: (modal: 'trend' | 'observation' | 'actions') => void;
  onNavigateToCare: () => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
  isLiveVideo?: boolean;
}

export const SkinResultView: React.FC<SkinResultViewProps> = ({
  currentRegion,
  onPrev,
  onNext,
  onOpenModal,
  onNavigateToCare,
  videoRef,
  isLiveVideo = false
}) => {
  return (
    <div className="bg-[#0c1424]/90 border border-slate-800/90 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 w-full">
      {/* Üst Bilgi Satırı: Başlık, Dinamik Özet Cümlesi, Yasal Rozet */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/70 pb-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Cilt Analizi Tamamlandı
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            <span
              className={
                currentRegion.isAttentionRequired
                  ? 'text-amber-400 font-medium'
                  : 'text-togg-turquoise font-medium'
              }
            >
              {currentRegion.nameTr} bölgesinde
            </span>{' '}
            referansa göre{' '}
            <span
              className={
                currentRegion.isAttentionRequired
                  ? 'text-amber-400 font-bold font-mono'
                  : 'text-slate-100 font-semibold font-mono'
              }
            >
              %{Math.abs(currentRegion.changePct)}
            </span>{' '}
            görsel değişim gözlendi.
          </p>
        </div>

        <div>
          <span className="text-[11px] bg-slate-900/80 border border-slate-700/80 text-slate-400 px-3 py-1 rounded-full font-medium whitespace-nowrap">
            Ön değerlendirme • Tanı değildir
          </span>
        </div>
      </div>

      {/* İKİ KOLON ANA DÜZEN (FIRST VIEWPORT ONLY - NO PAGE SCROLL) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* SOL KOLON (~45%): Yüz Portresi + Karusel Okları + Organik Maske Vurgusu + İndikatör */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <SkinFacePanel
            currentRegion={currentRegion}
            mode="result"
            onPrev={onPrev}
            onNext={onNext}
            videoRef={videoRef}
            isLiveVideo={isLiveVideo}
          />
        </div>

        {/* SAĞ KOLON (~55%): Bölge Başlığı + 4 Metrik Çubuğu + 3 İkincil Buton + Ana CTA */}
        <div className="lg:col-span-7">
          <SkinRegionSummary
            currentRegion={currentRegion}
            onOpenModal={onOpenModal}
            onNavigateToCare={onNavigateToCare}
          />
        </div>
      </div>
    </div>
  );
};
