'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useVehicle } from '../context/VehicleContext';
import {
  Eye,
  Sparkles,
  HeartPulse,
  CalendarCheck,
  ArrowRight,
  AlertCircle,
  MapPin,
  CheckCircle2,
  Lock,
  Activity,
  ChevronRight,
  Clock,
  ShieldCheck,
  Info
} from 'lucide-react';
import { isDemoMode } from '../utils/attuneMode';
import {
  getVisionSummary,
  getSkinSummary,
  getMentalSummary,
  getHealthTimeline,
  VisionSummaryData,
  SkinSummaryData,
  MentalSummaryData,
  HealthTimelineItem
} from '../utils/healthSelectors';

export default function CockpitDashboard() {
  const { state, isParked } = useVehicle();

  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [vision, setVision] = useState<VisionSummaryData>(() => getVisionSummary(false));
  const [skin, setSkin] = useState<SkinSummaryData>(() => getSkinSummary(false));
  const [mental, setMental] = useState<MentalSummaryData>(() => getMentalSummary(false));
  const [timeline, setTimeline] = useState<HealthTimelineItem[]>(() => getHealthTimeline(false));

  useEffect(() => {
    const demo = isDemoMode();
    setIsDemo(demo);
    setVision(getVisionSummary(demo));
    setSkin(getSkinSummary(demo));
    setMental(getMentalSummary(demo));
    setTimeline(getHealthTimeline(demo));
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. Hero Karşılama ve Durum Alanı (İlk Viewport Üst %35-40) */}
      <section className="bg-gradient-to-br from-cockpit-surface via-[#071322] to-cockpit-bg border border-white/10 rounded-2xl p-6 md:p-7 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-togg-turquoise/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-cyan-900/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-togg-turquoise tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-togg-turquoise animate-pulse" />
              <span>Kişisel Önleyici Sağlık Kokpiti</span>
              {isDemo && (
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-togg-turquoise/30 text-togg-turquoise lowercase font-mono">
                  demo veri
                </span>
              )}
            </div>

            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <span>ATTUNE</span>
                <span className="text-togg-turquoise">.more</span>
              </h1>
              <p className="text-sm md:text-base text-slate-300 leading-relaxed">
                Sağlığınızdaki değişimleri yolculuk boyunca takip eden kişisel iyi oluş deneyimi.
              </p>
            </div>

            {/* Modül Kategorileri Bandı */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                Görme
              </span>
              <span className="text-slate-600">•</span>
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                Cilt
              </span>
              <span className="text-slate-600">•</span>
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                Ruhsal İyi Oluş
              </span>
              <span className="text-slate-600">•</span>
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                Uzman Erişimi
              </span>
            </div>
          </div>

          {/* Minimal Araç ve Durum Bloğu */}
          <div className="flex items-center gap-4 bg-slate-950/80 px-5 py-3.5 rounded-2xl border border-white/10 shrink-0 backdrop-blur-md shadow-lg">
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Araç Durumu</div>
              <div className="text-xs font-semibold flex items-center gap-2 text-white">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isParked
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                      : 'bg-amber-400 animate-pulse'
                  }`}
                />
                <span>{isParked ? 'Park Halinde' : `Sürüş (${state.currentSpeed} km/s)`}</span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-800" />

            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Varış Süresi</div>
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-togg-turquoise" />
                <span>22 dk varış</span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-800" />

            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Sensörler</div>
              <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hazır</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sürüş Modu Emniyet Uyarısı (Sadece hareket halindeyken) */}
        {!isParked && (
          <div className="mt-4 bg-amber-950/50 border border-amber-800/70 rounded-xl px-4 py-2.5 flex items-center gap-3 text-amber-200 text-xs shadow-md">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Sürüş Güvenliği Devrede:</strong> Görsel odak gerektiren testler kilitlenmiştir. Yalnızca sesli asistan kullanılabilir.
            </span>
          </div>
        )}
      </section>

      {/* 2. Dört Eşit Modül Kartı Grid (1600x900 ilk ekranda görünür) */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Modül 1: Görme Kontrolü */}
        <div className="bg-cockpit-surface border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-togg-turquoise/40 transition-all duration-200 shadow-xl group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-togg-darkBlue/80 border border-togg-darkTurquoise/50 text-togg-turquoise rounded-xl group-hover:border-togg-turquoise/60 transition-colors">
                <Eye className="w-5 h-5" />
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800 font-mono">
                01 • GÖRME
              </span>
            </div>

            <div>
              <h2 className="text-base font-bold text-white group-hover:text-togg-turquoise transition-colors">
                Görme Kontrolü
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Landolt C halkalarıyla görme keskinliği ve kontrast ön değerlendirmesi.
              </p>
            </div>

            {/* Sade Tek Katman İçgörü */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">{vision.hasData ? 'Son Sonuç' : 'Son Değerlendirme'}</span>
                <span className="font-mono text-white text-xs font-semibold">{vision.acuitySummary}</span>
              </div>
              <div className="text-[11px] text-amber-400 font-medium pt-1 border-t border-slate-900 flex items-center justify-between">
                <span>Kontrast</span>
                <span className="text-slate-400 font-normal">{vision.contrastSummary}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5">
            {isParked ? (
              <Link
                href="/vision"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-togg-turquoise text-togg-darkBlue font-semibold text-xs hover:bg-[#33D0EE] transition-all min-h-touch shadow-md"
              >
                <span>Kontrolü Başlat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <div className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-900 text-slate-500 font-medium text-xs border border-slate-800 cursor-not-allowed">
                <Lock className="w-3.5 h-3.5" />
                <span>Park Halinde Açılır</span>
              </div>
            )}
          </div>
        </div>

        {/* Modül 2: Cilt Kontrolü */}
        <div className="bg-cockpit-surface border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-togg-turquoise/40 transition-all duration-200 shadow-xl group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-togg-darkBlue/80 border border-togg-darkTurquoise/50 text-togg-turquoise rounded-xl group-hover:border-togg-turquoise/60 transition-colors">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800 font-mono">
                02 • CİLT
              </span>
            </div>

            <div>
              <h2 className="text-base font-bold text-white group-hover:text-togg-turquoise transition-colors">
                Cilt Kontrolü
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                6 anatomik yüz bölgesinde zaman içindeki piksel değişim takibi.
              </p>
            </div>

            {/* Sade Tek Katman İçgörü */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">{skin.hasData ? skin.regionNameTr : 'Son Tarama'}</span>
                <span className={`font-mono text-xs font-bold ${skin.hasData ? 'text-amber-400' : 'text-slate-400 font-normal'}`}>
                  {skin.changeLabel}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 font-medium pt-1 border-t border-slate-900 flex items-center justify-between">
                <span>Durum</span>
                <span className="text-amber-400 font-normal">{skin.recommendation}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5">
            {isParked ? (
              <Link
                href="/skin"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-togg-turquoise text-togg-darkBlue font-semibold text-xs hover:bg-[#33D0EE] transition-all min-h-touch shadow-md"
              >
                <span>Cilt Taramasını Aç</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <div className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-900 text-slate-500 font-medium text-xs border border-slate-800 cursor-not-allowed">
                <Lock className="w-3.5 h-3.5" />
                <span>Park Halinde Açılır</span>
              </div>
            )}
          </div>
        </div>

        {/* Modül 3: Ruhsal İyi Oluş */}
        <div className="bg-cockpit-surface border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-togg-turquoise/40 transition-all duration-200 shadow-xl group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-togg-darkBlue/80 border border-togg-darkTurquoise/50 text-togg-turquoise rounded-xl group-hover:border-togg-turquoise/60 transition-colors">
                <HeartPulse className="w-5 h-5" />
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800 font-mono">
                03 • RUHSAL
              </span>
            </div>

            <div>
              <h2 className="text-base font-bold text-white group-hover:text-togg-turquoise transition-colors">
                Ruhsal İyi Oluş
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Kabin içi sesli diyalog, stres ve uyku eğilimleri takibi.
              </p>
            </div>

            {/* Sade Tek Katman İçgörü */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Tekrar Eden Tema</span>
                <span className="text-white text-xs font-semibold">{mental.primaryTheme}</span>
              </div>
              <div className="text-[11px] text-togg-turquoise font-medium pt-1 border-t border-slate-900 flex items-center justify-between">
                <span>Seans Hafızası</span>
                <span className="text-slate-400 font-normal">{mental.sessionCountLabel}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5">
            <Link
              href="/mental"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-togg-turquoise text-togg-darkBlue font-semibold text-xs hover:bg-[#33D0EE] transition-all min-h-touch shadow-md"
            >
              <span>{isParked ? 'Görüşmeyi Başlat' : 'Sesli Asistanı Aç'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Modül 4: Uzman & Randevu */}
        <div className="bg-cockpit-surface border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-togg-turquoise/40 transition-all duration-200 shadow-xl group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-togg-darkBlue/80 border border-togg-darkTurquoise/50 text-togg-turquoise rounded-xl group-hover:border-togg-turquoise/60 transition-colors">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800 font-mono">
                04 • UZMAN
              </span>
            </div>

            <div>
              <h2 className="text-base font-bold text-white group-hover:text-togg-turquoise transition-colors">
                Uzman & Randevu
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Takvim ve araç rotasıyla uyumlu akıllı hekim randevusu.
              </p>
            </div>

            {/* Sade Tek Katman İçgörü */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Önerilen Branş</span>
                <span className="text-white text-xs font-semibold">Dermatoloji</span>
              </div>
              <div className="text-[11px] text-emerald-400 font-medium pt-1 border-t border-slate-900 flex items-center justify-between">
                <span>Uzm. Dr. B. Kaya (Demo Hekim)</span>
                <span>Yarın 18:20</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5">
            <Link
              href="/care"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-togg-turquoise text-togg-darkBlue font-semibold text-xs hover:bg-[#33D0EE] transition-all min-h-touch shadow-md"
            >
              <span>Randevuları İncele</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Below Fold: Son Değişimler Zaman Çizelgesi */}
      <section className="bg-cockpit-surface border border-white/10 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5 text-sm font-bold text-white">
            <Activity className="w-4 h-4 text-togg-turquoise" />
            <span>Son Değişimler & Eğilim Akışı</span>
          </div>
          <Link
            href="/profile"
            className="flex items-center gap-1 text-xs text-togg-turquoise hover:text-[#33D0EE] transition-colors font-semibold"
          >
            <span>Tüm Sağlık Geçmişi</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {timeline.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {timeline.map((item) => (
              <div key={item.id} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/70 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">{item.dateTr}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${item.badgeClass}`}>
                    {item.moduleName}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800/50 space-y-1">
            <Info className="w-5 h-5 text-slate-500 mx-auto" />
            <p>Henüz kayıtlı ölçüm geçmişi bulunmuyor.</p>
            <p className="text-[11px] text-slate-500">Görme veya cilt kontrolünü tamamladığınızda eğilim akışınız burada listelenecektir.</p>
          </div>
        )}
      </section>
    </div>
  );
}
