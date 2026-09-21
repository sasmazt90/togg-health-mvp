'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  getRegionData
} from '../../data/skinDemoFixture';
import { SkinStartView } from '../../components/skin/SkinStartView';
import { SkinActiveScan } from '../../components/skin/SkinActiveScan';
import { SkinResultView } from '../../components/skin/SkinResultView';
import { SkinTrendModal } from '../../components/skin/SkinTrendModal';
import { SkinObservationModal } from '../../components/skin/SkinObservationModal';
import { SkinActionsModal } from '../../components/skin/SkinActionsModal';
import { AlertTriangle } from 'lucide-react';

export default function SkinPage() {
  const router = useRouter();
  const { isParked, state } = useVehicle();

  const [scanState, setScanState] = useState<'READY' | 'CAMERA_ACTIVE' | 'COMPLETED'>('READY');
  const [scanProgress, setScanProgress] = useState<number>(75);
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

  const [analysisResult, setAnalysisResult] = useState<SkinAnalysisResult | null>(null);

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

  // Temizlik
  useEffect(() => {
    return () => {
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

  // Kamerayı başlat ve taramaya geç
  const startCamera = async () => {
    setScanState('CAMERA_ACTIVE');
    setScanProgress(25);

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
    } catch (err: any) {
      console.warn('Webcam erişilemedi, sentetik nötr portre akışı kullanılıyor:', err);
      setIsLiveVideo(false);
    }

    // Gerçekçi analiz ilerleme adımları
    setTimeout(() => setScanProgress(55), 500);
    setTimeout(() => setScanProgress(75), 1100);
    setTimeout(() => {
      setScanProgress(100);
      setTimeout(() => finishScan(), 400);
    }, 1800);
  };

  const finishScan = () => {
    let regionMetrics: Record<string, RegionMetrics>;
    if (canvasRef.current && isMediaPipeLoaded && alignment.isMediaPipeActive) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        try {
          regionMetrics = SkinAnalyzer.analyzeRegions(ctx, canvas.width, canvas.height, alignment);
        } catch (e) {
          regionMetrics = getDefaultEngineRegions();
        }
      } else {
        regionMetrics = getDefaultEngineRegions();
      }
    } else {
      regionMetrics = getDefaultEngineRegions();
    }

    const comparison = SkinAnalyzer.compareWithBaseline(regionMetrics, null, 20.0);
    const finalResult: SkinAnalysisResult = {
      id: `skin-${Date.now()}`,
      timestamp: new Date().toISOString(),
      quality,
      regions: comparison.comparedRegions,
      highestChangeRegion: 'Sağ Yanak',
      highestChangePct: 22,
      referralSuggested: true,
      isBaseline: false,
      clinicalNoteTr: 'Sağ yanak bölgesinde baz çizgi referansına göre %22 görsel değişim gözlendi.',
      usedMediaPipe: alignment.isMediaPipeActive && isMediaPipeLoaded
    };

    try {
      localStorage.setItem('togg_health_latest_skin', JSON.stringify(finalResult));
    } catch (e) {}

    setAnalysisResult(finalResult);
    setSelectedRegionId('rightCheek');
    setScanState('COMPLETED');
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
    const currentRegion = getRegionData(selectedRegionId);
    const referralContext = {
      sourceModule: 'SKIN',
      specialty: 'Dermatoloji',
      reasonSummary: `Önceki ölçümünüze göre ${currentRegion.nameTr} bölgesinde belirgin bir görsel değişim (%${currentRegion.changePct > 0 ? '+' : ''}${currentRegion.changePct}) gözlendi. Bir dermatologla görüşmek faydalı olabilir.`,
      timestamp: new Date().toISOString(),
      metricsSummary: {
        region: currentRegion.nameTr,
        changePct: currentRegion.changePct,
        usedMediaPipe: isLiveVideo && isMediaPipeLoaded
      }
    };
    try {
      localStorage.setItem('togg_active_referral_context', JSON.stringify(referralContext));
    } catch (e) {}
    router.push('/care?specialty=Dermatoloji&from=skin');
  };

  const currentRegionData: SkinRegionData = getRegionData(selectedRegionId);

  return (
    <div className="space-y-4 max-w-5xl mx-auto select-none">
      {/* Gizli kanvas (MediaPipe piksel analizi) */}
      <canvas ref={canvasRef} className="hidden" />

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
