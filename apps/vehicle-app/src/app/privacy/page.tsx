'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Trash2,
  Camera,
  Mic,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Sparkles,
  HeartPulse,
  Database,
  ArrowLeft
} from 'lucide-react';

export default function PrivacyPage() {
  const [cameraStatus, setCameraStatus] = useState<'GRANTED' | 'DENIED' | 'PROMPT'>('PROMPT');
  const [micStatus, setMicStatus] = useState<'GRANTED' | 'DENIED' | 'PROMPT'>('PROMPT');
  const [saveMentalSummaries, setSaveMentalSummaries] = useState<boolean>(true);
  const [dataStats, setDataStats] = useState<{
    visionCount: number;
    skinCount: number;
    mentalCount: number;
  }>({ visionCount: 0, skinCount: 0, mentalCount: 0 });

  const [wipeStatus, setWipeStatus] = useState<'IDLE' | 'CONFIRM' | 'SUCCESS'>('IDLE');

  // Mevcut izin ve veri durumunu oku
  const checkStatus = () => {
    if (typeof window !== 'undefined') {
      // İzin durumları
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'camera' as any }).then((p) => {
          setCameraStatus(p.state === 'granted' ? 'GRANTED' : p.state === 'denied' ? 'DENIED' : 'PROMPT');
        }).catch(() => {});

        navigator.permissions.query({ name: 'microphone' as any }).then((p) => {
          setMicStatus(p.state === 'granted' ? 'GRANTED' : p.state === 'denied' ? 'DENIED' : 'PROMPT');
        }).catch(() => {});
      }

      // Mental ayar
      const mentalPref = localStorage.getItem('togg_privacy_mental_summary_allowed');
      if (mentalPref !== null) {
        setSaveMentalSummaries(mentalPref === 'true');
      }

      // Kayıt sayıları
      let vCount = localStorage.getItem('togg_health_latest_vision') ? 1 : 0;
      let sCount = localStorage.getItem('togg_health_latest_skin') ? 1 : 0;
      if (localStorage.getItem('togg_health_skin_baseline')) sCount += 1;
      let mCount = localStorage.getItem('togg_health_latest_mental') ? 1 : 0;

      setDataStats({ visionCount: vCount, skinCount: sCount, mentalCount: mCount });
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleToggleMentalSaving = (val: boolean) => {
    setSaveMentalSummaries(val);
    localStorage.setItem('togg_privacy_mental_summary_allowed', String(val));
  };

  const handleTestCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      s.getTracks().forEach((t) => t.stop());
      setCameraStatus('GRANTED');
    } catch {
      setCameraStatus('DENIED');
    }
  };

  const handleTestMic = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
      setMicStatus('GRANTED');
    } catch {
      setMicStatus('DENIED');
    }
  };

  const handleWipeAllData = async () => {
    try {
      // 1. LocalStorage temizliği
      localStorage.removeItem('togg_health_latest_vision');
      localStorage.removeItem('togg_health_latest_skin');
      localStorage.removeItem('togg_health_skin_baseline');
      localStorage.removeItem('togg_health_latest_mental');
      localStorage.removeItem('togg_active_referral_context');

      // 2. Backend SQLite/memory wipe çağrısı
      await fetch('http://localhost:8000/api/privacy/wipe', { method: 'POST' }).catch(() => {});

      setDataStats({ visionCount: 0, skinCount: 0, mentalCount: 0 });
      setWipeStatus('SUCCESS');
      setTimeout(() => setWipeStatus('IDLE'), 3500);
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Üst Başlık */}
      <div className="flex items-center justify-between border-b border-cockpit-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-400 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Veri ve Gizlilik Yönetim Merkezi</h1>
            <p className="text-xs text-slate-400">
              Donanım izinleri, yerel veri saklama ayarları ve anında geçmişi silme kontrolü
            </p>
          </div>
        </div>

        <Link
          href="/profile"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Profile Dön</span>
        </Link>
      </div>

      {/* Privacy-by-Design Bildirimi */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900/90 to-indigo-950/40 border border-cyan-800/60 rounded-2xl p-5 shadow-lg space-y-2">
        <div className="flex items-center gap-2 text-sm font-bold text-cyan-300">
          <Lock className="w-4 h-4 text-cyan-400" />
          <span>Sıfır Ham Veri İlkesi (Privacy-by-Design)</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Togg Health MVP, gizliliğinizi donanım seviyesinde korur. Kamera tarafından okunan yüz görüntüleri ve video kareleri, mikrofon tarafından kaydedilen ses dalgaları <strong>asla sunucuya gönderilmez veya kalıcı olarak kaydedilmez</strong>. Görüntü işleme ve ses analizi tamamen tarayıcınızda veya yerel bellek tamponunda yürütülür; ardından derhal bellekten silinir. Yalnızca türetilmiş sayısal eğilim indeksleri yerel cihazınızda saklanır.
        </p>
      </div>

      {/* İzin Kontrolleri Kartı */}
      <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 space-y-5">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Camera className="w-5 h-5 text-cyan-400" />
          <span>Sensör ve Donanım İzinleri</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kamera İzni */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-slate-400" />
                <span>Kabin İçi Kamera</span>
              </div>
              <div className="text-xs text-slate-400">Görme ve Cilt Analizi için</div>
              <div className="text-[11px] font-mono">
                {cameraStatus === 'GRANTED' && <span className="text-emerald-400">● İzin Verildi</span>}
                {cameraStatus === 'DENIED' && <span className="text-rose-400">● İzin Reddedildi</span>}
                {cameraStatus === 'PROMPT' && <span className="text-amber-400">● İzin Bekleniyor</span>}
              </div>
            </div>

            <button
              onClick={handleTestCamera}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Test Et
            </button>
          </div>

          {/* Mikrofon İzni */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                <Mic className="w-4 h-4 text-slate-400" />
                <span>Mikrofon Sistemi</span>
              </div>
              <div className="text-xs text-slate-400">Sesli Ruhsal Asistan için</div>
              <div className="text-[11px] font-mono">
                {micStatus === 'GRANTED' && <span className="text-emerald-400">● İzin Verildi</span>}
                {micStatus === 'DENIED' && <span className="text-rose-400">● İzin Reddedildi</span>}
                {micStatus === 'PROMPT' && <span className="text-amber-400">● İzin Bekleniyor</span>}
              </div>
            </div>

            <button
              onClick={handleTestMic}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Test Et
            </button>
          </div>
        </div>
      </div>

      {/* Veri Saklama Tercihleri */}
      <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 space-y-5">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-400" />
          <span>Yerel Veri Saklama ve Bellek Politikası</span>
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <div className="space-y-1 pr-4">
              <div className="text-sm font-semibold text-white">Mental Seans Özetlerini Sakla</div>
              <p className="text-xs text-slate-400">
                Sadece onaylanan yüksek seviyeli temalar (örn. uyku, stres) saklanır. Ham konuşma dökümü veya ses kaydı tutulmaz.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={saveMentalSummaries}
                onChange={(e) => handleToggleMentalSaving(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500" />
            </label>
          </div>
        </div>
      </div>

      {/* Kayıtlı Sağlık Geçmişi İstatistikleri ve Silme Bölümü */}
      <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 space-y-5">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-400" />
          <span>Yerel Sağlık Geçmişi & Veri Silme</span>
        </h2>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
            <div className="text-xs text-slate-400">Görme Kayıtları</div>
            <div className="text-xl font-bold text-cyan-400 mt-1">{dataStats.visionCount}</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
            <div className="text-xs text-slate-400">Cilt Taramaları</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{dataStats.skinCount}</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
            <div className="text-xs text-slate-400">Mental Seanslar</div>
            <div className="text-xl font-bold text-indigo-400 mt-1">{dataStats.mentalCount}</div>
          </div>
        </div>

        {/* Silme Onay Kutusu veya Butonu */}
        <div className="pt-2">
          {wipeStatus === 'IDLE' && (
            <button
              onClick={() => setWipeStatus('CONFIRM')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 text-xs font-semibold transition-all min-h-touch"
            >
              <Trash2 className="w-4 h-4" />
              <span>Tüm Yerel Sağlık Verilerimi Sil (Geçmişimi Sıfırla)</span>
            </button>
          )}

          {wipeStatus === 'CONFIRM' && (
            <div className="bg-rose-950/40 border border-rose-700/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Bu işlem geri alınamaz!</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Cihazınızda ve yerel bellekte tutulan tüm görme testleri, cilt baz çizgisi referansı, seans özetleri ve randevu bağlamları kalıcı olarak temizlenecektir.
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleWipeAllData}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow"
                >
                  Evet, Tüm Verilerimi Kalıcı Olarak Sil
                </button>
                <button
                  onClick={() => setWipeStatus('IDLE')}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          )}

          {wipeStatus === 'SUCCESS' && (
            <div className="bg-emerald-950/40 border border-emerald-700/80 rounded-xl p-4 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Tüm yerel sağlık verileri ve geçmiş kayıtlar başarıyla sıfırlandı.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
