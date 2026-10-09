'use client';

import React from 'react';
import { SkinIndicatorValue } from './SkinIndicatorValue';
import { InformationButton } from '../InformationButton';
import { TrendingUp, FileText, Lightbulb, ArrowRight } from 'lucide-react';
import { SkinRegionData } from '../../data/skinDemoFixture';

interface SkinRegionSummaryProps {
  currentRegion: SkinRegionData;
  onOpenModal: (modal: 'trend' | 'observation' | 'actions') => void;
  onNavigateToCare: () => void;
  selectedCriterion?:string|null;
  onSelectCriterion?:(criterion:string)=>void;
}

export const SkinRegionSummary: React.FC<SkinRegionSummaryProps> = ({
  currentRegion,
  onOpenModal,
  onNavigateToCare,selectedCriterion,onSelectCriterion
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

        </div>

        {/* 4 Gerçek Engine Metriği Göstergeleri */}
        {currentRegion.indicators ? <div className="space-y-4" data-skin-indicators>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentRegion.indicators.filter(indicator=>indicator.score!==null).map(indicator=>{
              const geometry=indicator.appearance?.type==='longitudinal_measurement';
              const delta=indicator.referenceDelta===undefined?undefined:Math.round(indicator.referenceDelta*(geometry?1000:1));
              return <div key={indicator.id} data-skin-indicator={indicator.id} role={onSelectCriterion?'button':undefined} tabIndex={onSelectCriterion?0:undefined} aria-pressed={onSelectCriterion?selectedCriterion===indicator.id:undefined} onClick={()=>onSelectCriterion?.(indicator.id)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelectCriterion?.(indicator.id);}}} className="rounded-2xl border border-sky-400/15 bg-slate-900/60 p-4 space-y-3">
                <div className="text-sm text-slate-300">{indicator.label}</div>
                <SkinIndicatorValue indicator={indicator}/>
                {delta!==undefined&&<p className="text-xs text-sky-300">Referansa göre {delta>0?'+':''}{delta} {geometry?'× 10⁻³ kontur farkı':indicator.unit}</p>}
              </div>;
            })}
          </div>
          {currentRegion.indicators.every(indicator=>indicator.score===null)&&<p className="rounded-2xl border border-slate-700/60 p-4 text-sm text-slate-300">Bu karede yeterli güvenilir cilt ölçümü bulunmuyor.</p>}
          {currentRegion.indicators.some(indicator=>indicator.score===null)&&<div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 space-y-3">
            <p className="text-xs text-slate-400">Bu taramada ölçülemeyenler</p>
            <div className="flex flex-wrap gap-2">{currentRegion.indicators.filter(indicator=>indicator.score===null).map(indicator=><span key={indicator.id} data-skin-indicator={indicator.id} role={onSelectCriterion?'button':undefined} tabIndex={onSelectCriterion?0:undefined} aria-pressed={onSelectCriterion?selectedCriterion===indicator.id:undefined} onClick={()=>onSelectCriterion?.(indicator.id)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelectCriterion?.(indicator.id);}}} className="rounded-lg bg-slate-800/70 px-3 py-2 text-xs text-slate-300">{indicator.label}<span className="sr-only">: Değerlendirilemiyor</span></span>)}</div>
            <details className="text-xs text-slate-400"><summary className="cursor-pointer text-slate-300">Neden ölçülemiyor?</summary><dl className="mt-3 space-y-3">{currentRegion.indicators.filter(indicator=>indicator.score===null).map(indicator=><div key={indicator.id}><dt className="font-medium text-slate-300">{indicator.label}</dt><dd className="mt-1 leading-relaxed">{indicator.reason}</dd></div>)}</dl></details>
          </div>}
        </div> : <div className="space-y-2.5">
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
          {/^[-+]?\d/.test(metrics.baselineChange.displayValue) && <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">{metrics.baselineChange.label}</span>
              <span
                className={`font-semibold font-mono ${
                  metrics.baselineChange.status === 'amber'
                    ? 'text-amber-400 font-bold'
                    : 'text-slate-300'
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
                    : 'bg-sky-400'
                }`}
                style={{ width: `${metrics.baselineChange.score}%` }}
              />
            </div>
          </div>}
        </div>}
      </div>

      <InformationButton title="Görüntü göstergeleri"><p>{currentRegion.indicators?'Yüzde biçimindeki 0–100 değerler görünüm indeksidir; hastalık olasılığı veya klinik şiddet yüzdesi değildir. Renk geçişi yalnız görsel bir ölçektir. Alan oranları yalnız görünür, geçerli cilt alanındaki gerçek adayları gösterir. Parlama sebum, pullanma nem, sivilce adayı tanı değildir. Yeni kontur ve katlanma indeksleri yalnız mevcut çekimin birlikte desteklediği görünüm sinyalidir; kişisel geçmiş gerekmez. Eski kontur oranları yalnız eski kayıt yönteminde korunur. Işık, sakal, gölge ve düşük detay sonucu sınırlayabilir. T-bölgesi hesabı alın ve burunu kapsar; çene eklenmez. Dolgu, korunan seçili bölge ağıyla sınırlıdır. Seçilen kartın lokal sinyali varsa ağ içinde dolgu görünür; geometrik ölçümde yalnız gerçek kontur çizilir. Yöntemler uzman şiddet ölçeğine kalibre edilmemiştir.':'Eski değerlendirme: kızarıklık, parlaklık ve piksel farkı yalnız eski fotoğraf göstergeleridir. Yeni cilt kriterlerine dönüştürülmez.'}</p></InformationButton>
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
