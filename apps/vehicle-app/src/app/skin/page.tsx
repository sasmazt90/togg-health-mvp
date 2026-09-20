'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useVehicle } from '../../context/VehicleContext';
import {
  Sparkles,
  Camera,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Scan,
  RefreshCw,
  Info
} from 'lucide-react';

export default function SkinPage() {
  const { isParked, state } = useVehicle();
  const [scanState, setScanState] = useState<'READY' | 'ALIGNING' | 'ANALYZING' | 'COMPLETED'>('READY');
  const [activeRegion, setActiveRegion] = useState<string>('rightCheek');

  if (!isParked) {
    return (
      <div className="bg-amber-950/30 border border-amber-800/80 rounded-2xl p-8 text-center max-w-2xl mx-auto my-12 space-y-4">
        <div className="w-16 h-16 bg-amber-900/40 text-amber-400 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-amber-200">Sürüş Güvenliği Kilidi</h1>
        <p className="text-sm text-amber-300/80 leading-relaxed">
          Cilt analizi kamera odaklanması ve yüz hizalaması gerektirdiğinden, sürüş güvenliğiniz için araç hareket halindeyken ({state.currentSpeed} km/s) kullanılamaz.
        </p>
        <p className="text-xs text-slate-400">
          Lütfen aracı güvenli bir şekilde Park (P) moduna alın.
        </p>
      </div>
    );
  }

  const handleStartScan = () => {
    setScanState('ALIGNING');
    setTimeout(() => {
      setScanState('ANALYZING');
      setTimeout(() => {
        setScanState('COMPLETED');
      }, 2500);
    }, 2000);
  };

  const regions = [
    { id: 'forehead', name: 'Alın', change: '+%4', note: 'Normal referans bandında' },
    { id: 'rightCheek', name: 'Sağ Yanak', change: '+%24', note: 'Kızarıklık ve doku görünümünde artış' },
    { id: 'leftCheek', name: 'Sol Yanak', change: '+%6', note: 'Dengeli görünüm' },
    { id: 'nose', name: 'Burun', change: '+%2', note: 'Stabil' },
    { id: 'chin', name: 'Çene', change: '+%3', note: 'Stabil' },
    { id: 'periorbital', name: 'Göz Çevresi', change: '+%9', note: 'Hafif yorgunluk ve gölge eğilimi' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Başlık */}
      <div className="flex items-center justify-between border-b border-cockpit-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-400 rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Cilt Kontrolü ve Değişim Takibi</h1>
            <p className="text-xs text-slate-400">
              MediaPipe Face Mesh bölütleme, CIELAB renk analizi ve zamana yayılan baz çizgi takibi
            </p>
          </div>
        </div>
        <div className="text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
          Park Modu: <strong className="text-emerald-400">Aktif</strong>
        </div>
      </div>

      {/* Hazırlık / Tarayıcı Önizleme */}
      {scanState === 'READY' && (
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white">Zaman İçindeki Cilt Değişim Analizi</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Sistemimiz tek seferlik yanıltıcı bir "cilt puanı" vermek yerine; aynı ışık ve açıda alınan önceki taramalarınızla yeni taramanızı 6 farklı bölgede karşılaştırır.
            </p>
          </div>

          <div className="relative aspect-video max-w-lg mx-auto bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-emerald-500/50 flex items-center justify-center mb-3 animate-pulse">
              <Scan className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="text-sm font-semibold text-slate-200">Kabin İçi Kamera Hazır</div>
            <div className="text-xs text-slate-400 mt-1 max-w-xs">
              Yüzünüzü oval rehber alanın içine yerleştirin ve ortam ışığının doğrudan yüzünüze gelmesini sağlayın.
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleStartScan}
              className="flex items-center gap-2 py-3 px-6 rounded-xl bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 transition-all min-h-touch shadow-lg"
            >
              <span>Hizalama ve Taramayı Başlat</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Hizalama ve Analiz Süreci */}
      {(scanState === 'ALIGNING' || scanState === 'ANALYZING') && (
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-8 space-y-6 text-center">
          <h2 className="text-lg font-bold text-white">
            {scanState === 'ALIGNING' ? 'Yüz Hizalaması Yapılıyor...' : '6 Bölge Ayrıştırılıyor ve Karşılaştırılıyor...'}
          </h2>

          <div className="relative aspect-video max-w-lg mx-auto bg-slate-950 rounded-2xl border border-emerald-500/40 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
            <div className="w-48 h-60 border-2 border-emerald-400 rounded-full relative flex items-center justify-center">
              {/* Tarama Çizgisi */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-bounce" />
              <span className="text-[11px] text-emerald-400 bg-black/60 px-2 py-1 rounded">
                {scanState === 'ALIGNING' ? 'Lütfen kameraya dik bakın' : 'MediaPipe 468 Nokta Analizi'}
              </span>
            </div>

            <div className="mt-4 text-xs text-slate-300">
              {scanState === 'ALIGNING' ? 'Mesafe: 54 cm • Açı: Uygun • Işık: Yeterli' : 'Kızarıklık (CIELAB a*), Pigmentasyon ve Doku Değerleri İşleniyor...'}
            </div>
          </div>
        </div>
      )}

      {/* Tarama Tamamlandı & Karşılaştırma Raporu */}
      {scanState === 'COMPLETED' && (
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
            <div>
              <h2 className="text-xl font-bold text-white">Cilt Değişim Analizi Tamamlandı</h2>
              <p className="text-xs text-slate-400">
                10 Ağustos Baz Çizgi Taraması ile 17 Eylül Taraması Karşılaştırıldı.
              </p>
            </div>
          </div>

          {/* Bölgesel Harita ve Karşılaştırma */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {regions.map((reg) => {
              const isHighlight = reg.id === 'rightCheek';
              return (
                <div
                  key={reg.id}
                  onClick={() => setActiveRegion(reg.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isHighlight
                      ? 'bg-amber-950/20 border-amber-600/80 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{reg.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isHighlight
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {reg.change}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{reg.note}</p>
                </div>
              );
            })}
          </div>

          {/* Değişim Özeti Kutusu */}
          <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-5 text-sm text-amber-200 space-y-2">
            <div className="font-bold flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400" />
              <span>Zaman İçindeki Değişim Bildirimi:</span>
            </div>
            <p className="text-xs text-amber-300/90 leading-relaxed">
              Önceki taramanıza göre sağ yanak bölgesinde kızarıklık ve doku görünümünde %24 belirgin bir değişim gözlendi. Diğer yüz bölgeleri stabil referans aralığındadır.
            </p>
          </div>

          {/* Sorumluluk Reddi */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Bu analiz bir tıbbi tanı değildir. Bir dermatolog değerlendirmesi faydalı olabilir.</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-cockpit-border">
            <button
              onClick={() => setScanState('READY')}
              className="w-full sm:w-auto text-xs text-slate-400 hover:text-white px-4 py-2"
            >
              Taramayı Tekrarla
            </button>

            <Link
              href="/care?specialty=Dermatoloji"
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 transition-all min-h-touch shadow-lg"
            >
              <span>Uygun Dermatologları Bul (Care Agent)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
