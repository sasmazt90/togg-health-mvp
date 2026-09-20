# Klinik Değerlendirme ve Güvenlik Protokolü

Bu doküman, **Togg Health MVP** sisteminde uygulanan non-diagnostic (teşhis içermeyen) klinik güvenlik protokollerini, dil kurallarını ve acil durum eskalasyon eşiklerini açıklar.

---

## 1. Tıbbi Teşhis Reddi (Non-Diagnostic Standard)

Sistem bir sağlık profesyonelinin veya teşhis cihazının yerine geçmez. Tüm kullanıcı arayüzü ve yapay zekâ metinleri aşağıdaki kurallarla filtrelenir:

1. **Yasaklı Sözcükler:** Akne, katarakt, glokom, depresyon, anksiyete bozukluğu, melanom, teşhis, reçete, tedavi.
2. **Kabul Edilen Dil Şablonları:**
   - *"Önceki ölçümünüze kıyasla [Bölge] alanında görsel bir değişim gözlendi."*
   - *"Son görüşmelerinizde uyku ve stres tekrar eden temalar olarak öne çıktı."*
   - *"Bu sonuç tıbbi tanı değildir. Bir sağlık profesyoneline danışmanız faydalı olabilir."*

---

## 2. Görme Testi Optometrik Standartları

- **Formül:** Kamuya açık MAR formülü ($MAR = \frac{d}{D}$) kullanılır.
- **Optotip Standardı:** ISO 8596 ve EN ISO 8596 Landolt C geometrisi uygulanır (Dış çap: $5d$, halkanın kalınlığı ve yarık genişliği: $1d$).
- **Mesafe Kalibrasyonu:** Kabin kamerasından alınan iki göz bebeği arası mesafe (IPD ortalaması: 63 mm) referans alınarak ekran uzaklığı ($cm$) hesaplanır.
- **Kontrast Basamakları:** Weber ve Michelson kontrast formülleri ile arka plan gri tonu ve harf tonu arasındaki parlaklık farkı kademelendirilir.

---

## 3. Cilt Analizi Renk ve Doku Protokolü

- **Yüz Bölütleme:** Apache-2.0 Google MediaPipe Face Mesh topolojisi.
- **Renk Uzayı:** Aydınlatma değişimlerine karşı $sRGB \rightarrow CIELAB$ dönüşümü.
- **Metrikler:**
  - $a^*$ ekseni: Kırmızı-yeşil renk dengesi (eritem ve kızarıklık indikatörü).
  - $L^*$ ekseni: Parlaklık ve pigmentasyon kontrastı.
  - $\nabla^2 I$ (Laplacian): Cilt yüzeyi doku pürüzlülüğü ve gözenek varyansı.
- **Eşik Değeri:** Baz çizgiye göre $\%20$ üzeri bölgesel sapmalar "Görsel Değişim" olarak işaretlenir.

---

## 4. Ruhsal Sağlık ve Kriz Protokolü

- **Ruhsal Sohbet:** Sistem bilişsel-davranışçı yaklaşım (CBT) prensiplerini empatik ve nötr bir dinleyici olarak uygular; psikoterapi uygulamaz.
- **Eskalasyon Eşiği:** Son 3 veya daha fazla seansta kronik uyku bozukluğu, yoğun stres veya duygusal tükenmişlik teması kaydedilirse profesyonel destek (klinik psikolog) önerilir.
- **Acil Durum (Kriz):** İntihar, kendine zarar verme veya şiddet ifadesi tespit edildiği anda sohbet kesilir ve **112 Acil Çağrı** ile **182 Danışma Hattı** yönlendirmesi ekranda gösterilir.
