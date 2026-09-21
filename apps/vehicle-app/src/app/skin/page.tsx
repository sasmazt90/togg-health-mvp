'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  SkinRegionId,
  REGION_ORDER,
  SKIN_REGIONS,
  SkinRegionData,
  getRegionData,
  buildSkinRegionViewModel
} from '../../data/skinDemoFixture';
import { isDemoMode, STORAGE_KEYS, isCameraAllowed } from '../../utils/attuneMode';
import { SkinStartView } from '../../components/skin/SkinStartView';
import { SkinActiveScan } from '../../components/skin/SkinActiveScan';
import { SkinResultView } from '../../components/skin/SkinResultView';
import { SkinTrendModal } from '../../components/skin/SkinTrendModal';
import { SkinObservationModal } from '../../components/skin/SkinObservationModal';
import { SkinActionsModal } from '../../components/skin/SkinActionsModal';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';

export default function SkinPage() {
  const router = useRouter();
  const { isParked, state } = useVehicle();

  const [scanState, setScanState] = useState<'READY' | 'CAMERA_ACTIVE' | 'COMPLETED' | 'ERROR'>('READY');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [selectedRegionId, setSelectedRegionId] = useState<SkinRegionId>('rightCheek');
  const [activeModal, setActiveModal] = useState<'trend' | 'observation' | 'actions' | null>(null);

  // Video & Canvas referansları (MediaPipe kamera ve analiz motoru)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isMediaPipeLoaded, setIsMediaPipeLoaded] = useState<boolean>(false);
  const [isLiveVideo, setIsLiveVideo] = useState<boolean>(false);

  // Hizalama ve kalite telemetrisi
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
  const [guidanceText, setGuidanceText] = useState<string>('Lütfen başınızı sabit tutun.');

  const [analysisResult, setAnalysisResult] = useState<SkinAnalysisResult | null>(null);

  // Real-time döngü referansları
  const animFrameIdRef = useRef<number | null>(null);
  const consecutiveValidFramesRef = useRef<number>(0);

  // URL parametresi ile durum ve test yönetimi
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const stateParam = params.get('state');
    const resultParam = params.get('result');
    const regionParam = params.get('region');
    const modalParam = params.get('modal');

    if (stateParam === 'ready') {
      setScanState('READY');
    } else if (stateParam === 'active') {
      setScanState('CAMERA_ACTIVE');
      setScanProgress(75);
    } else if (stateParam === 'completed' || resultParam === 'true') {
      setScanState('COMPLETED');
    }

    if (regionParam) {
      const match = REGION_ORDER.find(
        (id, idx) => id.toLowerCase() === regionParam.toLowerCase() || String(idx + 1) === regionParam
      );
      if (match) setSelectedRegionId(match);
    }

    if (modalParam === 'trend') setActiveModal('trend');
    else if (modalParam === 'observation') setActiveModal('observation');
    else if (modalParam === 'actions') setActiveModal('actions');
  }, []);

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

  // Temizlik: Kamera akışını ve animasyon karesini durdur
  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mediaStream]);

  // Klavye ile döngüsel bölge navigasyonu ve modal kontrolü
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeModal !== null) {
        if (e.key === 'Escape') setActiveModal(null);
        return;
      }
      if (scanState !== 'COMPLETED') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevRegion();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextRegion();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scanState, activeModal, selectedRegionId]);

  // Döngüsel bölge navigasyonu
  const handlePrevRegion = () => {
    const currentIdx = REGION_ORDER.indexOf(selectedRegionId);
    const prevIdx = (currentIdx - 1 + REGION_ORDER.length) % REGION_ORDER.length;
    setSelectedRegionId(REGION_ORDER[prevIdx]);
  };

  const handleNextRegion = () => {
    const currentIdx = REGION_ORDER.indexOf(selectedRegionId);
    const nextIdx = (currentIdx + 1) % REGION_ORDER.length;
    setSelectedRegionId(REGION_ORDER[nextIdx]);
  };

  // Sürüş emniyeti kilidi
  if (!isParked) {
    return (
      <div className="bg-gradient-to-b from-slate-900/90 to-[#0B1526]/90 border border-amber-500/50 rounded-3xl p-10 text-center max-w-xl mx-auto my-12 space-y-6 shadow-[0_0_50px_rgba(245,158,11,0.15)] backdrop-blur-xl">
        <div className="w-20 h-20 bg-amber-500/15 border border-amber-500/40 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-10 h-10 animate-pulse" />
        </div>
        <div className="space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
            Sürüş Emniyeti Devrede • {state.currentSpeed} km/s
          </span>
          <h1 className="text-2xl font-extrabold text-white">Cilt Kontrolü Kilitlendi</h1>
          <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
            Cilt analizi kamera odaklanması ve yüz hizalaması gerektirdiğinden, sürüş güvenliğiniz için araç hareket halindeyken kullanılamaz.
          </p>
        </div>
        <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Lütfen aracı güvenli bir alanda <strong>Park (P)</strong> moduna alın.</span>
        </div>
      </div>
    );
  }

  // Taramayı başarıyla tamamlama fonksiyonu
  const finishScan = (isDemo: boolean = false) => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (isDemo) {
      // DEMO MODE: Fikstür verisini kullanır, gerçek kullanıcı anahtarını bozmaz
      const demoResult: SkinAnalysisResult = {
        id: `demo-skin-${Date.now()}`,
        timestamp: new Date().toISOString(),
        quality: { isValid: true, avgLuminance: 120, blurScore: 8.5, status: 'OPTIMAL' },
        regions: getDefaultEngineRegions(),
        highestChangeRegion: 'Sağ Yanak',
        highestChangePct: 22,
        referralSuggested: true,
        isBaseline: false,
        clinicalNoteTr: 'Sağ yanak bölgesinde baz çizgi referansına göre %22 görsel değişim gözlendi.',
        usedMediaPipe: true
      };

      try {
        localStorage.setItem(STORAGE_KEYS.DEMO_SKIN_RESULT, JSON.stringify(demoResult));
      } catch {}

      setAnalysisResult(demoResult);
      setSelectedRegionId('rightCheek');
      setScanState('COMPLETED');
      return;
    }

    // REAL MODE: Yalnızca MediaPipe aktifse ve doğrulanmışsa hesaplar
    const canvas = canvasRef.current;
    if (!canvas || !isMediaPipeLoaded || !alignment.isMediaPipeActive) {
      setErrorMessage(
        'Cilt analiz motoru kullanılamıyor. Lütfen kamera iznini ve bağlantınızı kontrol edip tekrar deneyin.'
      );
      setScanState('ERROR');
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      setErrorMessage('Tuval grafik bağlamı başlatılamadı. Lütfen sayfayı yenileyip tekrar deneyin.');
      setScanState('ERROR');
      return;
    }

    let regionMetrics: Record<string, RegionMetrics>;
    try {
      regionMetrics = SkinAnalyzer.analyzeRegions(ctx, canvas.width, canvas.height, alignment);
    } catch (err: any) {
      console.warn('MediaPipe ROI analizi başarısız:', err);
      setErrorMessage(
        'Yüz ROI anatomik bölgeleri tespit edilemedi. Lütfen doğrudan kameraya bakın ve ışığı artırın.'
      );
      setScanState('ERROR');
      return;
    }

    // Baseline kontrolü (İlk tarama mı, sonraki tarama mı?)
    let baselineData: Record<string, RegionMetrics> | null = null;
    try {
      const storedBaseline = localStorage.getItem(STORAGE_KEYS.SKIN_BASELINE);
      if (storedBaseline) {
        baselineData = JSON.parse(storedBaseline);
      }
    } catch {}

    const isFirstScan = !baselineData;
    const comparison = SkinAnalyzer.compareWithBaseline(regionMetrics, baselineData, 20.0);

    const finalResult: SkinAnalysisResult = {
      id: `skin-${Date.now()}`,
      timestamp: new Date().toISOString(),
      quality,
      regions: comparison.comparedRegions,
      highestChangeRegion: isFirstScan ? 'Tüm Bölgeler' : comparison.highestChangeRegion,
      highestChangePct: isFirstScan ? 0 : comparison.highestChangePct,
      referralSuggested: isFirstScan ? false : comparison.referralSuggested,
      isBaseline: isFirstScan,
      clinicalNoteTr: comparison.clinicalNoteTr,
      usedMediaPipe: true
    };

    // Yalnızca canPersistResult doğrulaması geçerse gerçek sonuç kalıcı olarak saklanır
    if (SkinAnalyzer.canPersistResult(finalResult)) {
      try {
        if (isFirstScan) {
          localStorage.setItem(STORAGE_KEYS.SKIN_BASELINE, JSON.stringify(regionMetrics));
        }
        localStorage.setItem(STORAGE_KEYS.LATEST_SKIN, JSON.stringify(finalResult));

        // Geçmiş telemetrisi (ham görsel saklanmaz, yalnızca sayısal veriler)
        const storedHistory = localStorage.getItem(STORAGE_KEYS.SKIN_HISTORY);
        const historyList = storedHistory ? JSON.parse(storedHistory) : [];
        historyList.unshift({
          id: finalResult.id,
          timestamp: finalResult.timestamp,
          regions: finalResult.regions,
          highestChangeRegion: finalResult.highestChangeRegion,
          highestChangePct: finalResult.highestChangePct,
          referralSuggested: finalResult.referralSuggested,
          isBaseline: finalResult.isBaseline,
          usedMediaPipe: true
        });
        localStorage.setItem(STORAGE_KEYS.SKIN_HISTORY, JSON.stringify(historyList.slice(0, 10)));
      } catch (e) {
        console.warn('LocalStorage persistence error:', e);
      }
    } else {
      setErrorMessage('MediaPipe doğrulaması olmadan sağlık telemetrisi kaydedilemez.');
      setScanState('ERROR');
      return;
    }

    setAnalysisResult(finalResult);
    // En yüksek değişimin olduğu bölgeye odaklan veya varsayılan sağ yanak
    if (!isFirstScan && comparison.highestChangeRegion) {
      const match = REGION_ORDER.find((id) => SKIN_REGIONS[id].nameTr === comparison.highestChangeRegion);
      if (match) setSelectedRegionId(match);
    }
    setScanState('COMPLETED');
  };

  // Real-time video işleme döngüsü (requestAnimationFrame)
  const startRealtimeLoop = useCallback(() => {
    consecutiveValidFramesRef.current = 0;
    setScanProgress(0);

    const isDemo = isDemoMode();

    const loop = () => {
      if (!videoRef.current || !canvasRef.current) {
        animFrameIdRef.current = requestAnimationFrame(loop);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState >= 2 && video.videoWidth > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Gerçek hizalama ve kalite değerlendirmesi
          const curAlign = SkinAnalyzer.assessAlignment(ctx, canvas.width, canvas.height);
          const curQual = SkinAnalyzer.checkQuality(ctx, canvas.width, canvas.height, curAlign.faceDetected);

          setAlignment(curAlign);
          setQuality(curQual);

          if (isDemo) {
            // DEMO MOD: Zamanlayıcı bazlı yumuşak ilerleme
            consecutiveValidFramesRef.current += 1;
            const progress = Math.min(100, Math.round((consecutiveValidFramesRef.current / 18) * 100));
            setScanProgress(progress);
            if (progress >= 100) {
              finishScan(true);
              return;
            }
          } else {
            // REAL MOD: Gerçek MediaPipe + Yüz Tespiti + Hizalama + Kalite Doğrulaması
            const isValid =
              isMediaPipeLoaded &&
              curAlign.faceDetected &&
              curAlign.isMediaPipeActive &&
              curAlign.isAligned &&
              curQual.isValid;

            if (isValid) {
              consecutiveValidFramesRef.current += 1;
              const progress = Math.min(100, Math.round((consecutiveValidFramesRef.current / 15) * 100));
              setScanProgress(progress);
              setGuidanceText('Hizalama uygun. Lütfen sabit durun...');

              if (progress >= 100) {
                finishScan(false);
                return;
              }
            } else {
              // Koşullar bozulursa ilerlemeyi durdur veya geriye al
              consecutiveValidFramesRef.current = Math.max(0, consecutiveValidFramesRef.current - 1);
              if (!curAlign.faceDetected) {
                setGuidanceText('Yüz algılanamadı. Kameranın karşısına geçin.');
              } else if (!curAlign.isAligned) {
                setGuidanceText(curAlign.guidanceTextTr || 'Yüzünüzü kılavuz alana ortalayın.');
              } else if (!curQual.isValid) {
                setGuidanceText(curQual.warningMessageTr || 'Ortam aydınlatmasını kontrol edin.');
              }
            }
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);
  }, [isMediaPipeLoaded, alignment]);

  // Kamerayı başlat ve taramaya geç
  const startCamera = async () => {
    setErrorMessage(null);

    // 1. Gizlilik Tercihi Kontrolü
    if (!isCameraAllowed()) {
      setErrorMessage(
        'Kabin kamerası kullanım izni Gizlilik ayarlarında kapalıdır. Lütfen Gizlilik & İzinler sayfasından kamerayı açın.'
      );
      setScanState('ERROR');
      return;
    }

    const isDemo = isDemoMode();

    // 2. Real Modda MediaPipe kontrolü
    if (!isDemo && !isMediaPipeLoaded && SkinAnalyzer.hasInitializationFailed()) {
      setErrorMessage(
        'Cilt analiz motoru kullanılamıyor. Lütfen kamera iznini ve bağlantınızı kontrol edip tekrar deneyin.'
      );
      setScanState('ERROR');
      return;
    }

    setScanState('CAMERA_ACTIVE');
    setScanProgress(5);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      setMediaStream(stream);
      setIsLiveVideo(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      startRealtimeLoop();
    } catch (err: any) {
      console.warn('Kamera erişimi sağlanamadı:', err);
      if (isDemo) {
        // Demo modda sentetik portreyle devam edebilir
        setIsLiveVideo(false);
        startRealtimeLoop();
      } else {
        setIsLiveVideo(false);
        setErrorMessage(
          'Kamera erişimi sağlanamadı. Lütfen kamera izinlerinizi kontrol edip tekrar deneyin.'
        );
        setScanState('ERROR');
      }
    }
  };

  const getDefaultEngineRegions = (): Record<string, RegionMetrics> => ({
    forehead: { id: 'forehead', nameTr: 'Alın', rednessScore: 32, luminanceScore: 68, textureVariance: 22, changeFromBaselinePct: 4 },
    rightCheek: { id: 'rightCheek', nameTr: 'Sağ Yanak', rednessScore: 64, luminanceScore: 52, textureVariance: 48, changeFromBaselinePct: 22 },
    leftCheek: { id: 'leftCheek', nameTr: 'Sol Yanak', rednessScore: 35, luminanceScore: 64, textureVariance: 22, changeFromBaselinePct: -3 },
    nose: { id: 'nose', nameTr: 'Burun', rednessScore: 40, luminanceScore: 60, textureVariance: 26, changeFromBaselinePct: 6 },
    chin: { id: 'chin', nameTr: 'Çene', rednessScore: 28, luminanceScore: 65, textureVariance: 16, changeFromBaselinePct: 2 },
    periorbital: { id: 'periorbital', nameTr: 'Göz Çevresi', rednessScore: 30, luminanceScore: 54, textureVariance: 34, changeFromBaselinePct: 8 }
  });

  // Care modülüne yönlendirme (Dermatoloji el sıkışması)
  const handleNavigateToCare = () => {
    const isDemo = isDemoMode();
    const currentRegion = buildSkinRegionViewModel(selectedRegionId, analysisResult, isDemo);
    const referralContext = {
      sourceModule: 'SKIN',
      specialty: 'Dermatoloji',
      reasonSummary: `Önceki ölçümünüze göre ${currentRegion.nameTr} bölgesinde belirgin bir görsel değişim (%${currentRegion.changePct > 0 ? '+' : ''}${currentRegion.changePct}) gözlendi. Bir dermatologla görüşmek faydalı olabilir.`,
      timestamp: new Date().toISOString(),
      metricsSummary: {
        region: currentRegion.nameTr,
        changePct: currentRegion.changePct,
        usedMediaPipe: isLiveVideo && isMediaPipeLoaded
      },
      isDemo
    };
    try {
      if (isDemo) {
        localStorage.setItem(STORAGE_KEYS.DEMO_REFERRAL, JSON.stringify(referralContext));
      } else {
        localStorage.setItem(STORAGE_KEYS.REFERRAL_CONTEXT, JSON.stringify(referralContext));
      }
    } catch (e) {}
    router.push('/care?specialty=Dermatoloji&from=skin');
  };

  const currentRegionData: SkinRegionData = buildSkinRegionViewModel(
    selectedRegionId,
    analysisResult,
    isDemoMode()
  );

  return (
    <div className="space-y-4 max-w-5xl mx-auto select-none">
      {/* Gizli kanvas (MediaPipe piksel analizi) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ============================================================ */}
      {/* HATA DURUMU: MediaPipe / Kamera / İzin Eksikliği             */}
      {/* ============================================================ */}
      {scanState === 'ERROR' && (
        <div className="bg-[#0c1424]/90 border border-amber-500/40 rounded-3xl p-8 md:p-10 shadow-2xl max-w-xl mx-auto text-center space-y-6">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
              Analiz Motoru Bildirimi
            </span>
            <h2 className="text-2xl font-extrabold text-white">Cilt Kontrolü Başlatılamadı</h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
              {errorMessage || 'Cilt analiz motoru kullanılamıyor. Lütfen kamera iznini ve bağlantınızı kontrol edip tekrar deneyin.'}
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => {
                setErrorMessage(null);
                setScanState('READY');
              }}
              className="px-6 py-2.5 rounded-xl bg-togg-turquoise text-togg-darkBlue font-bold text-xs hover:bg-[#33D0EE] transition-all shadow-md"
            >
              Tekrar Dene
            </button>
            <button
              onClick={() => router.push('/privacy')}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-slate-300 border border-slate-700 font-medium text-xs hover:bg-slate-800 transition-all"
            >
              Gizlilik & İzinler
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SCREEN 1: SKIN START VIEW (REFERANS 1 & 2)                  */}
      {/* ============================================================ */}
      {scanState === 'READY' && (
        <SkinStartView onStart={startCamera} />
      )}

      {/* ============================================================ */}
      {/* SCREEN 2: SKIN ACTIVE SCAN (REFERANS 1)                     */}
      {/* ============================================================ */}
      {scanState === 'CAMERA_ACTIVE' && (
        <SkinActiveScan
          scanProgress={scanProgress}
          videoRef={videoRef}
          isLiveVideo={isLiveVideo}
          alignment={alignment}
          quality={quality}
          guidanceText={guidanceText}
        />
      )}

      {/* ============================================================ */}
      {/* SCREEN 3: SKIN RESULT VIEW (REFERANS 1, 2, 3, 4)            */}
      {/* ============================================================ */}
      {scanState === 'COMPLETED' && (
        <SkinResultView
          currentRegion={currentRegionData}
          onPrev={handlePrevRegion}
          onNext={handleNextRegion}
          onOpenModal={(modal) => setActiveModal(modal)}
          onNavigateToCare={handleNavigateToCare}
          videoRef={videoRef}
          isLiveVideo={isLiveVideo}
        />
      )}

      {/* ============================================================ */}
      {/* SCREEN 4, 5, 6: MODALLAR (Zaman İçinde / Gözlem / Aksiyon)  */}
      {/* ============================================================ */}
      {activeModal === 'trend' && (
        <SkinTrendModal
          region={currentRegionData}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'observation' && (
        <SkinObservationModal
          region={currentRegionData}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'actions' && (
        <SkinActionsModal
          region={currentRegionData}
          onClose={() => setActiveModal(null)}
          onNavigateToCare={handleNavigateToCare}
        />
      )}
    </div>
  );
}
