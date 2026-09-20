'use client';

import React from 'react';
import Link from 'next/link';
import { useVehicle } from '../context/VehicleContext';
import {
  Eye,
  Sparkles,
  HeartPulse,
  CalendarCheck,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  MapPin,
  CheckCircle2,
  TrendingUp,
  ChevronRight,
  Lock
} from 'lucide-react';

export default function CockpitDashboard() {
  const { state, isParked } = useVehicle();

  return (
    <div className="space-y-8">
      {/* Karşılama ve Hızlı Durum Paneli */}
      <div className="bg-gradient-to-r from-cockpit-surface to-slate-900 border border-cockpit-border rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 tracking-wider uppercase">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Bütünleşik Önleyici Sağlık Ekosistemi</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-white">
              İyi Yolculuklar, {state.driverName}.
            </h1>
            <p className="text-sm md:text-base text-slate-300">
              Araç sensörleriniz ve önleyici sağlık katmanınız aktif. Dört modül ortak sağlık profiliniz üzerinden zaman içindeki değişimleri takip etmektedir.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800 shrink-0">
            <div className="space-y-1">
              <div className="text-xs text-slate-400">Araç Durumu</div>
              <div className="text-sm font-semibold flex items-center gap-2 text-white">
                <span className={`w-2.5 h-2.5 rounded-full ${isParked ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                {isParked ? 'Park Halinde (0 km/s)' : `Sürüş Modunda (${state.currentSpeed} km/s)`}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="space-y-1">
              <div className="text-xs text-slate-400">Konum & Varış</div>
              <div className="text-sm font-semibold text-slate-200 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                {state.estimatedTravelTimeToDestMin} dk sürüş mesafesi
              </div>
            </div>
          </div>
        </div>

        {/* Sürüş Modu Güvenlik İkaz Çubuğu */}
        {!isParked && (
          <div className="mt-6 bg-amber-950/40 border border-amber-800/80 rounded-xl p-4 flex items-center gap-3 text-amber-200 text-sm">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <strong>Sürüş Güvenliği Aktif:</strong> Araç hareket halindeyken dikkat dağıtmamak amacıyla Görme ve Cilt değerlendirmeleri kilitlenmiştir. Yalnızca <strong>Sesli Ruhsal Asistan</strong> kısa ve sakin yanıtlarla kullanılabilir.
            </div>
          </div>
        )}
      </div>

      {/* Dört Ana Modül Grid Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Modül 1: Görme Kontrolü */}
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 flex flex-col justify-between hover:border-cyan-500/50 transition-all group shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-cyan-950/60 border border-cyan-800/50 text-cyan-400 rounded-xl">
                <Eye className="w-6 h-6" />
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                Modül 01
              </span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                Görme Kontrolü
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Araç ekranında Landolt C keskinlik ve kontrast hassasiyeti ön değerlendirmesi.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
              <div className="text-slate-400">Son Ölçüm (18 Eylül):</div>
              <div className="text-slate-200 font-medium flex justify-between">
                <span>Sağ: <strong>20/30</strong></span>
                <span>Sol: <strong>20/24</strong></span>
              </div>
              <div className="text-amber-400 font-medium text-[11px] pt-1 border-t border-slate-800">
                • Kontrast hassasiyetinde değişim gözlendi
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-cockpit-border/50">
            {isParked ? (
              <Link
                href="/vision"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-cyan-500 text-black font-semibold text-sm hover:bg-cyan-400 transition-all min-h-touch"
              >
                <span>Görme Kontrolünü Başlat</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800/80 text-slate-500 font-medium text-xs border border-slate-700 cursor-not-allowed">
                <Lock className="w-3.5 h-3.5" />
                <span>Park Halinde Açılabilir</span>
              </div>
            )}
          </div>
        </div>

        {/* Modül 2: Cilt Kontrolü */}
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-500/50 transition-all group shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 rounded-xl">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                Modül 02
              </span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                Cilt Kontrolü
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Kamera ile 6 yüz bölgesi takibi ve zaman içindeki görsel değişim analizi.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
              <div className="text-slate-400">Son Tarama (17 Eylül):</div>
              <div className="text-slate-200 font-medium flex justify-between">
                <span>Bölge: <strong>Sağ Yanak</strong></span>
                <span className="text-amber-400">Δ +%24 Değişim</span>
              </div>
              <div className="text-slate-400 text-[11px] pt-1 border-t border-slate-800">
                • Kızarıklık ve doku görünümünde artış
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-cockpit-border/50">
            {isParked ? (
              <Link
                href="/skin"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 transition-all min-h-touch"
              >
                <span>Cilt Taramasını Aç</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800/80 text-slate-500 font-medium text-xs border border-slate-700 cursor-not-allowed">
                <Lock className="w-3.5 h-3.5" />
                <span>Park Halinde Açılabilir</span>
              </div>
            )}
          </div>
        </div>

        {/* Modül 3: Ruhsal İyi Oluş Asistanı */}
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-500/50 transition-all group shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-indigo-950/60 border border-indigo-800/50 text-indigo-400 rounded-xl">
                <HeartPulse className="w-6 h-6" />
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                Modül 03
              </span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                Ruhsal İyi Oluş
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Sesli diyalog, seans hafızası, stres ve uyku eğilimlerinin uzun süreli takibi.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
              <div className="text-slate-400">Tekrar Eden Temalar:</div>
              <div className="text-slate-200 font-medium">
                Uyku düzensizliği, iş temposu
              </div>
              <div className="text-cyan-400 text-[11px] pt-1 border-t border-slate-800 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Son 4 seans hafızası aktif
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-cockpit-border/50">
            <Link
              href="/mental"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-400 transition-all min-h-touch"
            >
              <span>{isParked ? 'Görüşmeyi Başlat' : 'Sesli Asistanı Aç'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Modül 4: Sağlık Profesyoneli ve Randevu */}
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 flex flex-col justify-between hover:border-violet-500/50 transition-all group shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-violet-950/60 border border-violet-800/50 text-violet-400 rounded-xl">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                Modül 04
              </span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white group-hover:text-violet-400 transition-colors">
                Uzman & Randevu
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Browser agent ile takvim ve araç sürüş süresi uyumlu otonom hekim randevusu.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
              <div className="text-slate-400">Bekleyen Öneri (Dermatoloji):</div>
              <div className="text-slate-200 font-medium">
                Doç. Dr. Selin Kaya
              </div>
              <div className="text-emerald-400 text-[11px] pt-1 border-t border-slate-800 flex items-center justify-between">
                <span>Yarın 18:20</span>
                <span>Takviminiz Uygun</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-cockpit-border/50">
            <Link
              href="/care"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-violet-500 text-white font-semibold text-sm hover:bg-violet-400 transition-all min-h-touch"
            >
              <span>Randevuları İncele</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Ortak Sağlık Profili & Entegrasyon Akışı Göstergesi */}
      <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-cockpit-border/60 pb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Bütünleşik Önleyici Sağlık Özeti</h2>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Dört modül arasındaki ortak yönlendirme ve veri köprüsü haritası
            </p>
          </div>
          <Link
            href="/profile"
            className="flex items-center gap-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <span>Detaylı Sağlık Geçmişim</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-cyan-400 font-semibold">
              <Eye className="w-4 h-4" />
              <span>Görme Ön Değerlendirmesi</span>
            </div>
            <p className="text-xs text-slate-300">
              Kontrast hassasiyetinde son 1 ayda baz çizgiye göre gerileme eğilimi kaydedildi.
            </p>
            <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              Göz hekimi önerisi Care Agent'a iletildi
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
              <Sparkles className="w-4 h-4" />
              <span>Cilt Değişim Takibi</span>
            </div>
            <p className="text-xs text-slate-300">
              Sağ yanak bölgesinde kızarıklık ve doku varyansı artışı gözlemlendi.
            </p>
            <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Dermatoloji slotu takvimle eşleştirildi
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold">
              <HeartPulse className="w-4 h-4" />
              <span>Ruhsal İyi Oluş Eğilimi</span>
            </div>
            <p className="text-xs text-slate-300">
              Son seanslarda uyku ve stres örüntüsü kaydedildi; sesli görüşme geçmişi korundu.
            </p>
            <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              Gerektiğinde klinik psikolog randevusu hazır
            </div>
          </div>
        </div>

        {/* Yasal ve Klinik Sorumluluk Reddi */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-slate-300">Klinik Güvenlik ve Teşhis Bildirimi:</strong>
            <p>
              Togg Health MVP bir tıbbi cihaz veya teşhis aracı değildir. Hastalık tanısı koymaz. Yalnızca kullanıcıya zaman içindeki fonksiyonel ve görsel değişimleri bildirir ve gerektiğinde gerçek sağlık profesyonellerine erişim kolaylığı sağlar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
