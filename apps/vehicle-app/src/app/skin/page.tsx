'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useVehicle } from '../../context/VehicleContext';
import {
  SkinAnalyzer,
  FaceAlignment,
  ImageQuality,
  RegionMetrics,
  SkinAnalysisResult
} from '../../utils/skinAnalyzer';
import {
  Sparkles,
  Camera,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Scan,
  RefreshCw,
  Info,
  Sliders,
  AlertCircle,
  VideoOff,
  Cpu
} from 'lucide-react';

export default function SkinPage() {
  const router = useRouter();
  const { isParked, state } = useVehicle();

  const [scanState, setScanState] = useState<'READY' | 'CAMERA_ACTIVE' | 'ANALYZING' | 'COMPLETED'>('READY');
  const [activeRegionId, setActiveRegionId] = useState<string>('rightCheek');

  // Video & Canvas referansları
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMediaPipeLoaded, setIsMediaPipeLoaded] = useState<boolean>(false);

  // Canlı hizalama ve kalite durumu
  const [alignment, setAlignment] = useState<FaceAlignment>({
    faceDetected: false,
    isMediaPipeActive: false,
    yaw: 0,
    pitch: 0,
    roll: 0,
    scaleRatio: 0,
    isAligned: false,
    guidanceTextTr: 'Kamera hazırlanıyor...'
  });
  const [quality, setQuality] = useState<ImageQuality>({
    isValid: true,
    avgLuminance: 120,
    blurScore: 10,
    status: 'OPTIMAL'
  });

  // Analiz sonuçları (Asla sentetik fallback içermez)
  const [analysisResult, setAnalysisResult] = useState<SkinAnalysisResult | null>(null);

  // MediaPipe FaceLandmarker'ı başlat
  useEffect(() => {
    let isMounted = true;
    SkinAnalyzer.getFaceLandmarker().then((landmarker) => {
      if (isMounted && landmarker) {
        setIsMediaPipeLoaded(true);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Temizlik
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mediaStream]);

  // Sürüş modunda erişim engeli
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

  // Kamerayı başlat
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      setMediaStream(stream);
      setScanState('CAMERA_ACTIVE');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Kamera açılamadı:', err);
      setCameraError('Kameraya erişilemedi. Lütfen tarayıcı izinlerinizi kontrol edin.');
    }
  };

  // Canlı analiz döngüsü (her 250ms)
  useEffect(() => {
    if (scanState !== 'CAMERA_ACTIVE' || !videoRef.current || !canvasRef.current) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const w = 320;
      const h = 240;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(video, 0, 0, w, h);

      // Yüz geometrisi ve hizalama
      const align = SkinAnalyzer.assessAlignment(ctx, w, h);
      setAlignment(align);

      // Kalite kontrolü
      const q = SkinAnalyzer.checkQuality(ctx, w, h, align.faceDetected);
      setQuality(q);
    }, 250);

    return () => clearInterval(interval);
  }, [scanState]);

  // Taramayı gerçekleştir
  const handlePerformScan = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    setScanState('ANALYZING');

    setTimeout(() => {
      const w = canvas.width;
      const h = canvas.height;

      // 6 ROI bölgesini gerçek landmarklar üzerinden hesapla
      const regionMetrics = SkinAnalyzer.analyzeRegions(ctx, w, h, alignment);

      // Baz çizgi (Baseline) okuma ve karşılaştırma
      let storedBaseline: Record<string, RegionMetrics> | null = null;
      try {
        const raw = localStorage.getItem('togg_health_skin_baseline');
        if (raw) storedBaseline = JSON.parse(raw);
      } catch (e) {
        console.warn(e);
      }

      const comparison = SkinAnalyzer.compareWithBaseline(regionMetrics, storedBaseline, 20.0);

      // Eğer ilk taramaysa baseline olarak kaydet
      if (comparison.isBaseline) {
        try {
          localStorage.setItem('togg_health_skin_baseline', JSON.stringify(regionMetrics));
        } catch (e) {
          console.warn(e);
        }
      }

      const finalResult: SkinAnalysisResult = {
        id: `skin-${Date.now()}`,
        timestamp: new Date().toISOString(),
        quality,
        regions: comparison.comparedRegions,
        highestChangeRegion: comparison.highestChangeRegion,
        highestChangePct: comparison.highestChangePct,
        referralSuggested: comparison.referralSuggested,
        isBaseline: comparison.isBaseline,
        clinicalNoteTr: comparison.clinicalNoteTr,
        usedMediaPipe: alignment.isMediaPipeActive
      };

      setAnalysisResult(finalResult);

      // Geçmişe kaydet (Ham görüntü ASLA kaydedilmez!)
      try {
        localStorage.setItem('togg_health_latest_skin', JSON.stringify(finalResult));
      } catch (e) {
        console.warn(e);
      }

      // Kamerayı kapat
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
        setMediaStream(null);
      }

      setScanState('COMPLETED');
    }, 1200);
  };

  // Care Agent'a yönlendirme
  const handleNavigateToCare = () => {
    const referralContext = {
      sourceModule: 'SKIN',
      specialty: 'Dermatoloji',
      reasonSummary: analysisResult?.clinicalNoteTr || 'Cilt kontrolü görsel değişim eğilimi.',
      timestamp: new Date().toISOString(),
      metricsSummary: {
        highestChangeRegion: analysisResult?.highestChangeRegion,
        highestChangePct: analysisResult?.highestChangePct
      }
    };
    try {
      localStorage.setItem('togg_active_referral_context', JSON.stringify(referralContext));
    } catch (e) {
      console.warn(e);
    }
    router.push('/care?specialty=Dermatoloji&from=skin');
  };

  const regionList = analysisResult ? Object.values(analysisResult.regions) : [];

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
              Canlı kamera akışı, 6 yüz ROI analizi, ışık/bulanıklık filtreleri ve zamana yayılan referans takibi
            </p>
          </div>
        </div>
        <div className="text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
          Park Modu: <strong className="text-emerald-400">Aktif</strong>
        </div>
      </div>

      {/* GİZLİ ANALİZ KANVASI */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ADIM 1: HAZIRLIK EKRANI */}
      {scanState === 'READY' && (
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white">Zaman İçindeki Cilt Değişim Analizi</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Sistemimiz tek seferlik yanıltıcı bir "cilt puanı" veya tıbbi tanı vermek yerine; aynı ışık ve açıda alınan önceki referans taramanızla yeni taramanızı 6 farklı bölgede (alın, yanaklar, burun, çene, göz çevresi) piksel seviyesinde karşılaştırır.
            </p>
          </div>

          <div className="relative aspect-video max-w-lg mx-auto bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-emerald-500/50 flex items-center justify-center mb-3 animate-pulse">
              <Scan className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="text-sm font-semibold text-slate-200">Kabin İçi Kamera Hazır</div>
            <div className="text-xs text-slate-400 mt-1 max-w-xs">
              Kamerayı açarak yüzünüzü rehber çerçeve içine hizalayın.
            </div>
          </div>

          {cameraError && (
            <div className="bg-amber-950/40 border border-amber-800 p-3 rounded-xl text-xs text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              onClick={startCamera}
              className="flex items-center gap-2 py-3 px-6 rounded-xl bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 transition-all min-h-touch shadow-lg"
            >
              <span>Kamerayı Aç ve Hizalamayı Başlat</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ADIM 2: CANLI KAMERA HİZALAMA VE KALİTE REHBERLİĞİ */}
      {scanState === 'CAMERA_ACTIVE' && (
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 md:p-8 space-y-6 text-center">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Yüz Açısı ve Görüntü Kalitesi Hizalaması</h2>
            <p className="text-xs text-slate-400">
              Doğru karşılaştırma için yüzünüzü oval rehber alanın içine getirin ve dik bakın.
            </p>
          </div>

          {/* Canlı Video ve HUD Katmanı */}
          <div className="relative max-w-lg mx-auto aspect-video bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Dinamik HUD Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
              <div className="flex justify-between items-center text-[10px] bg-black/70 px-3 py-1.5 rounded-lg text-slate-300 backdrop-blur-sm">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  CANLI AKIŞ
                </span>
                <span className="text-emerald-400 font-mono">
                  Işık: {quality.status === 'OPTIMAL' ? 'Yeterli' : quality.status}
                </span>
              </div>

              {/* Yüz Oval Çerçevesi */}
              <div
                className={`w-44 h-56 border-2 rounded-[50%] mx-auto self-center transition-all duration-200 flex items-center justify-center ${
                  alignment.isAligned && quality.isValid
                    ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                    : 'border-amber-400/80 border-dashed'
                }`}
              >
                <div className="w-1.5 h-1.5 bg-cyan-400/60 rounded-full" />
              </div>

              {/* Dinamik Rehberlik Metni */}
              <div
                className={`px-4 py-2 rounded-xl text-xs font-semibold backdrop-blur-md transition-all ${
                  alignment.isAligned && quality.isValid
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700'
                    : 'bg-amber-950/80 text-amber-300 border border-amber-700'
                }`}
              >
                {quality.warningMessageTr || alignment.guidanceTextTr}
              </div>
            </div>
          </div>

          {/* Hizalama & Kalite Telemetri İpuçları */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-left max-w-lg mx-auto text-xs text-slate-400">
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-500">Yüz Tespiti</div>
              <div className={alignment.faceDetected ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {alignment.faceDetected ? 'Algılandı' : 'Bekleniyor'}
              </div>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-500">Açı (Yaw / Pitch)</div>
              <div className="text-slate-200 font-mono">
                {alignment.yaw > 0 ? `+${alignment.yaw}` : alignment.yaw} / {alignment.pitch}
              </div>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-500">Işık Seviyesi</div>
              <div className="text-slate-200 font-mono">{quality.avgLuminance.toFixed(0)} / 255</div>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-500">Netlik Skoru</div>
              <div className="text-emerald-400 font-mono">{quality.blurScore.toFixed(1)}</div>
            </div>
          </div>

          {/* Eylem Butonları */}
          <div className="flex justify-center gap-4 pt-2">
            <button
              onClick={() => {
                if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());
                setScanState('READY');
              }}
              className="text-xs text-slate-400 hover:text-white px-4 py-2"
            >
              Vazgeç
            </button>

            <button
              onClick={handlePerformScan}
              disabled={!alignment.faceDetected || !quality.isValid}
              className={`py-3 px-6 rounded-xl font-semibold text-sm transition-all min-h-touch shadow-lg ${
                alignment.faceDetected && quality.isValid
                  ? 'bg-emerald-500 text-black hover:bg-emerald-400 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              Taramayı Başlat ve Bölgeleri Ayrıştır
            </button>
          </div>
        </div>
      )}

      {/* ADIM 3: ANALİZ EDİLİYOR EKRANI */}
      {scanState === 'ANALYZING' && (
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-lg font-bold text-white">6 Bölge Piksel Analizi Yapılıyor...</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Alın, yanaklar, burun, çene ve göz çevresi pikselleri okunuyor; kızarıklık eğilimi, ton ve doku değişim göstergeleri hesaplanıyor.
          </p>
        </div>
      )}

      {/* ADIM 4: SONUÇ RAPORU & DEĞİŞİM KARŞILAŞTIRMASI */}
      {scanState === 'COMPLETED' && (
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-8 h-8 shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-white">Cilt Değişim Analizi Tamamlandı</h2>
              <p className="text-xs text-slate-400">
                {analysisResult?.isBaseline
                  ? 'İlk referans taramanız kaydedildi. Gelecek taramalarda değişimler bu referansa göre karşılaştırılacaktır.'
                  : 'Kayıtlı baz çizgi referansı ile yeni tarama karşılaştırıldı.'}
              </p>
            </div>
          </div>

          {/* Bölgesel Kartlar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {regionList.map((reg) => {
              const delta = reg.changeFromBaselinePct ?? 0;
              const isHighest = analysisResult?.highestChangeRegion === reg.nameTr && Math.abs(delta) >= 15;

              return (
                <div
                  key={reg.id}
                  onClick={() => setActiveRegionId(reg.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isHighest
                      ? 'bg-amber-950/30 border-amber-600/80 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{reg.nameTr}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold font-mono ${
                        isHighest
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : delta > 0
                          ? 'bg-slate-800 text-slate-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {delta >= 0 ? `+${delta}%` : `${delta}%`}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-[11px] text-slate-400">
                    <div className="flex justify-between">
                      <span>Kızarıklık Eğilimi:</span>
                      <strong className="text-slate-200">{reg.rednessScore} / 100</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Cilt Tonu/Parlaklık:</span>
                      <strong className="text-slate-200">%{reg.luminanceScore}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Doku Göstergesi:</span>
                      <strong className="text-slate-200">{reg.textureVariance}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Non-klinik Değişim Notu */}
          <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-5 text-sm text-amber-200 space-y-2">
            <div className="font-bold flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Görsel Değişim Eğilimi Notu:</span>
            </div>
            <p className="text-xs text-amber-300/90 leading-relaxed">
              {analysisResult?.clinicalNoteTr ||
                'Bölgesel görsel ölçümler baz çizgi referans bandında seyretmektedir.'}
            </p>
          </div>

          {/* Sorumluluk Reddi */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              Bu analiz tıbbi bir tanı veya klinik muayene değildir; piksel renk kanalları ve doku gradyanı trend takibidir. Ham yüz görüntüleri hiçbir zaman kalıcı olarak diske veya sunucuya kaydedilmez.
            </span>
          </div>

          {/* Alt Aksiyonlar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-cockpit-border">
            <button
              onClick={() => {
                setScanState('READY');
                setAnalysisResult(null);
              }}
              className="w-full sm:w-auto text-xs text-slate-400 hover:text-white px-4 py-2"
            >
              Taramayı Tekrarla
            </button>

            <button
              onClick={handleNavigateToCare}
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 transition-all min-h-touch shadow-lg"
            >
              <span>Dermatologları İncele (Care Agent)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
