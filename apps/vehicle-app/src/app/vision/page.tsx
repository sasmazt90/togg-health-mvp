'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useVehicle } from '../../context/VehicleContext';
import {
  VisionStaircaseController,
  OptotypeDirection,
  EyeTestResult,
  ContrastResult
} from '../../utils/visionEngine';
import {
  Eye,
  Camera,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ChevronRight,
  Info,
  Check,
  RotateCcw
} from 'lucide-react';
import { isCameraAllowed } from '../../utils/attuneMode';

export default function VisionPage() {
  const router = useRouter();
  const { isParked, state } = useVehicle();

  // Test adımları
  const [testStep, setTestStep] = useState<
    'IDLE' | 'SCREEN_CALIBRATION' | 'CAMERA_DISTANCE' | 'TESTING_RIGHT' | 'TESTING_LEFT' | 'TESTING_CONTRAST' | 'COMPLETED'
  >('IDLE');

  // Ekran kalibrasyonu: Standart kredi kartı 85.6 mm.
  const [cardWidthPx, setCardWidthPx] = useState<number>(324);
  const pixelsPerMm = Math.max(2.0, cardWidthPx / 85.6);

  // Kamera ve Kullanıcı Doğrulamalı Test Mesafesi
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [verifiedDistanceCm, setVerifiedDistanceCm] = useState<number>(55);

  // Staircase kontrolcüsü ve test durumu
  const [staircase, setStaircase] = useState<VisionStaircaseController | null>(null);
  const [currentDirection, setCurrentDirection] = useState<OptotypeDirection>('UP');
  const [currentLogMAR, setCurrentLogMAR] = useState<number>(0.3);
  const [feedbackEffect, setFeedbackEffect] = useState<'CORRECT' | 'WRONG' | null>(null);
  const [trialIndex, setTrialIndex] = useState<number>(1);
  const [contrastLevelPct, setContrastLevelPct] = useState<number>(100);

  // Sonuçlar (Tamamlanana kadar null)
  const [testResults, setTestResults] = useState<{
    rightEye: EyeTestResult | null;
    leftEye: EyeTestResult | null;
    contrast: ContrastResult | null;
  }>({
    rightEye: null,
    leftEye: null,
    contrast: null
  });

  // Kamera akışını kapatma temizliği
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mediaStream]);

  // SÜRÜŞ MODU KİLİDİ (SCREEN 11) - Tam merkezli, sade, otomotiv güvenlik arayüzü
  if (!isParked) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-gradient-to-b from-cockpit-surface to-slate-950 border border-amber-500/50 rounded-3xl p-8 md:p-12 text-center max-w-lg w-full space-y-6 shadow-[0_0_60px_rgba(245,158,11,0.18)] backdrop-blur-xl">
          <div className="w-20 h-20 bg-amber-500/15 border border-amber-500/40 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <AlertTriangle className="w-10 h-10 animate-pulse" />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
              <span>SÜRÜŞ • {state.currentSpeed} km/s</span>
            </div>

            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Görme Kontrolü Kullanılamıyor
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
              Bu özellik yalnızca araç park halindeyken kullanılabilir. Sürüş güvenliğiniz için görsel testler durdurulmuştur.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center justify-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Lütfen aracı güvenli bir noktada <strong>Park (P)</strong> moduna alın.</span>
          </div>
        </div>
      </div>
    );
  }

  // Kamera açma
  const startCamera = async () => {
    setCameraError(null);
    if (!isCameraAllowed()) {
      setCameraError('Kabin kamerası kullanım izni Gizlilik ayarlarında kapalıdır. Oturma pozisyonunuzu alarak doğrulamak istediğiniz mesafeyi manuel seçebilirsiniz.');
      setCameraActive(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      setMediaStream(stream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Kamera erişimi sağlanamadı:', err);
      setCameraError('Kamera erişimi sağlanamadı. Lütfen oturma pozisyonunuzu alarak doğrulamak istediğiniz mesafeyi seçin.');
      setCameraActive(false);
    }
  };

  const handleStartScreenCalibration = () => {
    setTestStep('SCREEN_CALIBRATION');
  };

  const handleProceedToCamera = () => {
    setTestStep('CAMERA_DISTANCE');
    startCamera();
  };

  const handleStartTest = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      setMediaStream(null);
    }
    const ctrl = new VisionStaircaseController(0.3, 0.1, 6);
    const initialDir = ctrl.getRandomDirection();
    setStaircase(ctrl);
    setCurrentDirection(initialDir);
    setCurrentLogMAR(ctrl.getCurrentLogMAR());
    setTrialIndex(1);
    setTestStep('TESTING_RIGHT');
  };

  const handleAnswer = (chosen: OptotypeDirection) => {
    if (!staircase) return;

    if (testStep === 'TESTING_RIGHT' || testStep === 'TESTING_LEFT') {
      const isRight = testStep === 'TESTING_RIGHT';
      const outcome = staircase.registerResponse(currentDirection, chosen);

      setFeedbackEffect(outcome.isCorrect ? 'CORRECT' : 'WRONG');
      setTimeout(() => setFeedbackEffect(null), 250);

      if (outcome.eyeFinished) {
        if (isRight) {
          setTestStep('TESTING_LEFT');
          setCurrentDirection(staircase.getRandomDirection());
          setCurrentLogMAR(staircase.getCurrentLogMAR());
          setTrialIndex(1);
        } else {
          setTestStep('TESTING_CONTRAST');
          setCurrentDirection(staircase.getRandomDirection());
          setContrastLevelPct(100);
          setTrialIndex(1);
        }
      } else {
        setCurrentDirection(staircase.getRandomDirection());
        setCurrentLogMAR(outcome.newLogMAR);
        setTrialIndex((prev) => prev + 1);
      }
    } else if (testStep === 'TESTING_CONTRAST') {
      const isCorrect = chosen === currentDirection;
      setFeedbackEffect(isCorrect ? 'CORRECT' : 'WRONG');
      setTimeout(() => setFeedbackEffect(null), 250);

      const outcome = staircase.registerContrastResponse(isCorrect);
      if (outcome.contrastFinished || trialIndex >= 5) {
        const results = staircase.getResults();
        setTestResults(results);
        setTestStep('COMPLETED');
        saveResultsToProfile(results);
      } else {
        setContrastLevelPct(outcome.currentContrastPct);
        setCurrentDirection(staircase.getRandomDirection());
        setTrialIndex((prev) => prev + 1);
      }
    }
  };

  const saveResultsToProfile = (results: {
    rightEye: EyeTestResult | null;
    leftEye: EyeTestResult | null;
    contrast: ContrastResult | null;
  }) => {
    if (!results.rightEye || !results.leftEye || !results.contrast) return;
    try {
      const visionRecord = {
        id: `vis-${Date.now()}`,
        date: new Date().toISOString(),
        testCompleted: true,
        acuityRightLogMAR: results.rightEye.logMAR,
        acuityLeftLogMAR: results.leftEye.logMAR,
        acuityRightSnellen: results.rightEye.snellen,
        acuityLeftSnellen: results.leftEye.snellen,
        contrastSensitivityLogCS: results.contrast.logCS,
        verifiedDistanceCm: verifiedDistanceCm,
        comparisonNote: 'Ölçüm tamamlandı. Kullanıcı doğrulamalı test mesafesi ve adaptif basamak algoritmasıyla kaydedildi.',
        ophthalmologistReferralRecommended: results.rightEye.logMAR > 0.15 || results.leftEye.logMAR > 0.15
      };
      localStorage.setItem('togg_health_latest_vision', JSON.stringify(visionRecord));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  };

  const handleNavigateToCare = () => {
    const isCompleted = !!testResults.rightEye && !!testResults.leftEye && !!testResults.contrast;
    const referralContext = {
      sourceModule: 'VISION',
      specialty: 'Göz Hastalıkları',
      reasonSummary: isCompleted
        ? `Ön değerlendirme sonucu: Sağ Göz ${testResults.rightEye!.snellen}, Sol Göz ${testResults.leftEye!.snellen}. Kontrast: ${testResults.contrast!.logCS.toFixed(2)} LogCS. Test mesafesi: ${verifiedDistanceCm} cm.`
        : 'Görme testi; genel göz hekimi kontrol ve muayene talebi.',
      timestamp: new Date().toISOString(),
      metricsSummary: isCompleted ? {
        rightSnellen: testResults.rightEye!.snellen,
        rightLogMAR: testResults.rightEye!.logMAR,
        leftSnellen: testResults.leftEye!.snellen,
        leftLogMAR: testResults.leftEye!.logMAR,
        contrastLogCS: testResults.contrast!.logCS,
        verifiedDistanceCm
      } : { status: 'INCOMPLETE' }
    };
    try {
      localStorage.setItem('togg_active_referral_context', JSON.stringify(referralContext));
    } catch (e) {
      console.warn(e);
    }
    router.push('/care?specialty=G%C3%B6z%20Hastal%C4%B1klar%C4%B1&from=vision');
  };

  // Optotip Boyut Hesaplaması
  const optotypeSizeMm = VisionStaircaseController.calculateOptotypeSizeMm(verifiedDistanceCm, currentLogMAR);
  const optotypeSizePx = VisionStaircaseController.mmToPixels(optotypeSizeMm, pixelsPerMm);

  const directionAngles: Record<OptotypeDirection, number> = {
    RIGHT: 0,
    DOWN: 90,
    LEFT: 180,
    UP: 270
  };

  return (
    <div className="space-y-6">
      {/* SCREEN 02: GÖRME TESTİ BAŞLANGIÇ EKRANI (1600x900 İLK VİEWPORT İÇİNDE %55 / %45) */}
      {testStep === 'IDLE' && (
        <div className="space-y-6">
          <section className="bg-gradient-to-br from-cockpit-surface via-[#071322] to-cockpit-bg border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Sol %55 Kolon: Başlık, 3 Aşamalı Yatay İlerleme, CTA */}
              <div className="lg:col-span-7 space-y-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-togg-turquoise/10 border border-togg-turquoise/30 text-togg-turquoise text-[11px] font-semibold tracking-wider uppercase">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Önleyici Görme Değerlendirmesi</span>
                  </div>

                  <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    Görme Kontrolü ve Ön Değerlendirme
                  </h1>

                  <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                    Adaptif Landolt C staircase motoru ve kullanıcı doğrulamalı test mesafesiyle kabin ekranında görme keskinliği ve kontrast takibi.
                  </p>
                </div>

                {/* 3 Aşamalı Yatay İlerleme Çubuğu */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-950/80 rounded-xl border border-white/10 text-xs">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-togg-darkBlue/70 border border-togg-turquoise/40 text-togg-turquoise font-medium">
                    <span className="w-5 h-5 rounded-full bg-togg-turquoise text-togg-darkBlue font-bold flex items-center justify-center text-[10px]">1</span>
                    <span>Ekranı Ayarla</span>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-400">
                    <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center text-[10px]">2</span>
                    <span>Mesafeyi Doğrula</span>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-400">
                    <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center text-[10px]">3</span>
                    <span>Testi Tamamla</span>
                  </div>
                </div>

                {/* Birincil Aksiyon Butonu ve Güvenlik Notu */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleStartScreenCalibration}
                    className="w-full sm:w-auto flex items-center justify-center gap-3 py-3.5 px-8 rounded-xl bg-togg-turquoise text-togg-darkBlue font-bold text-sm hover:bg-[#33D0EE] transition-all min-h-touch shadow-[0_0_20px_rgba(0,194,231,0.25)]"
                  >
                    <span>TESTİ HAZIRLA</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Yalnızca araç park halindeyken kullanılabilir.</span>
                  </div>
                </div>
              </div>

              {/* Sağ %45 Kolon: Büyük Landolt C Önizleme Kartı */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-full max-w-sm aspect-square bg-slate-950/80 rounded-2xl border border-white/10 p-6 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-togg-turquoise/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex items-center justify-between w-full text-[11px] text-slate-400">
                    <span className="font-mono uppercase tracking-wider">Landolt C Referansı</span>
                    <span className="text-togg-turquoise font-semibold">Ön Değerlendirme</span>
                  </div>

                  {/* Merkez Landolt C Halka Görseli */}
                  <div className="relative my-auto flex items-center justify-center">
                    <div className="w-36 h-36 rounded-full border border-dashed border-togg-turquoise/30 flex items-center justify-center animate-[spin_40s_linear_infinite]">
                      <div className="w-28 h-28 rounded-full border border-white/5" />
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg width="84" height="84" viewBox="0 0 100 100" className="filter drop-shadow-[0_0_20px_rgba(0,194,231,0.35)]">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#00E5FF"
                          strokeWidth="18"
                          strokeDasharray="210 30"
                          strokeDashoffset="15"
                        />
                      </svg>
                    </div>
                  </div>

                  <div className="text-center space-y-0.5">
                    <div className="text-xs font-semibold text-white">Optotip Keskinlik ve Kontrast Halkası</div>
                    <div className="text-[11px] text-slate-400">Adaptif Basamak Test Motoru Hazır</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Below Fold: Test Hakkında Bilgilendirme */}
          <section className="bg-cockpit-surface border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-white/10 pb-3">
              <Info className="w-4 h-4 text-togg-turquoise" />
              <span>Test Hakkında & Ön Değerlendirme Esasları</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/70 space-y-1.5">
                <div className="text-white font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-togg-turquoise" />
                  <span>Landolt C Halkaları</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Uluslararası optotip standardına göre halkanın 4 yönündeki boşluk tespit edilerek görme keskinliği LogMAR olarak ölçülür.
                </p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/70 space-y-1.5">
                <div className="text-white font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-togg-turquoise" />
                  <span>Doğrulanmış Test Mesafesi</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Kart kalibrasyonu ve kullanıcı tarafından teyit edilen mesafeyle optotip ekranda milimetrik hassasiyetle ölçeklendirilir.
                </p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/70 space-y-1.5">
                <div className="text-white font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>İşlevsel Ön Tarama</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Bu test tıbbi muayene yerine geçmez; kabin içi konfor ve değişim takibine yönelik fonksiyonel bir ön değerlendirmedir.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ADIM 2: EKRAN KALİBRASYONU (CARD SLIDER) */}
      {testStep === 'SCREEN_CALIBRATION' && (
        <div className="bg-cockpit-surface border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 max-w-3xl mx-auto shadow-2xl">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">1. Adım: Ekran Boyutu Kalibrasyonu</h2>
            <p className="text-xs text-slate-300">
              Landolt C halkasının fiziksel milimetre boyutunu ekranınızda tam tutturabilmek için lütfen ekranınıza standart bir kart (85.6 mm) tutun ve kutuyu genişliğiyle birebir örtüşene kadar kaydırıcıyla ayarlayın.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-slate-950/80 rounded-xl border border-slate-800 min-h-[160px]">
            <div
              className="h-28 bg-gradient-to-r from-cyan-950 to-blue-900 border-2 border-togg-turquoise rounded-lg flex flex-col justify-between p-3 text-cyan-200 transition-all shadow-md"
              style={{ width: `${cardWidthPx}px` }}
            >
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span>STANDART KART REFERANSI</span>
                <span>85.6 mm</span>
              </div>
              <div className="text-center font-bold text-xs tracking-wider text-white">
                FİZİKSEL GENİŞLİK KONTROLÜ
              </div>
              <div className="text-[10px] text-cyan-300/70 text-right font-mono">
                {cardWidthPx} px ({pixelsPerMm.toFixed(2)} px/mm)
              </div>
            </div>
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Daha Dar</span>
              <span className="font-mono text-togg-turquoise font-bold">{cardWidthPx} px</span>
              <span>Daha Geniş</span>
            </div>
            <input
              type="range"
              min="220"
              max="520"
              value={cardWidthPx}
              onChange={(e) => setCardWidthPx(Number(e.target.value))}
              className="w-full accent-togg-turquoise h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-white/10">
            <button
              onClick={() => setTestStep('IDLE')}
              className="text-xs text-slate-400 hover:text-white px-3 py-2"
            >
              İptal
            </button>
            <button
              onClick={handleProceedToCamera}
              className="flex items-center gap-2 py-3 px-6 rounded-xl bg-togg-turquoise text-togg-darkBlue font-bold text-xs hover:bg-[#33D0EE] transition-all min-h-touch shadow-md"
            >
              <span>Ölçek Doğrulandı, Mesafeye Geç</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ADIM 3: TEST MESAFESİ SEÇİMİ VE KAMERA */}
      {testStep === 'CAMERA_DISTANCE' && (
        <div className="bg-cockpit-surface border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 text-center max-w-3xl mx-auto shadow-2xl">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">2. Adım: Kadraj ve Doğrulanan Test Mesafesi</h2>
            <p className="text-xs text-slate-300">
              Koltuk pozisyonunuzu alarak ekranla aranızdaki fiziksel mesafeyi doğrulayın.
            </p>
          </div>

          <div className="relative max-w-md mx-auto aspect-video bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center overflow-hidden shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />
            {!cameraActive && (
              <div className="p-4 space-y-2">
                <Camera className="w-10 h-10 text-togg-turquoise animate-pulse mx-auto" />
                <div className="text-sm font-semibold text-slate-200">Kamera Başlatılıyor...</div>
                <div className="text-xs text-slate-400">Kamera yoksa mesafeyi aşağıdan seçebilirsiniz.</div>
              </div>
            )}

            {cameraActive && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 border-2 border-dashed border-togg-turquoise/50 rounded-xl m-2">
                <div className="flex justify-between items-center text-[10px] bg-black/70 px-2.5 py-1 rounded text-togg-turquoise backdrop-blur-sm">
                  <span>CANLI KABİN KAMERASI</span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> Konumlandırma
                  </span>
                </div>
                <div className="w-24 h-32 border-2 border-dashed border-togg-turquoise/80 rounded-full mx-auto self-center shadow-[0_0_15px_rgba(0,194,231,0.2)]" />
                <div className="bg-black/75 px-3 py-1 rounded text-center text-xs text-slate-200">
                  Yüzünüzü oval alana hizalayın
                </div>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="bg-amber-950/40 border border-amber-800/80 p-3 rounded-xl text-xs text-amber-300 text-left max-w-md mx-auto">
              {cameraError}
            </div>
          )}

          <div className="max-w-md mx-auto bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Doğrulanan Test Mesafesi:</span>
              <span className="text-xs font-mono font-bold text-togg-turquoise">{verifiedDistanceCm} cm</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[50, 55, 60].map((dist) => (
                <button
                  key={dist}
                  type="button"
                  onClick={() => setVerifiedDistanceCm(dist)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5 ${
                    verifiedDistanceCm === dist
                      ? 'bg-togg-turquoise text-togg-darkBlue border-togg-turquoise font-bold shadow'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {verifiedDistanceCm === dist && <Check className="w-3.5 h-3.5" />}
                  {dist} cm
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 max-w-md mx-auto">
            <button
              onClick={() => setTestStep('SCREEN_CALIBRATION')}
              className="text-xs text-slate-400 hover:text-white"
            >
              Geri
            </button>
            <button
              onClick={handleStartTest}
              className="py-3 px-6 rounded-xl bg-togg-turquoise text-togg-darkBlue font-bold text-xs hover:bg-[#33D0EE] transition-all min-h-touch shadow-lg"
            >
              Doğrulandı, Testi Başlat
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 03: AKTİF TEST EKRANI (LANDOLT C + 4 DOKUNMATİK YÖN BUTONU) */}
      {(testStep === 'TESTING_RIGHT' || testStep === 'TESTING_LEFT' || testStep === 'TESTING_CONTRAST') && (
        <div className="bg-cockpit-surface border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 max-w-3xl mx-auto shadow-2xl">
          {/* Üst Bilgi: Sol Taraf Göz Talimatı, Sağ Taraf İlerleme Noktaları */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-togg-turquoise animate-pulse" />
              <h2 className="text-sm md:text-base font-bold text-white tracking-wide uppercase">
                {testStep === 'TESTING_RIGHT' && 'SAĞ GÖZ • Sol gözünüzü kapatın'}
                {testStep === 'TESTING_LEFT' && 'SOL GÖZ • Sağ gözünüzü kapatın'}
                {testStep === 'TESTING_CONTRAST' && 'KONTRAST DUYARLILIĞI • İki göz açık'}
              </h2>
            </div>

            {/* İlerleme Noktaları (Minimal Dots) */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono text-xs">
                {trialIndex} / {testStep === 'TESTING_CONTRAST' ? '5' : '6'}
              </span>
              <div className="flex gap-1.5">
                {Array.from({ length: testStep === 'TESTING_CONTRAST' ? 5 : 6 }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      i < trialIndex ? 'bg-togg-turquoise shadow-[0_0_8px_rgba(0,194,231,0.5)]' : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Merkez: Büyük Landolt C Görseli */}
          <div className="py-8 flex flex-col items-center justify-center min-h-[260px] bg-slate-950/70 rounded-2xl border border-slate-900 shadow-inner">
            <div className="text-xs text-slate-300 mb-6 font-medium">
              {testStep === 'TESTING_CONTRAST'
                ? `Kontrast Ön Değerlendirmesi — Boşluk hangi yönde?`
                : 'Boşluk hangi yönde?'}
            </div>

            <div
              className={`relative flex items-center justify-center transition-all duration-200 p-6 rounded-2xl ${
                feedbackEffect === 'CORRECT'
                  ? 'ring-4 ring-emerald-400/80 bg-emerald-950/30'
                  : feedbackEffect === 'WRONG'
                  ? 'ring-4 ring-rose-500/80 bg-rose-950/30'
                  : ''
              }`}
              style={{
                opacity: testStep === 'TESTING_CONTRAST' ? contrastLevelPct / 100 : 1.0
              }}
            >
              <svg
                width={Math.max(88, optotypeSizePx * 1.35)}
                height={Math.max(88, optotypeSizePx * 1.35)}
                viewBox="0 0 100 100"
                style={{
                  transform: `rotate(${directionAngles[currentDirection]}deg)`,
                  transition: 'transform 0.15s ease-out'
                }}
                className="filter drop-shadow-[0_0_20px_rgba(0,194,231,0.3)]"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={testStep === 'TESTING_CONTRAST' ? '#cbd5e1' : '#00E5FF'}
                  strokeWidth="20"
                  strokeDasharray="231.32 20"
                  strokeDashoffset="10"
                />
              </svg>
            </div>
          </div>

          {/* Alt: 4 Büyük Dokunmatik Yön Butonu (100-120px Touch Targets) */}
          <div className="max-w-xs mx-auto grid grid-cols-3 gap-3 pt-2">
            <div />
            <button
              onClick={() => handleAnswer('UP')}
              className="h-24 bg-slate-900/90 border border-slate-700 hover:bg-togg-turquoise hover:text-togg-darkBlue hover:border-togg-turquoise text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg flex flex-col items-center justify-center gap-1 group"
              title="Yukarı"
            >
              <span className="text-2xl leading-none group-hover:scale-110 transition-transform">▲</span>
              <span className="text-[11px] tracking-wider font-semibold">YUKARI</span>
            </button>
            <div />

            <button
              onClick={() => handleAnswer('LEFT')}
              className="h-24 bg-slate-900/90 border border-slate-700 hover:bg-togg-turquoise hover:text-togg-darkBlue hover:border-togg-turquoise text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg flex flex-col items-center justify-center gap-1 group"
              title="Sol"
            >
              <span className="text-2xl leading-none group-hover:scale-110 transition-transform">◄</span>
              <span className="text-[11px] tracking-wider font-semibold">SOL</span>
            </button>

            <div className="flex flex-col items-center justify-center text-[10px] text-slate-500 font-mono tracking-widest text-center">
              <span>DOKUNMATİK</span>
              <span>YÖN</span>
            </div>

            <button
              onClick={() => handleAnswer('RIGHT')}
              className="h-24 bg-slate-900/90 border border-slate-700 hover:bg-togg-turquoise hover:text-togg-darkBlue hover:border-togg-turquoise text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg flex flex-col items-center justify-center gap-1 group"
              title="Sağ"
            >
              <span className="text-2xl leading-none group-hover:scale-110 transition-transform">►</span>
              <span className="text-[11px] tracking-wider font-semibold">SAĞ</span>
            </button>

            <div />
            <button
              onClick={() => handleAnswer('DOWN')}
              className="h-24 bg-slate-900/90 border border-slate-700 hover:bg-togg-turquoise hover:text-togg-darkBlue hover:border-togg-turquoise text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg flex flex-col items-center justify-center gap-1 group"
              title="Aşağı"
            >
              <span className="text-2xl leading-none group-hover:scale-110 transition-transform">▼</span>
              <span className="text-[11px] tracking-wider font-semibold">AŞAĞI</span>
            </button>
            <div />
          </div>
        </div>
      )}

      {/* ADIM 5: TEST SONUÇLARI VE SEVK */}
      {testStep === 'COMPLETED' && (
        <div className="bg-cockpit-surface border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 max-w-3xl mx-auto shadow-2xl">
          <div className="flex items-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-8 h-8 shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-white">Görme Ön Değerlendirmesi Tamamlandı</h2>
              <p className="text-xs text-slate-400">
                Sonuçlar yanıtlarınızdan ve adaptif basamak algoritmasından gerçek zamanlı hesaplandı.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
              <div className="text-xs text-slate-400">Sağ Göz Keskinliği</div>
              <div className="text-2xl font-bold text-togg-turquoise pt-1 font-mono">
                {testResults.rightEye ? testResults.rightEye.snellen : 'Değerlendirilemedi'}
              </div>
              <div className="text-[11px] text-slate-500">
                {testResults.rightEye
                  ? `LogMAR: ${testResults.rightEye.logMAR.toFixed(2)}`
                  : 'Sonuç yok'}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
              <div className="text-xs text-slate-400">Sol Göz Keskinliği</div>
              <div className="text-2xl font-bold text-togg-turquoise pt-1 font-mono">
                {testResults.leftEye ? testResults.leftEye.snellen : 'Değerlendirilemedi'}
              </div>
              <div className="text-[11px] text-slate-500">
                {testResults.leftEye
                  ? `LogMAR: ${testResults.leftEye.logMAR.toFixed(2)}`
                  : 'Sonuç yok'}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
              <div className="text-xs text-slate-400">Kontrast Duyarlılığı</div>
              <div className="text-2xl font-bold text-amber-400 pt-1 font-mono">
                {testResults.contrast ? `${testResults.contrast.logCS.toFixed(2)} LogCS` : 'Değerlendirilemedi'}
              </div>
              <div className="text-[11px] text-slate-500">
                {testResults.contrast
                  ? `Algılanan Kontrast: %${testResults.contrast.contrastPct}`
                  : 'Sonuç yok'}
              </div>
            </div>
          </div>

          <div className="bg-togg-darkBlue/40 border border-togg-darkTurquoise/60 rounded-xl p-4 text-xs text-togg-turquoise space-y-2">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-togg-turquoise" />
              <span>Ön Değerlendirme Bilgilendirmesi:</span>
            </div>
            <p className="leading-relaxed text-slate-300">
              Bu test sonuçları klinik muayene niteliğinde olmayıp; doğrulanmış test mesafesi ({verifiedDistanceCm} cm) ve ekran kalibrasyonuna dayalı işlevsel bir ön taramadır. Görme keskinliğinizde veya kontrast algınızda değişim hissediyorsanız bir göz hekimine danışmanız önerilir.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/10">
            <button
              onClick={() => {
                setTestStep('IDLE');
                setStaircase(null);
                setTestResults({ rightEye: null, leftEye: null, contrast: null });
              }}
              className="text-xs text-slate-400 hover:text-white px-4 py-2 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Testi Tekrarla</span>
            </button>

            <button
              onClick={handleNavigateToCare}
              className="flex items-center gap-2 py-3 px-6 rounded-xl bg-togg-turquoise text-togg-darkBlue font-bold text-xs hover:bg-[#33D0EE] transition-all min-h-touch shadow-lg"
            >
              <span>Göz Hekimlerini İncele (Care Agent)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
