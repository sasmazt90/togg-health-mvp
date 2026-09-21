'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { getRegionData } from '../../data/skinDemoFixture';
import { SkinFacePanel } from './SkinFacePanel';

interface SkinActiveScanProps {
  scanProgress: number;
  videoRef?: React.RefObject<HTMLVideoElement>;
  isLiveVideo?: boolean;
}

export const SkinActiveScan: React.FC<SkinActiveScanProps> = ({
  scanProgress,
  videoRef,
  isLiveVideo = false
}) => {
  const defaultRegion = getRegionData('forehead');

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
          />
        </div>

        {/* Sağ Kolon: Analiz Ediliyor, İlerleme Çubuğu ve 3 Kalite Kontrolü */}
        <div className="lg:col-span-6 space-y-6 max-w-md">
          <div className="space-y-1">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Analiz Ediliyor
            </h2>
            <p className="text-sm text-slate-300">
              Lütfen başınızı sabit tutun.
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

          {/* 3 Durum Satırı (Yalnızca Temiz Rozetler) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 text-sm">
              <div className="flex items-center gap-2.5 text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                <span>Yüz Hizası</span>
              </div>
              <span className="text-xs font-semibold text-emerald-400">İyi</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 text-sm">
              <div className="flex items-center gap-2.5 text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                <span>Işık</span>
              </div>
              <span className="text-xs font-semibold text-emerald-400">İyi</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 text-sm">
              <div className="flex items-center gap-2.5 text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                <span>Netlik</span>
              </div>
              <span className="text-xs font-semibold text-emerald-400">İyi</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
