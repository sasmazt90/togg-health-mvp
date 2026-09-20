/**
 * Skin Region Analyzer & Camera Quality Pipeline
 * Lisans: UNLICENSED
 * 
 * Deterministik piksel analizi (CIELAB a* proxy, lüminans, doku varyansı).
 * Yüz geometrisi hizalama ve görüntü kalitesi (ışık/bulanıklık) kontrolleri.
 * Gizlilik: Ham yüz kareleri asla kaydedilmez; yalnızca sayısal metrikler saklanır.
 */

export interface FaceAlignment {
  faceDetected: boolean;
  box?: { x: number; y: number; width: number; height: number };
  yaw: number; // -1.0 (aşırı sol) to +1.0 (aşırı sağ)
  pitch: number; // -1.0 (aşırı yukarı) to +1.0 (aşırı aşağı)
  roll: number;
  scaleRatio: number; // Yüz genişliğinin kare genişliğine oranı (ideal: 0.35 - 0.55)
  isAligned: boolean;
  guidanceTextTr: string;
}

export interface ImageQuality {
  isValid: boolean;
  avgLuminance: number; // 0-255
  blurScore: number; // Laplacian varyansı proxy'si
  status: 'OPTIMAL' | 'TOO_DARK' | 'TOO_BRIGHT' | 'BLURRY' | 'NO_FACE';
  warningMessageTr?: string;
}

export interface RegionMetrics {
  id: 'forehead' | 'rightCheek' | 'leftCheek' | 'nose' | 'chin' | 'periorbital';
  nameTr: string;
  rednessScore: number; // 0-100 (2R - G - B normalize)
  luminanceScore: number; // 0-100 (L* proxy)
  textureVariance: number; // 0-100 (Doku heterojenliği)
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
}

export class SkinAnalyzer {
  /**
   * Video karesinden yüz hizalamasını ve açılarını yaklaşık olarak tespit eder.
   */
  public static assessAlignment(ctx: CanvasRenderingContext2D, width: number, height: number): FaceAlignment {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let totalSkinPixels = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    let sumX = 0;
    let sumY = 0;

    // Basit ve hızlı ten rengi dağılım tespiti (YCbCr / RGB kuralı)
    const step = 4; // Performans için 4 pikselde bir örnekleme
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Ten rengi aralığı proxy'si
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

    const frameCenterX = width / 2;
    const frameCenterY = height / 2;

    const yaw = (centerX - frameCenterX) / (width * 0.4);
    const pitch = (centerY - frameCenterY) / (height * 0.4);
    const scaleRatio = boxWidth / width;

    let guidance = 'Hizalama uygun';
    let isAligned = true;

    if (scaleRatio < 0.28) {
      guidance = 'Lütfen kameraya biraz yaklaşın';
      isAligned = false;
    } else if (scaleRatio > 0.65) {
      guidance = 'Lütfen biraz geriye çekilin';
      isAligned = false;
    } else if (yaw > 0.22) {
      guidance = 'Lütfen biraz sola dönün';
      isAligned = false;
    } else if (yaw < -0.22) {
      guidance = 'Lütfen biraz sağa dönün';
      isAligned = false;
    } else if (pitch > 0.25) {
      guidance = 'Lütfen başınızı hafifçe yukarı kaldırın';
      isAligned = false;
    } else if (pitch < -0.25) {
      guidance = 'Lütfen başınızı hafifçe aşağı eğin';
      isAligned = false;
    }

    return {
      faceDetected: true,
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
  public static checkQuality(ctx: CanvasRenderingContext2D, width: number, height: number): ImageQuality {
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

    if (avgLuminance < 35) {
      return {
        isValid: false,
        avgLuminance,
        blurScore,
        status: 'TOO_DARK',
        warningMessageTr: 'Ortam ışığı yetersiz. Lütfen kabin aydınlatmasını açın.'
      };
    }
    if (avgLuminance > 225) {
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
   * 6 ROI bölgesinden gerçek pikselleri okur ve metrikleri hesaplar.
   */
  public static analyzeRegions(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    box?: { x: number; y: number; width: number; height: number }
  ): Record<string, RegionMetrics> {
    const b = box || { x: width * 0.25, y: height * 0.2, width: width * 0.5, height: height * 0.6 };

    const roiDefinitions = [
      { id: 'forehead', nameTr: 'Alın', x: b.x + b.width * 0.2, y: b.y + b.height * 0.08, w: b.width * 0.6, h: b.height * 0.18 },
      { id: 'rightCheek', nameTr: 'Sağ Yanak', x: b.x + b.width * 0.08, y: b.y + b.height * 0.45, w: b.width * 0.28, h: b.height * 0.25 },
      { id: 'leftCheek', nameTr: 'Sol Yanak', x: b.x + b.width * 0.64, y: b.y + b.height * 0.45, w: b.width * 0.28, h: b.height * 0.25 },
      { id: 'nose', nameTr: 'Burun', x: b.x + b.width * 0.38, y: b.y + b.height * 0.38, w: b.width * 0.24, h: b.height * 0.25 },
      { id: 'chin', nameTr: 'Çene', x: b.x + b.width * 0.32, y: b.y + b.height * 0.78, w: b.width * 0.36, h: b.height * 0.18 },
      { id: 'periorbital', nameTr: 'Göz Çevresi', x: b.x + b.width * 0.18, y: b.y + b.height * 0.26, w: b.width * 0.64, h: b.height * 0.16 }
    ];

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

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Kızarıklık formülü: 2R - G - B
        const rawRedness = 2.0 * r - g - b;
        const normalizedRedness = Math.max(0, Math.min(100, (rawRedness / 255.0) * 100.0));
        sumRedness += normalizedRedness;

        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        sumLum += lum;
        lumValues.push(lum);
        pixelCount++;
      }

      const avgRedness = pixelCount > 0 ? sumRedness / pixelCount : 20;
      const avgLum = pixelCount > 0 ? (sumLum / pixelCount / 255.0) * 100 : 50;

      // Doku varyansı (standart sapma proxy)
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
      // İlk tarama -> Baz çizgi oluşturulur
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
      ? `Önceki ölçümünüze göre ${highestRegion} bölgesinde belirgin bir görsel değişim (%${Math.abs(maxDelta)}) gözlendi. İsterseniz bir dermatologla görüşmek için uygun seçenekleri bulabilirim.`
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
