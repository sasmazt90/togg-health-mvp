/**
 * Skin Region Analyzer & Camera Quality Pipeline
 * Lisans: UNLICENSED (Üçüncü taraf bağımlılık: @mediapipe/tasks-vision - Apache-2.0)
 * 
 * MediaPipe FaceLandmarker entegrasyonu ile gerçek 468 landmark yüz tespiti,
 * 6 anatomik ROI (alın, yanaklar, burun, çene, göz çevresi) ekstraksiyonu,
 * göz ve dudak maskelemesi, ışık/bulanıklık kalite filtreleri.
 * 
 * Metrikler (Non-klinik trend göstergeleri):
 * - Kızarıklık eğilimi (2R - G - B piksel proxy'si)
 * - Cilt tonu/parlaklık eğilimi (CIE parlaklık proxy'si)
 * - Doku değişim göstergesi (Bölgesel piksel gradyan standart sapması)
 * 
 * Gizlilik: Ham yüz kareleri asla kaydedilmez; analiz anında RAM üzerinde çalışır ve yalnızca sayısal telemetri saklanır.
 */

import { FilesetResolver, FaceLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface FaceAlignment {
  faceDetected: boolean;
  isMediaPipeActive: boolean;
  box?: { x: number; y: number; width: number; height: number };
  yaw: number; // -1.0 (sol) to +1.0 (sağ)
  pitch: number; // -1.0 (yukarı) to +1.0 (aşağı)
  roll: number;
  scaleRatio: number; // Yüz genişliğinin kare genişliğine oranı
  isAligned: boolean;
  guidanceTextTr: string;
  landmarks?: NormalizedLandmark[];
}

export interface ImageQuality {
  isValid: boolean;
  avgLuminance: number; // 0-255
  blurScore: number; // Piksel gradyan varyansı proxy'si
  status: 'OPTIMAL' | 'TOO_DARK' | 'TOO_BRIGHT' | 'BLURRY' | 'NO_FACE';
  warningMessageTr?: string;
}

export interface RegionMetrics {
  id: 'forehead' | 'rightCheek' | 'leftCheek' | 'nose' | 'chin' | 'periorbital';
  nameTr: string;
  rednessScore: number; // 0-100 (Kızarıklık eğilimi)
  luminanceScore: number; // 0-100 (Cilt tonu/parlaklık eğilimi)
  textureVariance: number; // 0-100 (Doku değişim göstergesi)
  changeFromBaselinePct?: number; // % delta
}

export interface SkinAnalysisResult {
  id: string;
  timestamp: string;
  quality: ImageQuality;
  regions: Record<string, RegionMetrics>;
  highestChangeRegion: string;
  highestChangePct: number;
  referralSuggested: boolean;
  isBaseline: boolean;
  clinicalNoteTr: string;
  usedMediaPipe: boolean;
}

// Landmark indeksleri (MediaPipe Face Mesh Standardı)
const LM = {
  NOSE_TIP: 1,
  NOSE_BRIDGE: 4,
  FOREHEAD_TOP: 10,
  CHIN_BOTTOM: 152,
  LEFT_EYE_INNER: 362,
  LEFT_EYE_OUTER: 263,
  RIGHT_EYE_INNER: 133,
  RIGHT_EYE_OUTER: 33,
  LEFT_CHEEK_CENTER: 346,
  RIGHT_CHEEK_CENTER: 117,
  LIPS_TOP: 0,
  LIPS_BOTTOM: 17,
  LIPS_LEFT: 291,
  LIPS_RIGHT: 61
};

export class SkinAnalyzer {
  private static landmarkerInstance: FaceLandmarker | null = null;
  private static isInitializing: boolean = false;
  private static initializationFailed: boolean = false;

  /**
   * MediaPipe FaceLandmarker modelini asenkron olarak başlatır.
   */
  public static async getFaceLandmarker(): Promise<FaceLandmarker | null> {
    if (typeof window === 'undefined') return null;
    if (this.landmarkerInstance) return this.landmarkerInstance;
    if (this.initializationFailed) return null;
    if (this.isInitializing) return null;

    this.isInitializing = true;
    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      this.landmarkerInstance = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'IMAGE',
        numFaces: 1
      });
      return this.landmarkerInstance;
    } catch (err) {
      console.warn('MediaPipe FaceLandmarker yüklenemedi (yedek geometrik dedektör devrede):', err);
      this.initializationFailed = true;
      return null;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Video karesinden yüz hizalamasını ve açılarını MediaPipe veya geometrik yedek ile tespit eder.
   */
  public static assessAlignment(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): FaceAlignment {
    // 1. MediaPipe aktif mi kontrol et
    if (this.landmarkerInstance) {
      try {
        const result = this.landmarkerInstance.detect(ctx.canvas);
        if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
          return {
            faceDetected: false,
            isMediaPipeActive: true,
            yaw: 0,
            pitch: 0,
            roll: 0,
            scaleRatio: 0,
            isAligned: false,
            guidanceTextTr: 'Yüz algılanamadı. Lütfen kameranın karşısına geçin.'
          };
        }

        const lms = result.faceLandmarks[0];
        return this.calculateAlignmentFromLandmarks(lms, width, height);
      } catch (e) {
        console.warn('MediaPipe detect hatası, geometrik dedektöre düşülüyor:', e);
      }
    }

    // 2. Yedek Geometrik Ten Rengi Dedektörü
    return this.assessAlignmentFallback(ctx, width, height);
  }

  /**
   * MediaPipe landmark geometrisinden yaw, pitch, roll ve bounding box hesaplar.
   */
  private static calculateAlignmentFromLandmarks(
    lms: NormalizedLandmark[],
    width: number,
    height: number
  ): FaceAlignment {
    let minX = 1.0, maxX = 0.0, minY = 1.0, maxY = 0.0;
    for (const p of lms) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const box = {
      x: Math.round(minX * width),
      y: Math.round(minY * height),
      width: Math.round((maxX - minX) * width),
      height: Math.round((maxY - minY) * height)
    };

    const nose = lms[LM.NOSE_TIP] || { x: 0.5, y: 0.5 };
    const leftEye = lms[LM.LEFT_EYE_INNER] || { x: 0.6, y: 0.4 };
    const rightEye = lms[LM.RIGHT_EYE_INNER] || { x: 0.4, y: 0.4 };
    const chin = lms[LM.CHIN_BOTTOM] || { x: 0.5, y: 0.8 };
    const forehead = lms[LM.FOREHEAD_TOP] || { x: 0.5, y: 0.2 };

    const eyeMidX = (leftEye.x + rightEye.x) / 2.0;
    const eyeDist = Math.max(0.05, Math.abs(leftEye.x - rightEye.x));
    const faceHeightNorm = Math.max(0.1, Math.abs(chin.y - forehead.y));

    // Yaw: Burun ucunun gözler ortasından sapması
    const yaw = (nose.x - eyeMidX) / (eyeDist * 0.8);
    // Pitch: Burun ucunun dikey pozisyon sapması
    const pitch = (nose.y - (forehead.y + faceHeightNorm * 0.6)) / (faceHeightNorm * 0.5);
    // Roll: İki göz arasındaki açı
    const roll = Math.atan2(leftEye.y - rightEye.y, leftEye.x - rightEye.x);

    const scaleRatio = box.width / width;

    let guidance = 'Hizalama uygun';
    let isAligned = true;

    if (scaleRatio < 0.28) {
      guidance = 'Lütfen kameraya biraz yaklaşın';
      isAligned = false;
    } else if (scaleRatio > 0.68) {
      guidance = 'Lütfen biraz geriye çekilin';
      isAligned = false;
    } else if (yaw > 0.20) {
      guidance = 'Lütfen biraz sola dönün';
      isAligned = false;
    } else if (yaw < -0.20) {
      guidance = 'Lütfen biraz sağa dönün';
      isAligned = false;
    } else if (pitch > 0.22) {
      guidance = 'Lütfen başınızı hafifçe yukarı kaldırın';
      isAligned = false;
    } else if (pitch < -0.22) {
      guidance = 'Lütfen başınızı hafifçe aşağı eğin';
      isAligned = false;
    }

    return {
      faceDetected: true,
      isMediaPipeActive: true,
      box,
      yaw: Math.round(yaw * 100) / 100,
      pitch: Math.round(pitch * 100) / 100,
      roll: Math.round(roll * 100) / 100,
      scaleRatio: Math.round(scaleRatio * 100) / 100,
      isAligned,
      guidanceTextTr: guidance,
      landmarks: lms
    };
  }

  /**
   * Geometrik ten rengi yedek dedektörü (MediaPipe hazır değilken)
   */
  private static assessAlignmentFallback(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): FaceAlignment {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let totalSkinPixels = 0;
    let minX = width, maxX = 0, minY = height, maxY = 0;
    let sumX = 0, sumY = 0;

    const step = 4;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        if (r > 60 && g > 40 && b > 20 && r > b && (r - g) > 10 && (r - b) > 10) {
          totalSkinPixels++;
          sumX += x;
          sumY += y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const minPixelThreshold = (width * height) / (step * step * 30);
    if (totalSkinPixels < minPixelThreshold || maxX <= minX || maxY <= minY) {
      return {
        faceDetected: false,
        isMediaPipeActive: false,
        yaw: 0,
        pitch: 0,
        roll: 0,
        scaleRatio: 0,
        isAligned: false,
        guidanceTextTr: 'Yüz algılanamadı. Lütfen kameranın karşısına geçin.'
      };
    }

    const boxWidth = maxX - minX;
    const boxHeight = maxY - minY;
    const centerX = sumX / totalSkinPixels;
    const centerY = sumY / totalSkinPixels;

    const yaw = (centerX - width / 2) / (width * 0.4);
    const pitch = (centerY - height / 2) / (height * 0.4);
    const scaleRatio = boxWidth / width;

    let guidance = 'Hizalama uygun';
    let isAligned = true;

    if (scaleRatio < 0.28) {
      guidance = 'Lütfen kameraya biraz yaklaşın';
      isAligned = false;
    } else if (scaleRatio > 0.65) {
      guidance = 'Lütfen biraz geriye çekilin';
      isAligned = false;
    }

    return {
      faceDetected: true,
      isMediaPipeActive: false,
      box: { x: minX, y: minY, width: boxWidth, height: boxHeight },
      yaw: Math.round(yaw * 100) / 100,
      pitch: Math.round(pitch * 100) / 100,
      roll: 0,
      scaleRatio: Math.round(scaleRatio * 100) / 100,
      isAligned,
      guidanceTextTr: guidance
    };
  }

  /**
   * Görüntü netliğini ve aydınlatma kalitesini ölçer.
   */
  public static checkQuality(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    faceDetected: boolean = true
  ): ImageQuality {
    if (!faceDetected) {
      return {
        isValid: false,
        avgLuminance: 0,
        blurScore: 0,
        status: 'NO_FACE',
        warningMessageTr: 'Yüz algılanamadı. Lütfen kameranın karşısına geçin.'
      };
    }

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let totalLum = 0;
    let pixelCount = 0;
    let diffSum = 0;

    const step = 2;
    for (let y = 0; y < height - step; y += step) {
      for (let x = 0; x < width - step; x += step) {
        const i1 = (y * width + x) * 4;
        const i2 = (y * width + (x + step)) * 4;

        const lum1 = 0.299 * data[i1] + 0.587 * data[i1 + 1] + 0.114 * data[i1 + 2];
        const lum2 = 0.299 * data[i2] + 0.587 * data[i2 + 1] + 0.114 * data[i2 + 2];

        totalLum += lum1;
        pixelCount++;
        diffSum += Math.abs(lum1 - lum2);
      }
    }

    const avgLuminance = totalLum / Math.max(1, pixelCount);
    const blurScore = diffSum / Math.max(1, pixelCount);

    if (avgLuminance < 40) {
      return {
        isValid: false,
        avgLuminance,
        blurScore,
        status: 'TOO_DARK',
        warningMessageTr: 'Ortam ışığı yetersiz. Lütfen kabin aydınlatmasını açın.'
      };
    }
    if (avgLuminance > 220) {
      return {
        isValid: false,
        avgLuminance,
        blurScore,
        status: 'TOO_BRIGHT',
        warningMessageTr: 'Aşırı parlama veya doğrudan güneş ışığı tespit edildi.'
      };
    }
    if (blurScore < 4.0) {
      return {
        isValid: false,
        avgLuminance,
        blurScore,
        status: 'BLURRY',
        warningMessageTr: 'Görüntü net değil veya hareketli. Lütfen kameraya sabit bakın.'
      };
    }

    return {
      isValid: true,
      avgLuminance,
      blurScore,
      status: 'OPTIMAL'
    };
  }

  /**
   * 6 Anatomik ROI bölgesini gerçek MediaPipe landmark noktalarından veya oranlı geometriden çıkarır.
   * Göz ve dudak bölgelerini pikselleri bozmaması için maskeler.
   */
  public static analyzeRegions(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    alignment?: FaceAlignment
  ): Record<string, RegionMetrics> {
    const lms = alignment?.landmarks;
    const b = alignment?.box || { x: width * 0.25, y: height * 0.2, width: width * 0.5, height: height * 0.6 };

    // Dışlanacak bölgeler (Gözler ve Dudaklar)
    const exclusionBoxes: { x: number; y: number; w: number; h: number }[] = [];
    if (lms && lms.length >= 400) {
      // Sol göz
      const le = lms[LM.LEFT_EYE_INNER];
      exclusionBoxes.push({ x: le.x * width - 15, y: le.y * height - 10, w: 30, h: 20 });
      // Sağ göz
      const re = lms[LM.RIGHT_EYE_INNER];
      exclusionBoxes.push({ x: re.x * width - 15, y: re.y * height - 10, w: 30, h: 20 });
      // Dudaklar
      const lip = lms[LM.LIPS_TOP];
      exclusionBoxes.push({ x: lip.x * width - 25, y: lip.y * height - 10, w: 50, h: 25 });
    }

    // 6 ROI Tanımı
    let roiDefinitions: { id: string; nameTr: string; x: number; y: number; w: number; h: number }[];

    if (lms && lms.length >= 400) {
      // Landmark merkezli ROI'ler
      const fh = lms[LM.FOREHEAD_TOP];
      const rc = lms[LM.RIGHT_CHEEK_CENTER];
      const lc = lms[LM.LEFT_CHEEK_CENTER];
      const ns = lms[LM.NOSE_BRIDGE];
      const ch = lms[LM.CHIN_BOTTOM];
      const rw = b.width * 0.22;
      const rh = b.height * 0.16;

      roiDefinitions = [
        { id: 'forehead', nameTr: 'Alın', x: fh.x * width - rw * 0.8, y: fh.y * height, w: rw * 1.6, h: rh * 0.8 },
        { id: 'rightCheek', nameTr: 'Sağ Yanak', x: rc.x * width - rw / 2, y: rc.y * height - rh / 2, w: rw, h: rh },
        { id: 'leftCheek', nameTr: 'Sol Yanak', x: lc.x * width - rw / 2, y: lc.y * height - rh / 2, w: rw, h: rh },
        { id: 'nose', nameTr: 'Burun', x: ns.x * width - rw * 0.4, y: ns.y * height - rh * 0.4, w: rw * 0.8, h: rh * 0.8 },
        { id: 'chin', nameTr: 'Çene', x: ch.x * width - rw * 0.6, y: ch.y * height - rh * 0.8, w: rw * 1.2, h: rh * 0.7 },
        { id: 'periorbital', nameTr: 'Göz Çevresi', x: b.x + b.width * 0.2, y: b.y + b.height * 0.28, w: b.width * 0.6, h: b.height * 0.12 }
      ];
    } else {
      // Geometrik ROI'ler
      roiDefinitions = [
        { id: 'forehead', nameTr: 'Alın', x: b.x + b.width * 0.2, y: b.y + b.height * 0.08, w: b.width * 0.6, h: b.height * 0.18 },
        { id: 'rightCheek', nameTr: 'Sağ Yanak', x: b.x + b.width * 0.08, y: b.y + b.height * 0.45, w: b.width * 0.28, h: b.height * 0.25 },
        { id: 'leftCheek', nameTr: 'Sol Yanak', x: b.x + b.width * 0.64, y: b.y + b.height * 0.45, w: b.width * 0.28, h: b.height * 0.25 },
        { id: 'nose', nameTr: 'Burun', x: b.x + b.width * 0.38, y: b.y + b.height * 0.38, w: b.width * 0.24, h: b.height * 0.25 },
        { id: 'chin', nameTr: 'Çene', x: b.x + b.width * 0.32, y: b.y + b.height * 0.78, w: b.width * 0.36, h: b.height * 0.18 },
        { id: 'periorbital', nameTr: 'Göz Çevresi', x: b.x + b.width * 0.18, y: b.y + b.height * 0.26, w: b.width * 0.64, h: b.height * 0.16 }
      ];
    }

    const results: Record<string, RegionMetrics> = {};

    for (const roi of roiDefinitions) {
      const rx = Math.max(0, Math.min(width - 4, Math.round(roi.x)));
      const ry = Math.max(0, Math.min(height - 4, Math.round(roi.y)));
      const rw = Math.max(4, Math.min(width - rx, Math.round(roi.w)));
      const rh = Math.max(4, Math.min(height - ry, Math.round(roi.h)));

      const imgData = ctx.getImageData(rx, ry, rw, rh);
      const data = imgData.data;

      let sumRedness = 0;
      let sumLum = 0;
      let pixelCount = 0;
      const lumValues: number[] = [];

      for (let py = 0; py < rh; py++) {
        for (let px = 0; px < rw; px++) {
          const globalX = rx + px;
          const globalY = ry + py;

          // Dışlanan maskeleri kontrol et (Göz / Dudak içine düşüyorsa atla)
          const isExcluded = exclusionBoxes.some(
            (eb) => globalX >= eb.x && globalX <= eb.x + eb.w && globalY >= eb.y && globalY <= eb.y + eb.h
          );
          if (isExcluded) continue;

          const idx = (py * rw + px) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const bVal = data[idx + 2];

          // Kızarıklık formülü proxy'si: 2R - G - B
          const rawRedness = 2.0 * r - g - bVal;
          const normalizedRedness = Math.max(0, Math.min(100, (rawRedness / 255.0) * 100.0));
          sumRedness += normalizedRedness;

          const lum = 0.299 * r + 0.587 * g + 0.114 * bVal;
          sumLum += lum;
          lumValues.push(lum);
          pixelCount++;
        }
      }

      const avgRedness = pixelCount > 0 ? sumRedness / pixelCount : 20;
      const avgLum = pixelCount > 0 ? (sumLum / pixelCount / 255.0) * 100 : 50;

      // Doku varyansı (standart sapma proxy'si)
      let varianceSum = 0;
      const meanLum = sumLum / Math.max(1, pixelCount);
      for (const val of lumValues) {
        varianceSum += (val - meanLum) * (val - meanLum);
      }
      const variance = pixelCount > 0 ? Math.sqrt(varianceSum / pixelCount) : 10;
      const normalizedTexture = Math.min(100, Math.round(variance * 2.5));

      results[roi.id] = {
        id: roi.id as any,
        nameTr: roi.nameTr,
        rednessScore: Math.round(avgRedness * 10) / 10,
        luminanceScore: Math.round(avgLum * 10) / 10,
        textureVariance: normalizedTexture
      };
    }

    return results;
  }

  /**
   * Yeni ölçümü baz çizgi (baseline) ile karşılaştırır.
   * Eşik (%20) yapılandırılabilir ve non-kliniktir.
   */
  public static compareWithBaseline(
    current: Record<string, RegionMetrics>,
    baseline: Record<string, RegionMetrics> | null,
    threshold: number = 20.0
  ): {
    comparedRegions: Record<string, RegionMetrics>;
    highestChangeRegion: string;
    highestChangePct: number;
    referralSuggested: boolean;
    clinicalNoteTr: string;
    isBaseline: boolean;
  } {
    if (!baseline) {
      return {
        comparedRegions: current,
        highestChangeRegion: 'Tüm Bölgeler',
        highestChangePct: 0,
        referralSuggested: false,
        clinicalNoteTr: 'İlk baz çizgi (referans) taraması kaydedildi. Sonraki taramalarda değişimler bu referansa göre izlenecektir.',
        isBaseline: true
      };
    }

    let highestRegion = '';
    let maxDelta = 0;
    const compared: Record<string, RegionMetrics> = {};

    for (const [key, curr] of Object.entries(current)) {
      const base = baseline[key];
      let deltaPct = 0;
      if (base && base.rednessScore > 0) {
        deltaPct = Math.round(((curr.rednessScore - base.rednessScore) / base.rednessScore) * 100.0);
      }
      compared[key] = {
        ...curr,
        changeFromBaselinePct: deltaPct
      };

      if (Math.abs(deltaPct) > Math.abs(maxDelta)) {
        maxDelta = deltaPct;
        highestRegion = curr.nameTr;
      }
    }

    const referralNeeded = Math.abs(maxDelta) >= threshold;
    const clinicalNote = referralNeeded
      ? `Önceki ölçümünüze göre ${highestRegion} bölgesinde belirgin bir görsel değişim (%${Math.abs(maxDelta)}) gözlendi. Bir dermatologla görüşmek faydalı olabilir.`
      : 'Bölgesel görsel ölçümler baz çizgi referans bandında seyretmektedir.';

    return {
      comparedRegions: compared,
      highestChangeRegion: highestRegion,
      highestChangePct: maxDelta,
      referralSuggested: referralNeeded,
      clinicalNoteTr: clinicalNote,
      isBaseline: false
    };
  }
}
