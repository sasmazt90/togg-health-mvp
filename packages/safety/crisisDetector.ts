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

export function checkCrisisTrigger(text: string, isMoving: boolean = false): CrisisCheckResult {
  const lower = text.toLowerCase();
  for (const keyword of CRISIS_KEYWORDS) {
    if (lower.includes(keyword)) {
      if (isMoving) {
        return {
          isCrisis: true,
          emergencyResponseTr:
            'Söyledikleriniz benim için çok önemli ve zor bir andan geçtiğinizi anlıyorum. Ancak ben acil durum servisi değilim. Lütfen ekrana bakmayın. Mümkün olduğunda aracınızı hemen güvenli bir yerde durdurun ve 112 Acil Çağrı Merkezini arayın. Yalnız değilsiniz.'
        };
      }
      return {
        isCrisis: true,
        emergencyResponseTr:
          'Söyledikleriniz benim için çok önemli ve şu an çok zor bir süreçten geçtiğinizi anlıyorum. Ancak ben bir acil durum veya sağlık servisi değilim. Lütfen şu an güvende kalmak için gecikmeden 112 Acil Çağrı Merkezi ile iletişime geçin. Yalnız değilsiniz, profesyonel uzmanlar size yardımcı olmak için hazır.'
      };
    }
  }
  return { isCrisis: false };
}
