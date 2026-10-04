'use client';

import React, { useState } from 'react';
import { SkinRegionData } from '../../data/skinDemoFixture';
import { SkinSnapshot, REGION_COLORS } from '../../utils/skinSnapshot';
import { SkinPreparationIllustration } from './SkinPreparationIllustration';
import { useId } from 'react';
import { NavigationArrows, SkinRegionNavigator } from './SkinRegionNavigator';

interface SkinFacePanelProps {
  currentRegion: SkinRegionData;
  snapshot?: SkinSnapshot;
  mode?: 'result' | 'scan' | 'start';
  scanProgress?: number;
  onPrev?: () => void;
  onNext?: () => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  isLiveVideo?: boolean;
  landmarks?: { x: number; y: number }[];
}

export const SkinFacePanel: React.FC<SkinFacePanelProps> = ({
  currentRegion, snapshot,
  mode = 'result',
  onPrev,
  onNext,
  videoRef,
  isLiveVideo = false,
  landmarks
}) => {
  const maskId = useId();
  const [videoRatio, setVideoRatio] = useState(4 / 3);
  const updateVideoRatio = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    if (video.videoWidth > 0 && video.videoHeight > 0) setVideoRatio(video.videoWidth / video.videoHeight);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Yüz Görselleştirici Konteyner */}
      <div className={`relative w-full ${isLiveVideo && mode === 'scan' || snapshot ? 'max-w-[400px]' : 'max-w-[360px]'} rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl select-none`} style={snapshot ? { aspectRatio: snapshot.width / snapshot.height } : isLiveVideo && mode === 'scan' ? { aspectRatio: videoRatio } : undefined} data-face-panel>
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
          mode === 'start' ? <SkinPreparationIllustration /> : snapshot ? <svg data-skin-snapshot viewBox={`0 0 ${snapshot.width} ${snapshot.height}`} className="w-full h-full" role="img" aria-label={`${currentRegion.nameTr} kabul edilmiş tarama görüntüsü`}>
            <defs><mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={snapshot.width} height={snapshot.height}><rect width={snapshot.width} height={snapshot.height} fill="white"/>{snapshot.exclusions.map((r,i)=><rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill="black"/>)}</mask></defs>
            <image href={snapshot.dataUrl} width={snapshot.width} height={snapshot.height} preserveAspectRatio="xMidYMid meet"/>
            <g mask={`url(#${maskId})`}>{snapshot.rois.map(r=><rect key={r.id} data-skin-roi={r.id} x={r.x} y={r.y} width={r.w} height={r.h} fill={REGION_COLORS[r.id]} fillOpacity={r.id===currentRegion.id?'.32':'.08'} stroke={REGION_COLORS[r.id]} strokeWidth={r.id===currentRegion.id?4:1.5}/>)}</g>
          </svg> : <div data-skin-photo-empty className="min-h-64 flex items-center justify-center p-8 text-center text-sm text-slate-400">Bu kayıtta yüz fotoğrafı yok. Yalnız sayısal sonuçlar saklandı.</div>
        )}

        {isLiveVideo && mode === 'scan' && landmarks && <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none" aria-label="Gerçek yüz noktaları">
          {landmarks.map((point, index) => <circle key={index} cx={point.x * 100} cy={point.y * 100} r=".15" fill="#67e8f9" />)}
        </svg>}


        {/* Karusel Ok Butonları (< ve >) — Yalnızca Result Modunda */}
        {mode === 'result' && onPrev && onNext && (
          <NavigationArrows onPrev={onPrev} onNext={onNext} />
        )}
      </div>

      {snapshot && <p className="text-xs text-slate-300 mt-3"><span style={{color:REGION_COLORS[currentRegion.id]}}>● </span>{currentRegion.nameTr} · {snapshot.angle === 'FRONT' ? 'Ön poz' : snapshot.angle === 'RIGHT' ? 'Sağa dönük poz' : 'Sola dönük poz'} · Renk bölge kimliğidir</p>}
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
