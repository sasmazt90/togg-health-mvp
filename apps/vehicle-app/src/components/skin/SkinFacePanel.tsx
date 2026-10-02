'use client';

import React, { useState } from 'react';
import { SkinRegionData } from '../../data/skinDemoFixture';
import { SkinRegionOverlay } from './SkinRegionOverlay';
import { NavigationArrows, SkinRegionNavigator } from './SkinRegionNavigator';

interface SkinFacePanelProps {
  currentRegion: SkinRegionData;
  mode?: 'result' | 'scan' | 'start';
  scanProgress?: number;
  onPrev?: () => void;
  onNext?: () => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  isLiveVideo?: boolean;
  landmarks?: { x: number; y: number }[];
}

export const SkinFacePanel: React.FC<SkinFacePanelProps> = ({
  currentRegion,
  mode = 'result',
  scanProgress = 75,
  onPrev,
  onNext,
  videoRef,
  isLiveVideo = false,
  landmarks
}) => {
  const [videoRatio, setVideoRatio] = useState(4 / 3);
  const updateVideoRatio = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    if (video.videoWidth > 0 && video.videoHeight > 0) setVideoRatio(video.videoWidth / video.videoHeight);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Yüz Görselleştirici Konteyner */}
      <div className={`relative w-full ${isLiveVideo && mode === 'scan' ? 'max-w-[400px]' : 'max-w-[320px] aspect-[3/3.8]'} rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl select-none`} style={isLiveVideo && mode === 'scan' ? { aspectRatio: videoRatio } : undefined} data-face-panel>
        {/* Actual decoded video dimensions keep landmarks aligned without cropping. */}
        {isLiveVideo && mode === 'scan' ? (
          <video
            ref={videoRef}
            onLoadedMetadata={updateVideoRatio}
            onLoadedData={updateVideoRatio}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain object-center"
          />
        ) : (
          <div className="w-full h-full relative" data-face-schematic>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full" role="img" aria-label={`${currentRegion.nameTr} anatomik yüz şeması`}>
              <ellipse cx="50" cy="47" rx="30" ry="38" fill="#334155" stroke="#64748b" />
              <path d="M 26 36 Q 34 31 43 36 M 57 36 Q 66 31 74 36" stroke="#cbd5e1" fill="none" />
              <path d="M 49 38 L 45 52 Q 50 56 55 52 M 38 61 Q 50 68 62 61" stroke="#cbd5e1" fill="none" />
              {currentRegion.svgPaths.map((path, index) => <path key={index} d={path} fill="#00c2e7" fillOpacity=".65" stroke="#67e8f9" strokeWidth="1" />)}
            </svg>
            <p className="absolute bottom-3 inset-x-0 text-center text-xs text-slate-200">Anatomik şema — yüz fotoğrafınız değildir</p>
          </div>
        )}

        {isLiveVideo && mode === 'scan' && landmarks && <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none" aria-label="Gerçek yüz noktaları">
          {landmarks.map((point, index) => <circle key={index} cx={point.x * 100} cy={point.y * 100} r=".15" fill="#67e8f9" />)}
        </svg>}
        {mode === 'start' && <SkinRegionOverlay region={currentRegion} mode="start" scanProgress={scanProgress} />}

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
