/**
 * Adaptive Vision Staircase & Landolt C Engine
 * Lisans: UNLICENSED (Kamu malı standart optometri formüllerine dayalı özgün algoritma)
 * 
 * Formüller:
 * MAR (Minimum Angle of Resolution, arcmin) = 10^LogMAR
 * 5 arcmin = 1.0 Snellen (20/20) = 0.0 LogMAR
 * Landolt C yarığı = MAR
 * Landolt C dış çapı = 5 * MAR
 */

export type OptotypeDirection = 'UP' | 'RIGHT' | 'DOWN' | 'LEFT';

export interface TrialHistoryItem {
  trialIndex: number;
  logMAR: number;
  direction: OptotypeDirection;
  userAnswer: OptotypeDirection;
  isCorrect: boolean;
}

export interface EyeTestResult {
  eye: 'RIGHT' | 'LEFT';
  logMAR: number;
  snellen: string;
  totalTrials: number;
  correctTrials: number;
  history: TrialHistoryItem[];
}

export interface ContrastResult {
  logCS: number;
  contrastPct: number;
  history: { contrastPct: number; isCorrect: boolean }[];
}

export class VisionStaircaseController {
  private currentLogMAR: number;
  private stepSize: number;
  private consecutiveCorrect: number;
  private trialsPerEye: number;
  private currentEye: 'RIGHT' | 'LEFT' = 'RIGHT';
  private eyeTrials: TrialHistoryItem[] = [];
  private rightEyeResult: EyeTestResult | null = null;
  private leftEyeResult: EyeTestResult | null = null;
  
  // Kontrast testi basamakları (Weber kontrast yüzdeleri)
  public static readonly CONTRAST_STEPS = [100, 70, 50, 35, 25, 18, 12, 8, 5, 3];
  private contrastStepIndex: number = 0;
  private contrastHistory: { contrastPct: number; isCorrect: boolean }[] = [];

  constructor(initialLogMAR: number = 0.3, stepSize: number = 0.1, trialsPerEye: number = 6) {
    this.currentLogMAR = initialLogMAR;
    this.stepSize = stepSize;
    this.consecutiveCorrect = 0;
    this.trialsPerEye = trialsPerEye;
  }

  public getActiveEye(): 'RIGHT' | 'LEFT' {
    return this.currentEye;
  }

  public getCurrentLogMAR(): number {
    return this.currentLogMAR;
  }

  public getTrialCountForActiveEye(): number {
    return this.eyeTrials.length;
  }

  public getMaxTrialsPerEye(): number {
    return this.trialsPerEye;
  }

  public getRandomDirection(): OptotypeDirection {
    const directions: OptotypeDirection[] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
    const idx = Math.floor(Math.random() * directions.length);
    return directions[idx];
  }

  /**
   * Kullanıcının cevabını doğrular ve adaptif staircase kuralını işletir.
   * 2-down / 1-up kuralı:
   * 2 ardışık doğru -> LogMAR küçülür (optotip küçülür, zorlaşır)
   * 1 yanlış -> LogMAR büyür (optotip büyür, kolaylaşır)
   */
  public registerResponse(expected: OptotypeDirection, actual: OptotypeDirection): {
    isCorrect: boolean;
    newLogMAR: number;
    eyeFinished: boolean;
    allEyesFinished: boolean;
  } {
    const isCorrect = expected === actual;
    
    this.eyeTrials.push({
      trialIndex: this.eyeTrials.length + 1,
      logMAR: this.currentLogMAR,
      direction: expected,
      userAnswer: actual,
      isCorrect
    });

    if (isCorrect) {
      this.consecutiveCorrect += 1;
      if (this.consecutiveCorrect >= 2) {
        this.currentLogMAR = Math.round(Math.max(-0.2, this.currentLogMAR - this.stepSize) * 100) / 100;
        this.consecutiveCorrect = 0;
      }
    } else {
      this.consecutiveCorrect = 0;
      this.currentLogMAR = Math.round(Math.min(1.2, this.currentLogMAR + this.stepSize) * 100) / 100;
    }

    const eyeFinished = this.eyeTrials.length >= this.trialsPerEye;
    let allEyesFinished = false;

    if (eyeFinished) {
      const result: EyeTestResult = {
        eye: this.currentEye,
        logMAR: this.currentLogMAR,
        snellen: VisionStaircaseController.logMARToSnellen(this.currentLogMAR),
        totalTrials: this.eyeTrials.length,
        correctTrials: this.eyeTrials.filter((t) => t.isCorrect).length,
        history: [...this.eyeTrials]
      };

      if (this.currentEye === 'RIGHT') {
        this.rightEyeResult = result;
        // Sol göze geç
        this.currentEye = 'LEFT';
        this.currentLogMAR = 0.3;
        this.consecutiveCorrect = 0;
        this.eyeTrials = [];
      } else {
        this.leftEyeResult = result;
        allEyesFinished = true;
      }
    }

    return {
      isCorrect,
      newLogMAR: this.currentLogMAR,
      eyeFinished,
      allEyesFinished
    };
  }

