'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useVehicle } from '../../context/VehicleContext';
import {
  Eye,
  Camera,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ChevronRight
} from 'lucide-react';

export default function VisionPage() {
  const { isParked, state } = useVehicle();
  const [testStep, setTestStep] = useState<'IDLE' | 'CALIBRATION' | 'TESTING' | 'COMPLETED'>('IDLE');
  const [activeEye, setActiveEye] = useState<'RIGHT' | 'LEFT'>('RIGHT');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(1);
  const [distanceCm, setDistanceCm] = useState<number>(55);
  const [optotypeRotation, setOptotypeRotation] = useState<number>(0); // 0, 90, 180, 270

  // Sürüş modunda erişim engeli
  if (!isParked) {
    return (
      <div className="bg-amber-950/30 border border-amber-800/80 rounded-2xl p-8 text-center max-w-2xl mx-auto my-12 space-y-4">
        <div className="w-16 h-16 bg-amber-900/40 text-amber-400 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-amber-200">Sürüş Güvenliği Kilidi</h1>
        <p className="text-sm text-amber-300/80 leading-relaxed">
          Görme Kontrolü testi ekrana odaklanma ve göz kapatma gerektirdiğinden, sürüş güvenliğiniz için araç hareket halindeyken ({state.currentSpeed} km/s) başlatılamaz.
        </p>
        <p className="text-xs text-slate-400">
          Lütfen aracı güvenli bir şekilde Park (P) moduna alın.
        </p>
      </div>
    );
  }

  const handleStartCalibration = () => {
    setTestStep('CALIBRATION');
  };

  const handleCalibrationConfirmed = () => {
    setTestStep('TESTING');
    setActiveEye('RIGHT');
    setCurrentStepIndex(1);
    setOptotypeRotation(90);
  };

  const handleDirectionClick = (direction: 'UP' | 'RIGHT' | 'DOWN' | 'LEFT') => {
    if (currentStepIndex < 4) {
      setCurrentStepIndex(currentStepIndex + 1);
      setOptotypeRotation((prev) => (prev + 90) % 360);
    } else if (activeEye === 'RIGHT') {
      setActiveEye('LEFT');
      setCurrentStepIndex(1);
      setOptotypeRotation(180);
    } else {
      setTestStep('COMPLETED');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Başlık Alanı */}
      <div className="flex items-center justify-between border-b border-cockpit-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-400 rounded-xl">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Görme Kontrolü ve Ön Değerlendirme</h1>
            <p className="text-xs text-slate-400">
              Landolt C optotip yönelimi, mesafe kalibrasyonu ve kontrast hassasiyeti
            </p>
          </div>
        </div>
        <div className="text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
          Park Modu: <strong className="text-emerald-400">Aktif</strong>
        </div>
      </div>

      {/* Adım 1: Başlangıç Paneli */}
      {testStep === 'IDLE' && (
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white">Test Öncesi Hazırlık</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Bu test, araç kabin içi kamerasını kullanarak ekrana olan mesafenizi doğrular ve sağ/sol göz keskinliğinizi Landolt C halkası açıklık yönünü belirleyerek değerlendirir.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="text-xs text-cyan-400 font-semibold">1. Mesafe Kalibrasyonu</div>
              <p className="text-xs text-slate-400">
                Ekrana yaklaşık 50-60 cm uzaklıkta dik bir pozisyonda oturun.
              </p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="text-xs text-cyan-400 font-semibold">2. Sırayla Göz Kapatma</div>
              <p className="text-xs text-slate-400">
                Önce sol gözünüzü hafifçe kapatıp sağ gözünüzle halka yönünü seçin.
              </p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="text-xs text-cyan-400 font-semibold">3. Kontrast Eşiği</div>
              <p className="text-xs text-slate-400">
                Açık gri zemin üzerinde kontrast hassasiyetiniz karşılaştırılacaktır.
              </p>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={handleStartCalibration}
              className="flex items-center gap-2 py-3 px-6 rounded-xl bg-cyan-500 text-black font-semibold text-sm hover:bg-cyan-400 transition-all min-h-touch"
            >
              <span>Kamera Kalibrasyonunu Başlat</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Adım 2: Kamera & Mesafe Kalibrasyonu */}
      {testStep === 'CALIBRATION' && (
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 md:p-8 space-y-6 text-center">
          <h2 className="text-lg font-bold text-white">Ekran Mesafesi Kalibrasyonu</h2>
          <div className="relative max-w-md mx-auto aspect-video bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center p-4 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/20 to-transparent pointer-events-none" />
            <Camera className="w-12 h-12 text-cyan-400 animate-pulse mb-2" />
            <div className="text-sm font-semibold text-slate-200">Kamera Algılandı: Kabin Sensörü</div>
            <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Göz Bebeği Mesafesi (IPD): Kalibre Edildi
            </div>
            <div className="mt-4 bg-slate-900/90 px-4 py-2 rounded-lg border border-slate-700 text-xs text-slate-300">
              Tahmini Mesafe: <strong className="text-cyan-400 text-sm">{distanceCm} cm</strong> (İdeal Aralık: 50-60 cm)
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => setDistanceCm(55)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Yeniden Ölç
            </button>
            <button
              onClick={handleCalibrationConfirmed}
              className="py-3 px-6 rounded-xl bg-cyan-500 text-black font-semibold text-sm hover:bg-cyan-400 transition-all min-h-touch"
            >
              Mesafe Uygun, Testi Başlat
            </button>
          </div>
        </div>
      )}

      {/* Adım 3: Test Akışı (Landolt C) */}
      {testStep === 'TESTING' && (
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 md:p-8 space-y-8 text-center">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
            <div>
              Aktif Test: <strong className="text-cyan-400">{activeEye === 'RIGHT' ? 'SAĞ GÖZ (Sol Gözünüzü Kapatın)' : 'SOL GÖZ (Sağ Gözünüzü Kapatın)'}</strong>
            </div>
            <div>
              Aşama: {currentStepIndex} / 4
            </div>
          </div>

          <div className="py-8 flex flex-col items-center justify-center">
            <div className="text-xs text-slate-400 mb-6">
              Aşağıdaki halkanın açık olan ucu hangi yöne bakıyor?
            </div>

            {/* Landolt C Optotipi */}
            <div
              className="w-24 h-24 rounded-full border-8 border-cyan-400 relative flex items-center justify-center transition-transform duration-300"
              style={{ transform: `rotate(${optotypeRotation}deg)` }}
            >
              {/* Halkanın boşluk kesiti */}
              <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-6 h-6 bg-cockpit-surface" />
            </div>
          </div>

          {/* 4 Yön Dokunmatik Seçim Butonları */}
          <div className="max-w-xs mx-auto grid grid-cols-3 gap-2">
            <div />
            <button
              onClick={() => handleDirectionClick('UP')}
              className="p-4 bg-slate-900 border border-slate-700 rounded-xl hover:bg-cyan-500 hover:text-black font-bold text-sm transition-all"
            >
              ▲ Yukarı
            </button>
            <div />
            <button
              onClick={() => handleDirectionClick('LEFT')}
              className="p-4 bg-slate-900 border border-slate-700 rounded-xl hover:bg-cyan-500 hover:text-black font-bold text-sm transition-all"
            >
              ◄ Sol
            </button>
            <div className="p-4 flex items-center justify-center text-xs text-slate-500">Yön</div>
            <button
              onClick={() => handleDirectionClick('RIGHT')}
              className="p-4 bg-slate-900 border border-slate-700 rounded-xl hover:bg-cyan-500 hover:text-black font-bold text-sm transition-all"
            >
              Sağ ►
            </button>
            <div />
            <button
              onClick={() => handleDirectionClick('DOWN')}
              className="p-4 bg-slate-900 border border-slate-700 rounded-xl hover:bg-cyan-500 hover:text-black font-bold text-sm transition-all"
            >
              ▼ Aşağı
            </button>
            <div />
          </div>
        </div>
      )}

      {/* Adım 4: Sonuç ve Care Agent'a Yönlendirme */}
      {testStep === 'COMPLETED' && (
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
            <div>
              <h2 className="text-xl font-bold text-white">Görme Değerlendirmesi Tamamlandı</h2>
              <p className="text-xs text-slate-400">Sonuçlar ortak sağlık profilinize kaydedildi.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="text-xs text-slate-400">Görme Keskinliği (Snellen / LogMAR)</div>
              <div className="flex justify-between items-baseline pt-1">
                <div>
                  <span className="text-xs text-slate-400">Sağ Göz: </span>
                  <strong className="text-lg text-amber-400">20/30</strong>
                  <span className="text-[10px] text-slate-500 ml-1">(0.18 LogMAR)</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Sol Göz: </span>
                  <strong className="text-lg text-slate-200">20/24</strong>
                  <span className="text-[10px] text-slate-500 ml-1">(0.08 LogMAR)</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="text-xs text-slate-400">Kontrast Hassasiyeti</div>
              <div className="text-lg font-bold text-amber-400 pt-1">
                1.55 LogCS <span className="text-xs font-normal text-slate-400">(Referans: 1.65 - 1.95)</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-4 text-sm text-amber-200 space-y-1">
            <strong>Zaman İçindeki Değişim Notu:</strong>
            <p className="text-xs text-amber-300/90 leading-relaxed">
              Önceki ölçümünüze (15 Ağustos) göre sağ göz kontrast hassasiyetinizde ve keskinlik değerinizde görsel bir değişim gözlendi.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Bu sonuç tıbbi tanı değildir. Bir göz doktoruyla görüşmeniz faydalı olabilir.</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-cockpit-border">
            <button
              onClick={() => setTestStep('IDLE')}
              className="w-full sm:w-auto text-xs text-slate-400 hover:text-white px-4 py-2"
            >
              Testi Tekrarla
            </button>

            <Link
              href="/care?specialty=G%C3%B6z%20Hastal%C4%B1klar%C4%B1"
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-cyan-500 text-black font-semibold text-sm hover:bg-cyan-400 transition-all min-h-touch shadow-lg"
            >
              <span>Uygun Göz Doktorlarını Bul (Care Agent)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
