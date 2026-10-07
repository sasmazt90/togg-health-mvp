'use client';

import React, { useEffect, useState } from 'react';
import { SkinRegionData } from '../../data/skinDemoFixture';
import { SkinSnapshot } from '../../utils/skinSnapshot';
import Image from 'next/image';
import { useId } from 'react';
import { SkinRegionNavigator } from './SkinRegionNavigator';
import { cameraCrop } from '../CameraPreparation';
import { StablePreviewCrop } from '../../utils/cameraStability';

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
  const [videoRatio,setVideoRatio]=useState(4/3);
  const previewCrop=React.useRef(new StablePreviewCrop());
  const crop=isLiveVideo&&mode==='scan'?previewCrop.current.update(cameraCrop(landmarks),performance.now()):{x:0,y:0,width:1,height:1};
  const updateVideoRatio=(event:React.SyntheticEvent<HTMLVideoElement>)=>{const v=event.currentTarget;if(v.videoWidth && v.videoHeight)setVideoRatio(v.videoWidth/v.videoHeight);};
  const [dpr,setDpr]=useState(1);
  useEffect(()=>{const update=()=>setDpr(window.devicePixelRatio||1);update();window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update);},[]);

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Natural portrait pixels; no outline or shadow on the photo. */}
      <div className={`relative w-full ${isLiveVideo && mode === 'scan' || snapshot ? 'max-w-[480px]' : 'max-w-[360px]'} rounded-2xl overflow-hidden select-none`} style={snapshot ? { aspectRatio: snapshot.crop.width / snapshot.crop.height, maxWidth: Math.min(400,snapshot.crop.width/dpr) } : isLiveVideo && mode === 'scan' ? {aspectRatio:videoRatio*crop.width/crop.height,maxWidth:`min(480px,${65*videoRatio*crop.width/crop.height}vh)`} : undefined} data-face-panel data-preview-crop={isLiveVideo&&mode==='scan'?JSON.stringify(crop):undefined} data-source-pixel-width={snapshot?.crop.width} data-display-dpr={dpr}>
        {/* Actual decoded video dimensions keep landmarks aligned without cropping. */}
        {isLiveVideo && mode === 'scan' ? (
          <div data-skin-preview-source className="absolute" style={{width:`${100/crop.width}%`,height:`${100/crop.height}%`,left:`${-100*crop.x/crop.width}%`,top:`${-100*crop.y/crop.height}%`}}><video ref={videoRef} onLoadedMetadata={updateVideoRatio} onLoadedData={updateVideoRatio} autoPlay playsInline muted className="w-full h-full object-fill" data-skin-live-video />{landmarks && <svg data-skin-live-landmarks viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none" aria-label="Gerçek yüz noktaları">{landmarks.map((point,index)=><circle key={index} cx={point.x*100} cy={point.y*100} r=".15" fill="#67e8f9" />)}</svg>}</div>
        ) : (
          mode === 'start' ? <Image src="/assets/skin-preparation.png" alt="Cilt taraması hazırlık görseli" width={600} height={800} className="w-full h-auto" /> : snapshot ? snapshot.visualError ? <div role="alert" data-skin-segmentation-error className="min-h-64 p-6 flex items-center text-center text-sm text-amber-200">{snapshot.visualError}</div> : <svg data-skin-snapshot data-snapshot-width={snapshot.width} data-snapshot-height={snapshot.height} data-mask-width={snapshot.maskWidth} data-mask-height={snapshot.maskHeight} data-segmentation-ms={snapshot.segmentationMs} viewBox={`${snapshot.crop.x} ${snapshot.crop.y} ${snapshot.crop.width} ${snapshot.crop.height}`} className="w-full h-full" role="img" aria-label={`${currentRegion.nameTr} kabul edilmiş tarama görüntüsü`}>
            <defs><filter id={maskId} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation={snapshot.crop.width / 700}/></filter></defs>
            <image href={snapshot.dataUrl} width={snapshot.width} height={snapshot.height}/>
            {snapshot.meshes[currentRegion.id] && <g data-skin-roi={currentRegion.id} data-skin-mesh={currentRegion.id} stroke="#36e4f1" fill="none" strokeLinejoin="round" strokeLinecap="round">
              {snapshot.meshes[currentRegion.id].edges.map(([a,b],i)=>{const points=snapshot.meshes[currentRegion.id].points;return <path key={i} data-mesh-edge={`${a}-${b}`} d={`M${points[a].x} ${points[a].y}L${points[b].x} ${points[b].y}`} strokeWidth={snapshot.crop.width / 330} strokeOpacity=".68"/>;})}
              {snapshot.meshes[currentRegion.id].points.map((p,i)=>{const major=snapshot.meshes[currentRegion.id].major.includes(i),r=snapshot.crop.width*(major?2.6:1.25)/400;return <g key={i}><circle cx={p.x} cy={p.y} r={r*1.6} fill="#36e4f1" stroke="none" opacity=".25" filter={`url(#${maskId})`}/>{major?<path d={`M${p.x} ${p.y-r}l${r} ${r}l-${r} ${r}l-${r} -${r}Z`} fill="#85f8ff" stroke="none"/>:<circle cx={p.x} cy={p.y} r={r} fill="#7af2fc" stroke="none"/>}</g>;})}
            </g>}
          </svg> : <div data-skin-photo-empty className="min-h-64 flex items-center justify-center p-8 text-center text-sm text-slate-400">Bu kayıtta yüz fotoğrafı yok. Yalnız sayısal sonuçlar saklandı.</div>
        )}


      </div>

      {snapshot && !snapshot.visualError && snapshot.crop.width<400*dpr && <p data-skin-resolution-warning className="text-xs text-amber-200 max-w-sm mt-2 text-center">Görüntü ayrıntısı sınırlı; büyütülmedi. Daha net bir portre için iyi ışıkta yeni tarama yapabilirsiniz.</p>}
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