  /**
   * Kontrast hassasiyeti cevabı
   */
  public registerContrastResponse(isCorrect: boolean): {
    contrastFinished: boolean;
    currentContrastPct: number;
    logCS: number;
  } {
    const currentPct = VisionStaircaseController.CONTRAST_STEPS[this.contrastStepIndex];
    this.contrastHistory.push({ contrastPct: currentPct, isCorrect });

    if (isCorrect && this.contrastStepIndex < VisionStaircaseController.CONTRAST_STEPS.length - 1) {
      this.contrastStepIndex += 1;
    } else {
      // Bitti
      return {
        contrastFinished: true,
        currentContrastPct: currentPct,
        logCS: VisionStaircaseController.calculateLogCS(currentPct)
      };
    }

    const nextPct = VisionStaircaseController.CONTRAST_STEPS[this.contrastStepIndex];
    return {
      contrastFinished: false,
      currentContrastPct: nextPct,
      logCS: VisionStaircaseController.calculateLogCS(nextPct)
    };
  }

  public getResults(): {
    rightEye: EyeTestResult | null;
    leftEye: EyeTestResult | null;
    contrast: ContrastResult | null;
  } {
    const lastSuccess = [...this.contrastHistory].reverse().find((h) => h.isCorrect);
    const finalPct = lastSuccess ? lastSuccess.contrastPct : 100;
    const contrastRes: ContrastResult = {
      contrastPct: finalPct,
      logCS: VisionStaircaseController.calculateLogCS(finalPct),
      history: this.contrastHistory
    };

    return {
      rightEye: this.rightEyeResult,
      leftEye: this.leftEyeResult,
      contrast: contrastRes
    };
  }

  /**
   * Mesafe ve LogMAR'dan Landolt C dış çapını (mm) hesaplar.
   */
  public static calculateOptotypeSizeMm(viewingDistanceCm: number, logMAR: number): number {
    const marArcmin = Math.pow(10, logMAR);
    const marRadians = (marArcmin / 60.0) * (Math.PI / 180.0);
    // 5 * MAR formülü
    const sizeMm = 5.0 * (viewingDistanceCm * 10.0) * Math.tan(marRadians);
    return Math.max(1.0, Math.round(sizeMm * 100) / 100);
  }

  /**
   * mm'yi ekran kalibrasyonuna göre piksele çevirir.
   */
  public static mmToPixels(sizeMm: number, pixelsPerMm: number): number {
    return Math.max(12, Math.round(sizeMm * pixelsPerMm));
  }

  public static logMARToSnellen(logMAR: number): string {
    const denominator = Math.round(20.0 * Math.pow(10, logMAR));
    return `20/${denominator}`;
  }

  public static calculateLogCS(contrastPct: number): number {
    const contrastFraction = Math.max(0.01, contrastPct / 100.0);
    const logCS = Math.log10(1.0 / contrastFraction);
    return Math.round(logCS * 100) / 100;
  }
}
