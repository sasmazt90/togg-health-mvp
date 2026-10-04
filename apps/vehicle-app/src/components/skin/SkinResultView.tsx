'use client';

import React from 'react';
import { SkinRegionData } from '../../data/skinDemoFixture';
import { SkinSnapshot } from '../../utils/skinSnapshot';
import { InformationButton } from '../InformationButton';
import { SkinFacePanel } from './SkinFacePanel';
import { SkinRegionSummary } from './SkinRegionSummary';

interface SkinResultViewProps {
  currentRegion: SkinRegionData;
  snapshot?: SkinSnapshot;
  onPrev: () => void;
  onNext: () => void;
  onOpenModal: (modal: 'trend' | 'observation' | 'actions') => void;
  onNavigateToCare: () => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  isLiveVideo?: boolean;
  isBaseline?: boolean;
  comparisonUnavailable?: boolean;
  baselineTimestamp?: string;
  baselineId?: string;
  comparisonScope?: 'single-front-v1' | 'three-angle-v2';
}

export const SkinResultView: React.FC<SkinResultViewProps> = ({
  currentRegion, snapshot,
  onPrev,
  onNext,
  onOpenModal,
  onNavigateToCare,
  videoRef,
  isLiveVideo = false,
  isBaseline, comparisonUnavailable, baselineTimestamp, baselineId, comparisonScope = 'single-front-v1'
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
            {isBaseline ? 'Referans oluşturuldu; sonraki uygun taramalar bununla karşılaştırılacak.' :
              comparisonUnavailable ? 'Karşılaştırma yapılamadı: eski referansın kalite bilgisi yok veya ışık/netlik/poz koşulları uyuşmuyor. Referansınız korundu.' :
              `${currentRegion.nameTr}: kızarıklık piksel göstergesinde referansa göre ${currentRegion.changePct > 0 ? '+' : ''}${currentRegion.changePct}% değişim.`}
          </p>
          <InformationButton title="Referans ve görüntü"><p className="text-xs text-slate-400" data-skin-comparison-scope={comparisonScope}>Referans, ilk geçerli taramanızın sayısal bölge metrikleridir; saklanmış yüz fotoğrafı veya hasta veri tabanı değildir. {baselineTimestamp && `Referans tarihi: ${new Date(baselineTimestamp).toLocaleString('tr-TR')}.`} {baselineId && `Referans kimliği: ${baselineId}.`} Kapsam: {comparisonScope === 'three-angle-v2' ? 'ön, anatomik sağ ve anatomik sol açı' : 'tek karşı açı'}, uyumlu ışık/netlik/poz. Bu yüzde klinik cilt değişimi değildir.</p><p>Fotoğraf ve gerçek ölçüm alanları yalnız bellektedir. Renkler bölge kimliğini gösterir; hastalık veya klinik şiddet haritası değildir. Görüntü yerel olarak yüz konturuna kesilir; aynalanmaz. İnce çizgiler gerçek anatomik noktalardır ve sayısal analizin örnekleme sınırları içinde kesilir. Bu işlem metrikleri değiştirmez.</p></InformationButton>
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
            snapshot={snapshot}
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
