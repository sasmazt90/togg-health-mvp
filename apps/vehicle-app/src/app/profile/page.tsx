'use client';

import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';

export default function ProfilePage() {
  const { state } = useVehicle();
  const profile = mockInitialHealthProfile;
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Üst Profil Kartı */}
      <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-950 border border-cyan-700/50 flex items-center justify-center text-cyan-400 font-bold text-2xl">
            AY
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-white">{profile.user.displayName}</h1>
              <span className="text-[10px] bg-slate-800 text-cyan-400 border border-slate-700 px-2 py-0.5 rounded-full font-mono">
                {profile.user.truId}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Yaş Grubu: {profile.user.ageRange} • Konum Tercihi: {profile.user.preferredCity} • Görüşme: Hibrit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-800/60 text-xs font-semibold transition-all min-h-touch"
          >
            <FileText className="w-4 h-4" />
            <span>Hekimle Paylaşılabilir Özet</span>
          </button>
          <Link
            href="/privacy"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold transition-all min-h-touch"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Gizlilik & İzinleri Yönet</span>
          </Link>
        </div>
      </div>

      {/* İzin ve Gizlilik Ayarları Özeti */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Gizlilik & İzinler: <strong>Yerel Depolama (Local-First) Aktif</strong></span>
        </div>
        <div className="flex items-center gap-4 text-slate-400 text-[11px]">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Sıfır Ham Veri Saklama
          </span>
          <Link href="/privacy" className="text-cyan-400 hover:underline">
            Ayarları Değiştir →
          </Link>
        </div>
      </div>

      {/* Ortak Zaman Çizelgesi (Longitudinal Timeline) */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Zamana Yayılan Önleyici Sağlık Geçmişi
        </h2>

        {/* 1. Görme Geçmişi */}
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-cockpit-border/60 pb-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <Eye className="w-5 h-5" />
              <span>Görme Kontrolü Değişim Çizelgesi</span>
            </div>
            <span className="text-xs text-slate-400">2 Ölçüm Kayıtlı</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.visionHistory.map((vis, idx) => (
              <div key={vis.id} className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>{new Date(vis.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  <span className="font-mono text-[11px] text-slate-500">Mesafe: {vis.calibratedDistanceCm} cm</span>
                </div>
                <div className="flex justify-between items-center text-sm font-semibold text-white pt-1">
                  <span>Sağ: <strong className="text-amber-400">{vis.acuityRightSnellen}</strong></span>
                  <span>Sol: <strong className="text-slate-200">{vis.acuityLeftSnellen}</strong></span>
                  <span>Kontrast: <strong>{vis.contrastSensitivityLogCS} LogCS</strong></span>
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                  {vis.comparisonNote}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Cilt Değişim Geçmişi */}
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-cockpit-border/60 pb-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Sparkles className="w-5 h-5" />
              <span>Cilt Analizi ve 6 Bölge Karşılaştırması</span>
            </div>
            <span className="text-xs text-slate-400">2 Tarama Kayıtlı</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.skinHistory.map((sk) => (
              <div key={sk.id} className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>{new Date(sk.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  <span className="text-amber-400 font-semibold">Sağ Yanak: +%{sk.regions.rightCheek.changeFromBaselinePct} Değişim</span>
                </div>
                <p className="text-[11px] text-slate-300 pt-1 leading-relaxed">
                  {sk.overallComparisonNote}
                </p>
                <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] text-slate-400 border-t border-slate-800">
                  <span>Alın: %{sk.regions.forehead.changeFromBaselinePct}</span>
                  <span>Sol Yanak: %{sk.regions.leftCheek.changeFromBaselinePct}</span>
                  <span>Çene: %{sk.regions.chin.changeFromBaselinePct}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Ruhsal Seans Hafızası */}
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-cockpit-border/60 pb-3">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
              <HeartPulse className="w-5 h-5" />
              <span>Ruhsal İyi Oluş Görüşme Özetleri</span>
            </div>
            <span className="text-xs text-slate-400">2 Seans Kayıtlı</span>
          </div>

          <div className="space-y-3">
            {profile.mentalSessions.map((session) => (
              <div key={session.sessionId} className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>{new Date(session.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} • Süre: {Math.round(session.durationSeconds / 60)} dk</span>
                  <span className="text-indigo-300 font-semibold">Temalar: {session.recurringThemes.join(', ')}</span>
                </div>
                <p className="text-xs text-slate-200">{session.summaryText}</p>
                {session.suggestedActionNote && (
                  <div className="text-[11px] text-indigo-300 bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-800/50">
                    {session.suggestedActionNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Paylaşılabilir Özet Modalı */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-cockpit-surface border border-cyan-500/50 rounded-2xl p-6 md:p-8 max-w-lg w-full space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-cockpit-border pb-4">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <FileText className="w-5 h-5" />
                <span>Hekim Paylaşım Özeti (Klinik Dışı Değişim Raporu)</span>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3 text-xs text-slate-300 leading-relaxed font-mono">
              <div className="border-b border-slate-800 pb-2 text-slate-400 font-sans">
                <strong>Hasta/Kullanıcı:</strong> Ahmet Yılmaz | <strong>Tru.ID:</strong> TRU-8924-IST<br />
                <strong>Rapor Tarihi:</strong> 21 Eylül 2026
              </div>

              <div>
                <strong className="text-cyan-400 font-sans">1. Görme Değişimi:</strong><br />
                Sağ göz LogMAR: 0.18 (20/30). Kontrast hassasiyeti: 1.55 LogCS. Baz çizgiye göre kontrast eşiğinde gerileme gözlenmiştir.
              </div>

              <div>
                <strong className="text-emerald-400 font-sans">2. Cilt Bölgesel Değişimi:</strong><br />
                Sağ yanakta CIELAB a* kırmızılık ve Laplacian doku varyansında baz çizgiye göre +%24 artış kaydedilmiştir.
              </div>

              <div>
                <strong className="text-indigo-400 font-sans">3. Ruhsal Durum Eğilimi:</strong><br />
                Son 4 görüşmede uyku düzensizliği ve yoğun tempo tekrar eden ana temalardır.
              </div>
            </div>

            <div className="text-[11px] text-slate-500">
              * Bu belge teşhis niteliği taşımamakta olup, araç içi sensörlerin zaman içindeki ölçüm eğilimlerini hekime bilgi olarak sunmak için oluşturulmuştur.
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
                  alert('Sağlık profesyoneli dijital özet kartı cihazınıza indirildi (Demo).');
                  setShowShareModal(false);
                }}
                className="flex items-center gap-2 px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-xs font-bold"
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
