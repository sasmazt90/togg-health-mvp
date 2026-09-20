/**
 * Crisis Detector
 * Ruhsal iyi oluş seanslarında intihar, kendine zarar verme veya akut kriz durumlarını filtreler.
 */

export const CRISIS_KEYWORDS = [
  'intihar',
  'kendime zarar',
  'canıma kıymak',
  'yaşamak istemiyorum',
  'ölmek istiyorum',
  'hayatıma son vermek',
  'kendimi asmak',
  'ilaç içip ölmek'
];

export interface CrisisCheckResult {
  isCrisis: boolean;
  emergencyResponseTr?: string;
}

export function checkCrisisTrigger(text: string): CrisisCheckResult {
  const lower = text.toLowerCase();
  for (const keyword of CRISIS_KEYWORDS) {
    if (lower.includes(keyword)) {
      return {
        isCrisis: true,
        emergencyResponseTr:
          'Söyledikleriniz benim için çok önemli ve şu an çok zor bir süreçten geçtiğinizi anlıyorum. Ancak ben bir acil durum veya sağlık servisi değilim. Lütfen şu an güvende kalmak için gecikmeden şu hatlarla iletişime geçin:\n\n• Acil Çağrı Merkezi: 112\n• Sağlık Bakanlığı Danışma Hattı: 182\n\nYalnız değilsiniz, profesyonel uzmanlar size yardımcı olmak için hazır.'
      };
    }
  }
  return { isCrisis: false };
}
