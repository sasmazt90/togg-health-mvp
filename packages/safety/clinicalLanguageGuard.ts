/**
 * Clinical Language Guard
 * Ürünün asla tıbbi teşhis koymamasını garanti eden kural motoru.
 */

export const FORBIDDEN_DIAGNOSTIC_TERMS = [
  'akneniz var',
  'akne teşhisi',
  'depresyondasınız',
  'depresyon teşhisi',
  'gözünüzde hastalık var',
  'hastasınız',
  'tedaviye başlayın',
  'ilaç yazıyorum',
  'reçete',
  'kanser',
  'tümör',
  'melanom teşhisi',
  'miyopsunuz',
  'astigmatsınız',
  'psikiyatrik bozukluk'
];

export interface ValidationResult {
  isSafe: boolean;
  violation?: string;
  sanitizedText?: string;
}

export function validateClinicalLanguage(text: string): ValidationResult {
  const lower = text.toLowerCase();
  for (const term of FORBIDDEN_DIAGNOSTIC_TERMS) {
    if (lower.includes(term)) {
      return {
        isSafe: false,
        violation: `Tıbbi teşhis terimi tespit edildi: "${term}". Ürün yalnızca görsel ve duyusal değişim raporlayabilir.`
      };
    }
  }
  return { isSafe: true, sanitizedText: text };
}

export const STANDARD_DISCLAIMER_TR =
  'Bu değerlendirme bir tıbbi tanı veya klinik teşhis değildir. Ölçüm değerleri zaman içindeki görsel/fonksiyonel eğilimleri gösterir. Değişim gözlendiğinde bir sağlık profesyoneline danışılması önerilir.';
