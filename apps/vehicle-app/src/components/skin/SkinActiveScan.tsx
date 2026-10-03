'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { getRegionData } from '../../data/skinDemoFixture';
import { SkinFacePanel } from './SkinFacePanel';

import { FaceAlignment, ImageQuality } from '../../utils/skinAnalyzer';

interface SkinActiveScanProps {
  scanProgress: number;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  isLiveVideo?: boolean;
  alignment?: FaceAlignment;
  quality?: ImageQuality;
  guidanceText?: string;
  multiAngle?: boolean;
}

export const SkinActiveScan: React.FC<SkinActiveScanProps> = ({
  scanProgress,
  videoRef,
  isLiveVideo = false,
  alignment,
  quality,
  guidanceText,
  multiAngle = false
}) => {
  const defaultRegion = getRegionData('forehead');

  // Dinamik durum rozetleri (Real telemetry vs Demo fallback)
  let faceStatusText = 'Ölçüm bekleniyor';
  let faceStatusClass = 'text-slate-400';
  if (alignment) {
    if (alignment.isMediaPipeActive && alignment.faceDetected && alignment.isAligned) {
      faceStatusText = 'İyi';
      faceStatusClass = 'text-emerald-400';
    } else if (alignment.faceDetected) {
      faceStatusText = alignment.scaleRatio < 0.28 ? 'Yaklaşın' : alignment.scaleRatio > 0.68 ? 'Uzaklaşın' : 'Hizalanıyor';
      faceStatusClass = 'text-amber-400';
    } else {
      faceStatusText = 'Algılanıyor...';
      faceStatusClass = 'text-slate-400';
    }
  }

  let lightStatusText = 'Ölçüm bekleniyor';
  let lightStatusClass = 'text-slate-400';
  if (quality) {
    if (alignment?.isMediaPipeActive && alignment.faceDetected && quality.avgLuminance >= 40 && quality.avgLuminance <= 220) {
      lightStatusText = 'İyi';
      lightStatusClass = 'text-emerald-400';
    } else if (quality.status === 'TOO_DARK') {
      lightStatusText = 'Yetersiz Işık';
      lightStatusClass = 'text-amber-400';
    } else if (quality.status === 'TOO_BRIGHT') {
      lightStatusText = 'Aşırı Parlama';
      lightStatusClass = 'text-amber-400';
    }
  }

  let clarityStatusText = 'Ölçüm bekleniyor';
  let clarityStatusClass = 'text-slate-400';
  if (quality) {
    if (alignment?.isMediaPipeActive && alignment.faceDetected && quality.blurScore >= 4.0) {
      clarityStatusText = 'İyi';
      clarityStatusClass = 'text-emerald-400';
    } else if (quality.status === 'BLURRY') {
      clarityStatusText = 'Bulanık — kameraya sabit bakın';
      clarityStatusClass = 'text-amber-400';
    }
  }

  return (
    <div className="bg-[#0c1424]/90 border border-slate-800/90 rounded-3xl p-6 md:p-8 shadow-2xl w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Sol Kolon: Büyük Yüz + Biyometrik Landmark Konstelasyon Ağı + Tarama Işını */}
        <div className="lg:col-span-6 flex justify-center">
          <SkinFacePanel
            currentRegion={defaultRegion}
            mode="scan"
            scanProgress={scanProgress}
            videoRef={videoRef}
            isLiveVideo={isLiveVideo}
            landmarks={alignment?.landmarks}
          />
        </div>

        {/* Sağ Kolon: Analiz Ediliyor, İlerleme Çubuğu ve 3 Kalite Kontrolü */}
        <div className="lg:col-span-6 space-y-6 max-w-md">
          <div className="space-y-1">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Analiz Ediliyor
            </h2>
            <p className="text-sm text-slate-300">
              {guidanceText || 'Lütfen başınızı sabit tutun.'}
            </p>
          </div>

          {/* İlerleme Çubuğu */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-300 font-medium">
              <span>Yüz bölgeleri analiz ediliyor...</span>
              <span className="font-mono text-togg-turquoise font-bold">%{scanProgress}</span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-togg-darkTurquoise via-togg-turquoise to-emerald-400 rounded-full transition-all duration-300 shadow-[0_0_12px_#00e5ff]"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-slate-400">Yüz bölgesinin kamera parlaklığı ve piksel netliği kontrol edilir; lux, hareket veya klinik yeterlilik ölçümü değildir. {multiAngle ? 'Üç ayrı poz sırayla doğrulanır.' : 'Şu an tek karşı açı değerlendirilir.'}</p>
          {/* 3 Durum Satırı (Yalnızca Temiz Rozetler) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 text-sm">
              <div className="flex items-center gap-2.5 text-slate-200">
                <CheckCircle2 className={`w-4 h-4 ${faceStatusClass}`} />
                <span>Yüz Hizası</span>
              </div>
              <span className={`text-xs font-semibold ${faceStatusClass}`}>{faceStatusText}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 text-sm">
              <div className="flex items-center gap-2.5 text-slate-200">
                <CheckCircle2 className={`w-4 h-4 ${lightStatusClass}`} />
                <span>Işık</span>
              </div>
              <span className={`text-xs font-semibold ${lightStatusClass}`}>{lightStatusText}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 text-sm">
              <div className="flex items-center gap-2.5 text-slate-200">
                <CheckCircle2 className={`w-4 h-4 ${clarityStatusClass}`} />
                <span>Netlik</span>
              </div>
              <span className={`text-xs font-semibold ${clarityStatusClass}`}>{clarityStatusText}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
