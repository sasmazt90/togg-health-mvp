'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useVehicle } from '../../context/VehicleContext';
import { mockInitialHealthProfile } from '@packages/health-profile/mockData';
import {
  User,
  ShieldCheck,
  Eye,
  Sparkles,
  HeartPulse,
  CalendarCheck,
  Download,
  CheckCircle2,
  FileText,
  Clock,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Info
} from 'lucide-react';
import { isDemoMode } from '../../utils/attuneMode';
import {
  getVisionSummary,
  getSkinSummary,
  getMentalSummary,
  getHealthTimeline,
  VisionSummaryData,
  SkinSummaryData,
  MentalSummaryData,
  HealthTimelineItem
} from '../../utils/healthSelectors';

export default function ProfilePage() {
  const { state } = useVehicle();
  const profile = mockInitialHealthProfile;
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  const [isDemo, setIsDemo] = useState<boolean>(true);
  const [vision, setVision] = useState<VisionSummaryData>(() => getVisionSummary(true));
  const [skin, setSkin] = useState<SkinSummaryData>(() => getSkinSummary(true));
  const [mental, setMental] = useState<MentalSummaryData>(() => getMentalSummary(true));
  const [timeline, setTimeline] = useState<HealthTimelineItem[]>(() => getHealthTimeline(true));

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
      {/* 1. SCREEN 09: ÜST PROFİL KARTI VE BİRİNCİL AKSIYONLAR (FIRST VIEWPORT) */}
      <section className="bg-gradient-to-br from-cockpit-surface via-[#071322] to-cockpit-bg border border-white/10 rounded-2xl p-6 md:p-7 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-togg-darkBlue/90 border border-togg-turquoise/40 flex items-center justify-center text-togg-turquoise font-extrabold text-xl shadow-[0_0_15px_rgba(0,194,231,0.2)]">
            AY
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-extrabold text-white">Sağlık Geçmişim</h1>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300 font-medium text-sm">{profile.user.displayName}</span>
              {isDemo && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-togg-turquoise/30 text-togg-turquoise lowercase font-mono">
                  demo veri
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {profile.user.ageRange} Yaş • {profile.user.preferredCity} • Local-First Veri Koruma
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-togg-darkBlue/70 hover:bg-togg-darkBlue text-togg-turquoise border border-togg-darkTurquoise/60 text-xs font-bold transition-all shadow-md min-h-touch"
          >
            <FileText className="w-4 h-4" />
            <span>Hekimle Paylaşılabilir Özet</span>
          </button>

          <Link
            href="/privacy"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold transition-all min-h-touch"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Gizlilik & İzinler</span>
          </Link>
        </div>
      </section>

      {/* 2. ÜÇ MODÜL ÖZET SATIRI (FIRST VIEWPORT 3 OVERVIEW CARDS) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Görme Özeti */}
        <div className="bg-cockpit-surface border border-white/10 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-togg-turquoise font-bold text-sm">
              <Eye className="w-4 h-4 text-togg-turquoise" />
              <span>Görme Kontrolü</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {vision.hasData ? vision.dateTr : 'Kayıt Yok'}
            </span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Son Keskinlik</span>
              <span className="font-mono text-white font-bold">{vision.acuitySummary}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-900">
              <span className="text-amber-400">Kontrast</span>
              <span className="font-mono text-slate-300">{vision.contrastSummary}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            {vision.hasData
              ? 'Baz çizgiye göre kontrast ve keskinlik seviyeleri izlenmektedir.'
              : 'Henüz tamamlanmış görme değerlendirmesi bulunmuyor.'}
          </p>
        </div>

        {/* Cilt Özeti */}
        <div className="bg-cockpit-surface border border-white/10 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-togg-turquoise font-bold text-sm">
              <Sparkles className="w-4 h-4 text-togg-turquoise" />
              <span>Cilt Analizi</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {skin.hasData ? skin.dateTr : 'Kayıt Yok'}
            </span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">{skin.hasData ? skin.regionNameTr : 'Son Değişim'}</span>
              <span className={`font-mono text-xs font-bold ${skin.hasData ? 'text-amber-400' : 'text-slate-400 font-normal'}`}>
                {skin.changeLabel}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-900">
              <span className="text-slate-400">Öneri</span>
              <span className="text-slate-300">{skin.recommendation}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            {skin.hasData
              ? (skin.rawRecord?.clinicalNoteTr || 'Piksel bazlı anatomik ROI telemetrisi kaydedildi.')
              : 'Henüz tamamlanmış cilt analizi taraması bulunmuyor.'}
          </p>
        </div>

        {/* Ruhsal Özet */}
        <div className="bg-cockpit-surface border border-white/10 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-togg-turquoise font-bold text-sm">
              <HeartPulse className="w-4 h-4 text-togg-turquoise" />
              <span>Ruhsal İyi Oluş</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {mental.hasData ? mental.dateTr : 'Kayıt Yok'}
            </span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Tekrar Eden Tema</span>
              <span className="font-mono text-white font-bold">{mental.primaryTheme}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-900">
              <span className="text-slate-400">Seans Geçmişi</span>
              <span className="font-mono text-togg-turquoise">{mental.sessionCountLabel}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            {mental.hasData
              ? 'Haftalık görüşmelerde akşam saatleri yorgunluk ve iş stresi örüntüsü kaydedildi.'
              : 'Henüz kaydedilmiş ruhsal iyi oluş görüşmesi bulunmuyor.'}
          </p>
        </div>
      </section>

      {/* 3. BELOW FOLD: ZAMANA YAYILAN SAĞLIK GEÇMİŞİ (LONGITUDINAL TIMELINE) */}
      <section className="bg-cockpit-surface border border-white/10 rounded-2xl p-6 md:p-7 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-togg-turquoise" />
              <span>Zamana Yayılan Değişim Çizelgesi</span>
            </h2>
            <p className="text-xs text-slate-400">
              Kabin içi sensörlerin zaman içindeki ölçüm ve eğilim kayıtları.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">{timeline.length} Kayıtlı Olay</span>
        </div>

        {timeline.length > 0 ? (
          <div className="space-y-4">
            {timeline.map((item) => (
              <div key={item.id} className="bg-slate-950/70 border border-white/5 rounded-xl p-4.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-togg-turquoise" />
                    <strong className="text-white">{item.moduleName}</strong>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">{item.dateTr}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800/50 space-y-2">
            <Info className="w-6 h-6 text-slate-500 mx-auto" />
            <p className="font-medium text-slate-300">Henüz kayıtlı ölçüm geçmişi bulunmuyor.</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Görme testi veya cilt taraması yaptıkça zaman içindeki değişimleriniz burada sıralanacaktır.
            </p>
          </div>
        )}
      </section>

      {/* PAYLAŞILABİLİR ÖZET MODALI */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-cockpit-surface border border-togg-turquoise/40 rounded-2xl p-6 md:p-8 max-w-lg w-full space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-togg-turquoise font-bold">
                <FileText className="w-5 h-5" />
                <span>Hekim Paylaşım Özeti (Klinik Dışı Değişim Raporu)</span>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs text-slate-300 leading-relaxed font-mono">
              <div className="border-b border-slate-800 pb-2 text-slate-400 font-sans">
                <strong>Hasta/Kullanıcı:</strong> Ahmet Yılmaz<br />
                <strong>Rapor Tarihi:</strong> {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>

              <div>
                <strong className="text-togg-turquoise font-sans">1. Görme Değişimi:</strong><br />
                {vision.hasData
                  ? `Keskinlik: ${vision.acuitySummary}. Kontrast: ${vision.contrastSummary}.`
                  : 'Henüz tamamlanmış görme değerlendirmesi bulunmuyor.'}
              </div>

              <div>
                <strong className="text-emerald-400 font-sans">2. Cilt Bölgesel Değişimi:</strong><br />
                {skin.hasData
                  ? `${skin.regionNameTr} bölgesinde ${skin.changeLabel}. Öneri: ${skin.recommendation}.`
                  : 'Henüz tamamlanmış cilt taraması bulunmuyor.'}
              </div>

              <div>
                <strong className="text-indigo-400 font-sans">3. Ruhsal Durum Eğilimi:</strong><br />
                {mental.hasData
                  ? `Öne çıkan temalar: ${mental.primaryTheme}. Toplam ${mental.sessionCountLabel}.`
                  : 'Henüz seans kaydı bulunmuyor.'}
              </div>
            </div>

            <div className="text-[11px] text-slate-500">
              * Bu belge tanı niteliği taşımamakta olup, araç içi sensörlerin zaman içindeki ölçüm eğilimlerini hekime bilgi olarak sunmak için oluşturulmuştur.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Kapat
              </button>
              <button
                onClick={() => {
                  alert('Özet kartı hazırlandı.');
                  setShowShareModal(false);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-togg-turquoise hover:bg-[#33D0EE] text-togg-darkBlue rounded-xl text-xs font-bold shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Özeti İndir (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
