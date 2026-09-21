'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Trash2,
  Camera,
  Mic,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  Info
} from 'lucide-react';
import { STORAGE_KEYS, isDemoMode } from '../../utils/attuneMode';

export default function PrivacyPage() {
  const [cameraStatus, setCameraStatus] = useState<'GRANTED' | 'DENIED' | 'PROMPT'>('GRANTED');
  const [micStatus, setMicStatus] = useState<'GRANTED' | 'DENIED' | 'PROMPT'>('GRANTED');
  const [saveMentalSummaries, setSaveMentalSummaries] = useState<boolean>(true);
  const [dataStats, setDataStats] = useState<{
    visionCount: number;
    skinCount: number;
    mentalCount: number;
  }>({ visionCount: 0, skinCount: 0, mentalCount: 0 });

  const [wipeStatus, setWipeStatus] = useState<'IDLE' | 'CONFIRM' | 'SUCCESS'>('IDLE');

  const checkStatus = () => {
    if (typeof window !== 'undefined') {
      // 1. Tarayıcı izin sorgusu ve uygulama içi izin tercihi
      const camPref = localStorage.getItem(STORAGE_KEYS.PRIVACY_CAMERA_ALLOWED);
      if (camPref !== null) {
        setCameraStatus(camPref === 'true' ? 'GRANTED' : 'DENIED');
      } else if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions
          .query({ name: 'camera' as any })
          .then((p) => {
            setCameraStatus(p.state === 'granted' ? 'GRANTED' : p.state === 'denied' ? 'DENIED' : 'PROMPT');
          })
          .catch(() => {});
      }

      const micPref = localStorage.getItem(STORAGE_KEYS.PRIVACY_MIC_ALLOWED);
      if (micPref !== null) {
        setMicStatus(micPref === 'true' ? 'GRANTED' : 'DENIED');
      } else if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions
          .query({ name: 'microphone' as any })
          .then((p) => {
            setMicStatus(p.state === 'granted' ? 'GRANTED' : p.state === 'denied' ? 'DENIED' : 'PROMPT');
          })
          .catch(() => {});
      }

      const mentalPref = localStorage.getItem(STORAGE_KEYS.PRIVACY_MENTAL_SAVE_ALLOWED);
      if (mentalPref !== null) {
        setSaveMentalSummaries(mentalPref === 'true');
      }

      // 2. Gerçek Veri Sayımları (Demo vs Real)
      if (isDemoMode()) {
        setDataStats({ visionCount: 1, skinCount: 2, mentalCount: 2 });
      } else {
        const vCount = localStorage.getItem(STORAGE_KEYS.LATEST_VISION) ? 1 : 0;

        let skinHist: any[] = [];
        try {
          const rawHist = localStorage.getItem(STORAGE_KEYS.SKIN_HISTORY);
          if (rawHist) skinHist = JSON.parse(rawHist);
        } catch {}

        const sCount = skinHist.length > 0
          ? skinHist.length
          : (localStorage.getItem(STORAGE_KEYS.LATEST_SKIN) ? 1 : (localStorage.getItem(STORAGE_KEYS.SKIN_BASELINE) ? 1 : 0));

        const mCount = localStorage.getItem(STORAGE_KEYS.LATEST_MENTAL) ? 1 : 0;

        setDataStats({ visionCount: vCount, skinCount: sCount, mentalCount: mCount });
      }
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleToggleMentalSaving = (val: boolean) => {
    setSaveMentalSummaries(val);
    localStorage.setItem(STORAGE_KEYS.PRIVACY_MENTAL_SAVE_ALLOWED, String(val));
  };

  const handleToggleCamera = () => {
    const next = cameraStatus === 'GRANTED' ? 'DENIED' : 'GRANTED';
    setCameraStatus(next);
    localStorage.setItem(STORAGE_KEYS.PRIVACY_CAMERA_ALLOWED, String(next === 'GRANTED'));
  };

  const handleToggleMic = () => {
    const next = micStatus === 'GRANTED' ? 'DENIED' : 'GRANTED';
    setMicStatus(next);
    localStorage.setItem(STORAGE_KEYS.PRIVACY_MIC_ALLOWED, String(next === 'GRANTED'));
  };

  const handleWipeAllData = async () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.LATEST_VISION);
      localStorage.removeItem(STORAGE_KEYS.LATEST_SKIN);
      localStorage.removeItem(STORAGE_KEYS.SKIN_BASELINE);
      localStorage.removeItem(STORAGE_KEYS.SKIN_HISTORY);
      localStorage.removeItem(STORAGE_KEYS.LATEST_MENTAL);
      localStorage.removeItem(STORAGE_KEYS.REFERRAL_CONTEXT);
      localStorage.removeItem(STORAGE_KEYS.DEMO_SKIN_RESULT);
      localStorage.removeItem(STORAGE_KEYS.DEMO_REFERRAL);

      await fetch('http://localhost:8000/api/privacy/wipe', { method: 'POST' }).catch(() => {});

      setDataStats({ visionCount: 0, skinCount: 0, mentalCount: 0 });
      setWipeStatus('SUCCESS');
      setTimeout(() => setWipeStatus('IDLE'), 3500);
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. SCREEN 10: ÜST BAŞLIK VE AÇIKLAMA (FIRST VIEWPORT) */}
      <section className="bg-gradient-to-br from-cockpit-surface via-[#071322] to-cockpit-bg border border-white/10 rounded-2xl p-6 md:p-7 shadow-2xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-togg-turquoise/10 border border-togg-turquoise/30 text-togg-turquoise text-[11px] font-semibold tracking-wider uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Yerel Gizlilik ve Veri Güvenliği</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Verileriniz sizin kontrolünüzde.
            </h1>

            <p className="text-sm text-slate-300">
              Attune.more sağlık verilerini local-first ve izin odaklı işler.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs bg-slate-950/80 px-4 py-2 rounded-xl border border-white/10 text-slate-300 shrink-0 self-start md:self-auto">
            <Lock className="w-3.5 h-3.5 text-togg-turquoise" />
            <span>Local-First Depolama: <strong>Aktif</strong></span>
          </div>
        </div>
      </section>

      {/* 2. ÜÇ BÜYÜK TERCİH KAROSU (3 LARGE PREFERENCE TILES) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Karo 1: KAMERA */}
        <div className="bg-cockpit-surface border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:border-white/20 transition-all shadow-xl space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-togg-darkBlue/80 border border-togg-darkTurquoise/50 text-togg-turquoise rounded-xl">
                <Camera className="w-6 h-6" />
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                  cameraStatus === 'GRANTED'
                    ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/70'
                    : cameraStatus === 'DENIED'
                    ? 'bg-rose-950/70 text-rose-400 border border-rose-800/70'
                    : 'bg-amber-950/70 text-amber-400 border border-amber-800/70'
                }`}
              >
                {cameraStatus === 'GRANTED' ? 'Açık' : cameraStatus === 'DENIED' ? 'Kapalı' : 'Sorulacak'}
              </span>
            </div>

            <div>
              <h2 className="text-base font-bold text-white">Kabin Kamerası</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Yalnızca görme mesafesi ve cilt analizi sırasında yüz ROI tespiti için anlık kullanılır; ham görüntü kaydedilmez.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Uygulama İzni</span>
            <button
              onClick={handleToggleCamera}
              className="text-xs font-semibold text-togg-turquoise hover:underline"
            >
              {cameraStatus === 'GRANTED' ? 'Erişimi Kapat' : 'İzin Ver'}
            </button>
          </div>
        </div>

        {/* Karo 2: MİKROFON */}
        <div className="bg-cockpit-surface border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:border-white/20 transition-all shadow-xl space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-togg-darkBlue/80 border border-togg-darkTurquoise/50 text-togg-turquoise rounded-xl">
                <Mic className="w-6 h-6" />
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                  micStatus === 'GRANTED'
                    ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/70'
                    : micStatus === 'DENIED'
                    ? 'bg-rose-950/70 text-rose-400 border border-rose-800/70'
                    : 'bg-amber-950/70 text-amber-400 border border-amber-800/70'
                }`}
              >
                {micStatus === 'GRANTED' ? 'Açık' : micStatus === 'DENIED' ? 'Kapalı' : 'Sorulacak'}
              </span>
            </div>

            <div>
              <h2 className="text-base font-bold text-white">Kabin Mikrofonu</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Yalnızca sesli asistan diyalogları için kullanılır. Ses akışı RAM üzerinde işlenir, ses kaydı saklanmaz.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Uygulama İzni</span>
            <button
              onClick={handleToggleMic}
              className="text-xs font-semibold text-togg-turquoise hover:underline"
            >
              {micStatus === 'GRANTED' ? 'Erişimi Kapat' : 'İzin Ver'}
            </button>
          </div>
        </div>

        {/* Karo 3: SEANS HAFIZASI */}
        <div className="bg-cockpit-surface border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:border-white/20 transition-all shadow-xl space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-togg-darkBlue/80 border border-togg-darkTurquoise/50 text-togg-turquoise rounded-xl">
                <Database className="w-6 h-6" />
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                  saveMentalSummaries
                    ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/70'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {saveMentalSummaries ? 'Açık' : 'Kapalı'}
              </span>
            </div>

            <div>
              <h2 className="text-base font-bold text-white">Seans Hafızası</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Yalnızca yüksek seviyeli temalar (uyku, iş stresi) cihazda yerel saklanır.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Yerel Saklama</span>
            <button
              onClick={() => handleToggleMentalSaving(!saveMentalSummaries)}
              className="text-xs font-semibold text-togg-turquoise hover:underline"
            >
              {saveMentalSummaries ? 'Devre Dışı Bırak' : 'Etkinleştir'}
            </button>
          </div>
        </div>
      </section>

      {/* 3. BELOW FOLD: YEREL VERİ YÖNETİMİ VE SİLME */}
      <section className="bg-cockpit-surface border border-white/10 rounded-2xl p-6 md:p-7 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-togg-turquoise" />
              <span>Kayıtlı Yerel Sağlık Verileri</span>
            </h2>
            <p className="text-xs text-slate-400">
              Bu cihazda yerel olarak tutulan test ve seans özetleri.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
            <div className="text-xs text-slate-400">Görme Kayıtları</div>
            <div className="text-2xl font-bold text-togg-turquoise mt-1 font-mono">{dataStats.visionCount}</div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
            <div className="text-xs text-slate-400">Cilt Taramaları</div>
            <div className="text-2xl font-bold text-togg-turquoise mt-1 font-mono">{dataStats.skinCount}</div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
            <div className="text-xs text-slate-400">Mental Seanslar</div>
            <div className="text-2xl font-bold text-togg-turquoise mt-1 font-mono">{dataStats.mentalCount}</div>
          </div>
        </div>

        {/* TÜM YEREL VERİLERİ SİL BUTONU */}
        <div className="pt-2">
          {wipeStatus === 'IDLE' && (
            <button
              onClick={() => setWipeStatus('CONFIRM')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-800/80 text-xs font-bold transition-all min-h-touch"
            >
              <Trash2 className="w-4 h-4" />
              <span>TÜM YEREL VERİLERİ SİL</span>
            </button>
          )}

          {wipeStatus === 'CONFIRM' && (
            <div className="bg-rose-950/40 border border-rose-700/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Bu işlem yerel bellekteki tüm kayıtları kalıcı olarak temizler!</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tüm görme testleri, cilt baz çizgisi ve seans hafızası sıfırlanacaktır.
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleWipeAllData}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow"
                >
                  Evet, Tüm Verileri Sil
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
              <span>Tüm yerel veriler başarıyla temizlendi.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
