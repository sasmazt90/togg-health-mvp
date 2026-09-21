'use client';

import React from 'react';
import { SkinRegionData } from '../../data/skinDemoFixture';
import { SkinRegionOverlay } from './SkinRegionOverlay';
import { NavigationArrows, SkinRegionNavigator } from './SkinRegionNavigator';

interface SkinFacePanelProps {
  currentRegion: SkinRegionData;
  mode?: 'result' | 'scan' | 'start';
  scanProgress?: number;
  onPrev?: () => void;
  onNext?: () => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
  isLiveVideo?: boolean;
}

export const SkinFacePanel: React.FC<SkinFacePanelProps> = ({
  currentRegion,
  mode = 'result',
  scanProgress = 75,
  onPrev,
  onNext,
  videoRef,
  isLiveVideo = false
}) => {
  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Yüz Görselleştirici Konteyner */}
      <div className="relative w-full max-w-[320px] aspect-[3/3.8] rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-2xl select-none">
        {/* Canlı Video veya Sentetik Nötr Portre Fotoğrafı */}
        {isLiveVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover object-center filter brightness-[0.94] contrast-[1.02]"
          />
        ) : (
          <img
            src="/images/demo-skin-face.jpg"
            alt="Dermatolojik Yüz Taraması"
            className="w-full h-full object-cover object-center filter brightness-[0.93] contrast-[1.02]"
          />
        )}

        {/* Spektral Sinematik Karartma Katmanı */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-black/25 pointer-events-none" />

        {/* Anatomik ROI ve Biyometrik Maske Katmanı (Aynı Renderer) */}
        <SkinRegionOverlay
          region={currentRegion}
          mode={mode}
          scanProgress={scanProgress}
        />

        {/* Karusel Ok Butonları (< ve >) — Yalnızca Result Modunda */}
        {mode === 'result' && onPrev && onNext && (
          <NavigationArrows onPrev={onPrev} onNext={onNext} />
        )}
      </div>

      {/* Yüzün Altındaki Sayaç ve İndikatör (2 / 6 Sağ Yanak) */}
      {mode === 'result' && onPrev && onNext && (
        <SkinRegionNavigator
          currentRegion={currentRegion}
          onPrev={onPrev}
          onNext={onNext}
        />
      )}
    </div>
  );
};
