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
  RefreshCw,
  Sliders,
  ChevronRight,
  Maximize2,
  Sparkles,
  Info,
  Check
} from 'lucide-react';

export default function VisionPage() {
  const router = useRouter();
  const { isParked, state } = useVehicle();

  // Test aşamaları
  const [testStep, setTestStep] = useState<
    'IDLE' | 'SCREEN_CALIBRATION' | 'CAMERA_DISTANCE' | 'TESTING_RIGHT' | 'TESTING_LEFT' | 'TESTING_CONTRAST' | 'COMPLETED'
  >('IDLE');

  // Ekran kalibrasyonu: Standart kredi kartı 85.6 mm. Varsayılan 96 DPI = 3.78 px/mm.
  const [cardWidthPx, setCardWidthPx] = useState<number>(324);
  const pixelsPerMm = Math.max(2.0, cardWidthPx / 85.6);

  // Kamera ve Kullanıcı Doğrulamalı Test Mesafesi (Option B)
  // Sentetik / sahte mesafe hesabı tamamen kaldırılmıştır.
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [verifiedDistanceCm, setVerifiedDistanceCm] = useState<number>(55);
  const [distanceConfirmed, setDistanceConfirmed] = useState<boolean>(false);

  // Staircase kontrolcüsü ve test durumu
  const [staircase, setStaircase] = useState<VisionStaircaseController | null>(null);
  const [currentDirection, setCurrentDirection] = useState<OptotypeDirection>('UP');
  const [currentLogMAR, setCurrentLogMAR] = useState<number>(0.3);
  const [feedbackEffect, setFeedbackEffect] = useState<'CORRECT' | 'WRONG' | null>(null);
  const [trialIndex, setTrialIndex] = useState<number>(1);
  const [contrastLevelPct, setContrastLevelPct] = useState<number>(100);

  // Sonuçlar (Kesinlikle hardcoded fallback değer içermez, tamamlanana kadar null kalır)
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

  // Kamera açma işlemi - Yalnızca canlı pozisyon kılavuzu sağlar, sentetik mesafe simülasyonu yapmaz
  const startCamera = async () => {
    setCameraError(null);
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
      setCameraError('Kamera erişimi sağlanamadı veya izin verilmedi. Pozisyonunuzu alarak doğrulamak istediğiniz test mesafesini aşağıdan seçebilirsiniz.');
      setCameraActive(false);
    }
  };

  // 1. Ekran Kalibrasyonuna Başla
  const handleStartScreenCalibration = () => {
    setTestStep('SCREEN_CALIBRATION');
  };

  // 2. Kamera Kadrajı & Doğrulanan Mesafeye Geç
  const handleProceedToCamera = () => {
    setTestStep('CAMERA_DISTANCE');
    startCamera();
  };

  // 3. Testi Başlat (Sağ Göz)
  const handleStartTest = () => {
    // Kamera akışını kapatıp kaynakları serbest bırakıyoruz
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

  // Yön Cevabı Kaydı
  const handleAnswer = (chosen: OptotypeDirection) => {
    if (!staircase) return;

    if (testStep === 'TESTING_RIGHT' || testStep === 'TESTING_LEFT') {
      const isRight = testStep === 'TESTING_RIGHT';
      const outcome = staircase.registerResponse(currentDirection, chosen);

      // Geri bildirim efekti
      setFeedbackEffect(outcome.isCorrect ? 'CORRECT' : 'WRONG');
      setTimeout(() => setFeedbackEffect(null), 300);

      if (outcome.eyeFinished) {
        if (isRight) {
          // Sol göze geçiş
          setTestStep('TESTING_LEFT');
          setCurrentDirection(staircase.getRandomDirection());
          setCurrentLogMAR(staircase.getCurrentLogMAR());
          setTrialIndex(1);
        } else {
          // Kontrast testine geçiş
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
      setTimeout(() => setFeedbackEffect(null), 300);

      const outcome = staircase.registerContrastResponse(isCorrect);
      if (outcome.contrastFinished || trialIndex >= 5) {
        // Test bitti - yalnızca gerçek sonuçları al
        const results = staircase.getResults();
        setTestResults(results);
        setTestStep('COMPLETED');

        // Sağlık profiline kaydet (asla hardcoded fallback eklenmez)
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
    // Yalnızca test tamamlanmışsa ve gerçek sonuç varsa kaydet
    if (!results.rightEye || !results.leftEye || !results.contrast) {
      return;
    }

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
        comparisonNote: 'Ölçüm başarıyla tamamlandı. Değerler kullanıcı doğrulamalı test mesafesi ve adaptif basamak algoritmasıyla kaydedildi.',
        ophthalmologistReferralRecommended: results.rightEye.logMAR > 0.15 || results.leftEye.logMAR > 0.15
      };
      localStorage.setItem('togg_health_latest_vision', JSON.stringify(visionRecord));
    } catch (e) {
      console.warn('LocalStorage kayıt hatası:', e);
    }
  };

  // Care Agent'a sevk aktarımı - Sadece gerçek sonuçlar aktarılır
  const handleNavigateToCare = () => {
    const isCompleted = !!testResults.rightEye && !!testResults.leftEye && !!testResults.contrast;
    
    const referralContext = {
      sourceModule: 'VISION',
      specialty: 'Göz Hastalıkları',
      reasonSummary: isCompleted
        ? `Ön değerlendirme sonucu: Sağ Göz ${testResults.rightEye!.snellen} (${testResults.rightEye!.logMAR.toFixed(2)} LogMAR), Sol Göz ${testResults.leftEye!.snellen} (${testResults.leftEye!.logMAR.toFixed(2)} LogMAR). Kontrast: ${testResults.contrast!.logCS.toFixed(2)} LogCS. Test mesafesi: ${verifiedDistanceCm} cm.`
        : 'Görme testi tamamlanmadı; genel göz kontrolü ve muayene talebi.',
      timestamp: new Date().toISOString(),
      metricsSummary: isCompleted ? {
        rightSnellen: testResults.rightEye!.snellen,
        rightLogMAR: testResults.rightEye!.logMAR,
        leftSnellen: testResults.leftEye!.snellen,
        leftLogMAR: testResults.leftEye!.logMAR,
        contrastLogCS: testResults.contrast!.logCS,
        verifiedDistanceCm
      } : {
        status: 'INCOMPLETE'
      }
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

  // Yön rotasyon açısı
  const directionAngles: Record<OptotypeDirection, number> = {
    RIGHT: 0,
    DOWN: 90,
    LEFT: 180,
    UP: 270
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
              Adaptif Landolt C staircase motoru, ekran kalibrasyonu ve kullanıcı doğrulamalı test mesafesi
            </p>
          </div>
        </div>
        <div className="text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
          Park Modu: <strong className="text-emerald-400">Aktif</strong>
        </div>
      </div>

      {/* ADIM 1: BAŞLANGIÇ (IDLE) */}
      {testStep === 'IDLE' && (
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white">Ön Kontrol ve Protokol Bilgilendirmesi</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Bu test, uluslararası standart Landolt C halkaları ve adaptif basamak (staircase) algoritması kullanarak görme keskinliğinizi ve kontrast algınızı değerlendirir.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1">
              <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-cyan-400" />
                1. Ekran Kalibrasyonu
              </div>
              <p className="text-slate-400">
                Piksel yoğunluğunu fiziksel milimetreye dönüştürmek için standart bir kart referansı kullanılır.
              </p>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1">
              <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-cyan-400" />
                2. Doğrulanan Mesafe
              </div>
              <p className="text-slate-400">
                Kamera kılavuzuyla pozisyon alınır ve test mesafesi kullanıcı tarafından onaylanır (50, 55 veya 60 cm).
              </p>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1">
              <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                3. Gerçek Staircase
              </div>
              <p className="text-slate-400">
                Halkaların boyutu verdiğiniz yanıtlara göre büyür veya küçülür; sağ ve sol göz ayrı test edilir.
              </p>
            </div>
          </div>

          <div className="bg-cyan-950/30 border border-cyan-800/60 rounded-xl p-4 text-xs text-cyan-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>Klinik Ön Değerlendirme Bildirimi</span>
            </div>
            <p className="leading-relaxed text-cyan-300/80">
              Bu test tıbbi muayene yerine geçmez. Ekran ölçeği ve kullanıcı doğrulamalı mesafeye dayalı işlevsel bir ön taramadır.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleStartScreenCalibration}
              className="flex items-center gap-2 py-3 px-6 rounded-xl bg-cyan-500 text-black font-semibold text-sm hover:bg-cyan-400 transition-all min-h-touch shadow-lg"
            >
              <span>Kalibrasyona Başla</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ADIM 2: EKRAN KALİBRASYONU (CARD SLIDER) */}
      {testStep === 'SCREEN_CALIBRATION' && (
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 md:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Ekran Boyutu Kalibrasyonu</h2>
            <p className="text-xs text-slate-300">
              Landolt C halkasının fiziksel milimetre boyutunu ekranınızda tam tutturabilmek için lütfen ekranınıza standart bir kredi kartı / kimlik kartı (85.6 mm) tutun ve mavi kutuyu kartınızın genişliğiyle birebir örtüşene kadar kaydırıcıyla ayarlayın.
            </p>
          </div>

          {/* Kart Referans Kutusu */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded-xl border border-slate-800 min-h-[160px]">
            <div
              className="h-28 bg-gradient-to-r from-cyan-950 to-blue-900 border-2 border-cyan-400 rounded-lg flex flex-col justify-between p-3 text-cyan-200 transition-all shadow-md"
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

          {/* Slider Kontrolü */}
          <div className="space-y-2 max-w-md mx-auto">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Daha Dar (Düşük DPI)</span>
              <span className="font-mono text-cyan-400 font-bold">{cardWidthPx} px</span>
              <span>Daha Geniş (Yüksek DPI)</span>
            </div>
            <input
              type="range"
              min="220"
              max="520"
              value={cardWidthPx}
              onChange={(e) => setCardWidthPx(Number(e.target.value))}
              className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-cockpit-border">
            <button
              onClick={() => setTestStep('IDLE')}
              className="text-xs text-slate-400 hover:text-white"
            >
              İptal
            </button>
            <button
              onClick={handleProceedToCamera}
              className="flex items-center gap-2 py-3 px-6 rounded-xl bg-cyan-500 text-black font-semibold text-sm hover:bg-cyan-400 transition-all min-h-touch"
            >
              <span>Ölçek Doğrulandı, Mesafeye Geç</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ADIM 3: KAMERA KILAVUZU & DOĞRULANAN TEST MESAFESİ (SEÇENEK B) */}
      {testStep === 'CAMERA_DISTANCE' && (
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 md:p-8 space-y-6 text-center">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Kamera Kadrajı ve Kullanıcı Doğrulamalı Test Mesafesi</h2>
            <p className="text-xs text-slate-300">
              Kamera aracılığıyla yüzünüzü kadraja hizalayın ve araç ekranıyla aranızdaki fiziksel mesafeyi doğrulayın.
            </p>
          </div>

          {/* Video Canlı Önizleme */}
          <div className="relative max-w-md mx-auto aspect-video bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />
            {!cameraActive && (
              <div className="p-4 space-y-2">
                <Camera className="w-12 h-12 text-cyan-400 animate-pulse mx-auto" />
                <div className="text-sm font-semibold text-slate-200">Kamera Başlatılıyor...</div>
                <div className="text-xs text-slate-400">Kamera yoksa veya izin verilmezse mesafe onaylayarak devam edebilirsiniz.</div>
              </div>
            )}

            {/* Kadraj Rehber Çizgisi */}
            {cameraActive && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 border-2 border-dashed border-cyan-500/40 rounded-xl m-2">
                <div className="flex justify-between items-center text-[10px] bg-black/60 px-2 py-1 rounded text-cyan-300">
                  <span>CANLI KABİN KAMERASI</span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> Konumlandırma Aktif
                  </span>
                </div>
                <div className="w-28 h-36 border-2 border-dashed border-emerald-400/70 rounded-full mx-auto self-center" />
                <div className="bg-black/70 px-3 py-1 rounded text-center text-xs text-slate-200">
                  Kadraj Rehberi: Yüzünüzü oval alana ortalayın
                </div>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="bg-amber-950/40 border border-amber-800/80 p-3 rounded-xl text-xs text-amber-300 text-left">
              {cameraError}
            </div>
          )}

          {/* Kullanıcı Doğrulamalı Mesafe Seçimi */}
          <div className="max-w-md mx-auto bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Doğrulanan Test Mesafesi:</span>
              <span className="text-xs font-mono font-bold text-cyan-400">{verifiedDistanceCm} cm</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[50, 55, 60].map((dist) => (
                <button
                  key={dist}
                  type="button"
                  onClick={() => setVerifiedDistanceCm(dist)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5 ${
                    verifiedDistanceCm === dist
                      ? 'bg-cyan-500 text-black border-cyan-400 font-bold shadow'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {verifiedDistanceCm === dist && <Check className="w-3.5 h-3.5" />}
                  {dist} cm
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Optotip fiziksel boyutu, seçtiğiniz <strong>{verifiedDistanceCm} cm</strong> mesafesine ve kredi kartı kalibrasyonuna göre milimetrik hassasiyetle hesaplanacaktır.
            </p>
          </div>

          <div className="flex justify-center gap-4 pt-2">
            <button
              onClick={() => setTestStep('SCREEN_CALIBRATION')}
              className="text-xs text-slate-400 hover:text-white"
            >
              Geri
            </button>
            <button
              onClick={handleStartTest}
              className="py-3 px-6 rounded-xl bg-cyan-500 text-black font-semibold text-sm hover:bg-cyan-400 transition-all min-h-touch shadow-lg"
            >
              Doğrulandı, Testi Başlat
            </button>
          </div>
        </div>
      )}

      {/* ADIM 4: TEST AKIŞI (SAĞ GÖZ, SOL GÖZ, KONTRAST) */}
      {(testStep === 'TESTING_RIGHT' || testStep === 'TESTING_LEFT' || testStep === 'TESTING_CONTRAST') && (
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 md:p-8 space-y-6 text-center">
          {/* Test Durum Çubuğu */}
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
            <div>
              Aktif Aşama:{' '}
              <strong className="text-cyan-400">
                {testStep === 'TESTING_RIGHT' && '1. SAĞ GÖZ (Sol Gözünüzü Kapatın)'}
                {testStep === 'TESTING_LEFT' && '2. SOL GÖZ (Sağ Gözünüzü Kapatın)'}
                {testStep === 'TESTING_CONTRAST' && '3. Ekran Tabanlı Kontrast Duyarlılığı Ön Değerlendirmesi (İki Göz Açık)'}
              </strong>
            </div>
            <div className="font-mono text-slate-400">
              Deneme: {trialIndex} / {testStep === 'TESTING_CONTRAST' ? '5' : '6'}
            </div>
          </div>

          {/* Landolt C Görsel Sunumu */}
          <div className="py-8 flex flex-col items-center justify-center min-h-[260px] relative">
            <div className="text-xs text-slate-400 mb-4">
              {testStep === 'TESTING_CONTRAST'
                ? `Kontrast Seviyesi: %${contrastLevelPct} — Halkanın açık olan ucu hangi yönde?`
                : 'Aşağıdaki halkanın açık olan ucu hangi yönde? (Yönü seçin)'}
            </div>

            {/* Dinamik Ölçekli Landolt C SVG */}
            <div
              className={`relative flex items-center justify-center transition-all duration-200 p-4 rounded-2xl ${
                feedbackEffect === 'CORRECT'
                  ? 'ring-4 ring-emerald-400 bg-emerald-950/20'
                  : feedbackEffect === 'WRONG'
                  ? 'ring-4 ring-rose-500 bg-rose-950/20'
                  : ''
              }`}
              style={{
                opacity: testStep === 'TESTING_CONTRAST' ? contrastLevelPct / 100 : 1.0
              }}
            >
              <svg
                width={Math.max(40, optotypeSizePx)}
                height={Math.max(40, optotypeSizePx)}
                viewBox="0 0 100 100"
                style={{
                  transform: `rotate(${directionAngles[currentDirection]}deg)`,
                  transition: 'transform 0.15s ease-out'
                }}
              >
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={testStep === 'TESTING_CONTRAST' ? '#cbd5e1' : '#22d3ee'}
                  strokeWidth="20"
                  strokeDasharray="231.32 20"
                  strokeDashoffset="10"
                />
              </svg>
            </div>

            <div className="text-[11px] text-slate-500 font-mono mt-4">
              Hesaplanan Fiziksel Çap: {optotypeSizeMm.toFixed(1)} mm ({optotypeSizePx} px) • LogMAR: {currentLogMAR.toFixed(2)} • Mesafe: {verifiedDistanceCm} cm
            </div>
          </div>

          {/* 4 Yön Dokunmatik Seçim Butonları */}
          <div className="max-w-xs mx-auto grid grid-cols-3 gap-2">
            <div />
            <button
              onClick={() => handleAnswer('UP')}
              className="p-4 bg-slate-900 border border-slate-700 rounded-xl hover:bg-cyan-500 hover:text-black font-bold text-sm transition-all min-h-touch active:scale-95"
            >
              ▲ Yukarı
            </button>
            <div />
            <button
              onClick={() => handleAnswer('LEFT')}
              className="p-4 bg-slate-900 border border-slate-700 rounded-xl hover:bg-cyan-500 hover:text-black font-bold text-sm transition-all min-h-touch active:scale-95"
            >
              ◄ Sol
            </button>
            <div className="p-4 flex items-center justify-center text-xs text-slate-500 font-semibold">YÖN</div>
            <button
              onClick={() => handleAnswer('RIGHT')}
              className="p-4 bg-slate-900 border border-slate-700 rounded-xl hover:bg-cyan-500 hover:text-black font-bold text-sm transition-all min-h-touch active:scale-95"
            >
              Sağ ►
            </button>
            <div />
            <button
              onClick={() => handleAnswer('DOWN')}
              className="p-4 bg-slate-900 border border-slate-700 rounded-xl hover:bg-cyan-500 hover:text-black font-bold text-sm transition-all min-h-touch active:scale-95"
            >
              ▼ Aşağı
            </button>
            <div />
          </div>
        </div>
      )}

      {/* ADIM 5: GERÇEK SONUÇLAR VE CARE AGENT AKTARIMI */}
      {testStep === 'COMPLETED' && (
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-8 h-8 shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-white">Görme Ön Değerlendirmesi Tamamlandı</h2>
              <p className="text-xs text-slate-400">
                Sonuçlar verdiğiniz yanıtlardan ve adaptif basamak motorundan gerçek zamanlı hesaplandı.
              </p>
            </div>
          </div>

          {/* Sonuç Kartları (Asla sahte fallback göstermez) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
              <div className="text-xs text-slate-400">Sağ Göz Keskinliği</div>
              <div className="text-2xl font-bold text-cyan-400 pt-1">
                {testResults.rightEye ? testResults.rightEye.snellen : 'Değerlendirilemedi'}
              </div>
              <div className="text-[11px] text-slate-500">
                {testResults.rightEye
                  ? `LogMAR: ${testResults.rightEye.logMAR.toFixed(2)} (${testResults.rightEye.correctTrials}/${testResults.rightEye.totalTrials} Doğru)`
                  : 'Sonuç mevcut değil'}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
              <div className="text-xs text-slate-400">Sol Göz Keskinliği</div>
              <div className="text-2xl font-bold text-cyan-400 pt-1">
                {testResults.leftEye ? testResults.leftEye.snellen : 'Değerlendirilemedi'}
              </div>
              <div className="text-[11px] text-slate-500">
                {testResults.leftEye
                  ? `LogMAR: ${testResults.leftEye.logMAR.toFixed(2)} (${testResults.leftEye.correctTrials}/${testResults.leftEye.totalTrials} Doğru)`
                  : 'Sonuç mevcut değil'}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
              <div className="text-xs text-slate-400">Ekran Tabanlı Kontrast Duyarlılığı (Ön Değerlendirme)</div>
              <div className="text-2xl font-bold text-amber-400 pt-1">
                {testResults.contrast ? `${testResults.contrast.logCS.toFixed(2)} LogCS` : 'Değerlendirilemedi'}
              </div>
              <div className="text-[11px] text-slate-500">
                {testResults.contrast
                  ? `En Düşük Algılanan Kontrast: %${testResults.contrast.contrastPct}`
                  : 'Sonuç mevcut değil'}
              </div>
            </div>
          </div>

          {/* Klinik Olmayan Ön Değerlendirme & Sorumluluk Reddi */}
          <div className="bg-cyan-950/30 border border-cyan-800/60 rounded-xl p-4 text-xs text-cyan-200 space-y-2">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Ön Değerlendirme ve Bilgilendirme:</span>
            </div>
            <p className="leading-relaxed text-cyan-300/90">
              Bu test sonuçları klinik bir göz muayenesi veya kesin tıbbi tanı değildir. Standart tüketici ekranı fotometrik olarak kalibre edilmiş bir klinik cihaz olmayıp; ölçülen değerler kullanıcı doğrulamalı test mesafesi ({verifiedDistanceCm} cm) ve ekran ölçeğine dayalı işlevsel bir ön değerlendirmedir. Görme keskinliğinizde veya kontrast algınızda değişim hissediyorsanız bir göz hekimine danışmanız önerilir.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-cockpit-border">
            <button
              onClick={() => {
                setTestStep('IDLE');
                setStaircase(null);
                setTestResults({ rightEye: null, leftEye: null, contrast: null });
              }}
              className="w-full sm:w-auto text-xs text-slate-400 hover:text-white px-4 py-2"
            >
              Testi Tekrarla
            </button>

            <button
              onClick={handleNavigateToCare}
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-cyan-500 text-black font-semibold text-sm hover:bg-cyan-400 transition-all min-h-touch shadow-lg"
            >
              <span>Göz Doktorlarını İncele (Care Agent)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
