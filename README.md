# Togg Health MVP

> **Togg Akıllı Cihazları İçin Bütünleşik, Yapay Zekâ Destekli Önleyici Sağlık ve İyi Oluş Platformu**

[![Lisans: UNLICENSED](https://img.shields.io/badge/Lisans-UNLICENSED-red.svg)](#)
[![Arayüz: Türkçe](https://img.shields.io/badge/Dil-T%C3%BCrk%C3%A7e-red.svg)](#)
[![Mimari: Monorepo](https://img.shields.io/badge/Mimari-Next.js%20%2B%20FastAPI-emerald.svg)](#)
[![Güvenlik: Non--Diagnostic](https://img.shields.io/badge/Klinik%20G%C3%BCvenlik-Tan%C4%B1%20Koymaz-orange.svg)](SAFETY.md)

---

## 1. Projenin Amacı ve Çözülen Problem

Modern araçlar artık yalnızca bir ulaşım aracı değil, kullanıcıların her gün saatlerini geçirdiği birer yaşam alanıdır ("üçüncü yaşam alanı"). Ancak günümüz araç içi sağlık teknolojileri genellikle basit kalp atışı okuma veya nefes egzersizi gibi pasif ve kopuk özelliklerle sınırlıdır.

**Togg Health MVP**, araç içi donanımları (geniş kokpit ekranı, kabin kamerası, mikrofon sistemi, araç konumu ve sürüş telemetrisi) aktif ve önleyici bir sağlık takip merkezine dönüştürür.

Bu proje bağımsız 4 ayrı demo değildir. **Ortak bir kullanıcı profili, ortak sağlık geçmişi, ortak güvenlik katmanı ve ortak randevu sevk altyapısı (`ReferralContext`)** ile birbirine bağlı çalışan tek bir bütünleşik üründür.

---

## 2. Özellik ve Entegrasyon Durumu Matrisi

### Çalışan MVP Özellikleri (Gerçekte Çalışanlar)
* **Görme (Vision):**
  * Gerçek webcam video akışı (`getUserMedia`).
  * Standart kart (85.6 mm) ile ekran DPI kalibrasyonu.
  * Kullanıcı doğrulamalı test mesafesi (50 / 55 / 60 cm).
  * 4 yönlü Landolt C optotipi ve 2-down / 1-up psikometrik basamak algoritması.
  * Gerçek Weber kontrast hassasiyeti testi.
  * Araç hareket halindeyken otomatik park kilidi.
* **Cilt (Skin):**
  * `@mediapipe/tasks-vision` (FaceLandmarker) ile gerçek 468 nokta yüz geometrisi.
  * Yüz açısı (yaw, pitch, roll) ve ışık/bulanıklık kalite filtreleri.
  * 6 anatomik ROI (alın, yanaklar, burun, çene, göz çevresi) piksel ekstraksiyonu.
  * Göz ve dudak bölgelerini hariç tutan koruyucu maskeleme.
  * $2R - G - B$ kırmızılık eğilimi, CIE parlaklık ve doku varyansı hesabı.
  * İlk ölçümü referans alarak zaman içindeki gerçek yüzdelik değişim ($\Delta$) takibi.
  * Sıfır ham görüntü kaydı (analiz sonrası RAM'den temizlenir).
* **Ruhsal Asistan (Mental):**
  * W3C Web Speech API ile tarayıcı içi gerçek zamanlı Türkçe ses tanıma (STT) ve seslendirme (TTS).
  * `MentalConversationProvider` soyutlaması (OpenAI uyumlu canlı LLM veya açıkça etiketli yerel motor).
  * `MentalSessionAnalyzer` ile konuşmanın gerçek içeriğinden yapılandırılmış özet ve tema çıkarımı.
  * Sürüş modunda 25 kelime altı kısa, dikkat dağıtmayan sesli yanıt kısıtları.
  * İki katmanlı kriz güvenliği: Öncelikli anahtar kelime filtresi, yalnızca 112 Acil Çağrı Merkezi yönlendirmesi (182 kriz mesajlarında ASLA yer almaz).
* **Sağlık Asistanı (Care Agent):**
  * Microsoft Playwright ile kamuya açık hekim dizinlerinde salt-okunur arama ve hekim keşfi.
  * Bot koruması veya CAPTCHA durumunda şeffaf safe-handoff devri.
  * `CalendarProvider` gerçek zaman aralığı çarpışma matematiği.
  * Sevk bağlamı (`ReferralContext`) ile Görme, Cilt ve Mental modüllerinden branş ve gerekçe devralma.
  * Randevu devri öncesi zorunlu açık kullanıcı onayı kapısı (Consent Gate).
* **Gizlilik ve Veri Denetimi (`/privacy`):**
  * Donanım izinleri (kamera/mikrofon) durumu ve canlı test.
  * Mental seans özetlerini saklama izni toggle'ı.
  * Tek tıkla yerel sağlık geçmişini ve telemetriyi kalıcı olarak silme.

### Demo / Simüle Entegrasyonlar
* **Araç Hız ve Sürüş Simülasyonu:** Üst barda yer alan 0 km/s (Park) ve 50 km/s (Sürüş) butonları ile araç telematik durumu simüle edilir.
* **Demo Randevu Slotları:** Canlı web sitelerinde bot koruması nedeniyle slot saatleri okunamadığında devreye giren jenerik sentetik hekim/klinik profilleri (`[Demo Randevu Verisi]`).
* **Demo Takvim:** Kullanıcının mevcut programı yerel bir takvim simülasyonu üzerinde test edilir (`[Demo Takvim]`).
* **Travel Time:** Sürüş süreleri deterministik bir model üzerinden hesaplanır (`[Tahmini Süre — Demo Model]`).

### Togg ile PoC Sonrası Entegrasyonlar (Gelecek Yol Haritası)
* Togg tarafından sağlanacak resmi araç API'leri / SDK'ları (`VehicleDataProvider` / `ToggVehicleProvider` köprüsü).
* Kabin içi yakın kızılötesi (NIR) sürücü izleme kamerası doğrudan entegrasyonu.
* Gerçek navigasyon ve canlı trafik API'si bağlantısı.
* Resmi Togg kullanıcı profili ve kimlik doğrulama entegrasyonu.
* Sağlık Bakanlığı resmi MHRS hekim randevu API entegrasyonu.

---

## 3. Klinik Güvenlik ve İletişim Dili

Ürün **KESİNLİKLE TANI KOYMAZ**.

* ❌ **YANLIŞ:** *"Eritem tespit edildi."*, *"Gözünüz bozulmuş."*, *"Ağır depresyondasınız."*, *"Derhal doktora başvurun."*
* ✅ **DOĞRU:**
  - *"Önceki ölçümünüze göre sağ yanak bölgesinde belirgin bir görsel değişim gözlendi. Bir dermatologla görüşmek faydalı olabilir."*
  - *"Son görüşmelerinizde uyku ve yoğun tempo temalarının tekrar ettiği gözlemlendi."*
  - *"Ölçülen değerler kullanıcı doğrulamalı mesafeye dayalı işlevsel bir ön değerlendirmedir; kesin muayene niteliği taşımaz."*

Detaylı klinik protokol ve kriz kuralları için [SAFETY.md](SAFETY.md) belgesini inceleyin.

---

## 4. Kurulum ve Çalıştırma

### Gereksinimler
- Node.js 18+ (Node 20 veya 22 önerilir)
- Python 3.11+
- Google Chrome veya Chromium

### Adım Adım Kurulum

1. **Depoyu Klonlayın:**
   ```bash
   git clone https://github.com/sasmazt90/togg-health-mvp.git
   cd togg-health-mvp
   ```

2. **Frontend Kurulumu:**
   ```bash
   cd apps/vehicle-app
   npm install
   npm run dev
   ```
   Arayüz `http://localhost:3000` adresinde açılacaktır.

3. **Backend Kurulumu (Ayrı Bir Terminalde):**
   ```bash
   cd services/core-api
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   
   pip install -r requirements.txt
   python -m playwright install chromium
   
   python -m uvicorn main:app --reload --port 8000
   ```

---

## 5. Testlerin Çalıştırılması

Birim ve entegrasyon testlerini çalıştırmak için kök dizinde:
```bash
pytest tests/unit -v
```

Frontend production derlemesini doğrulamak için:
```bash
cd apps/vehicle-app
npm run build
```

---

## 6. Lisans ve Telif Durumu

* Bu projenin kendi özgün kaynak kodları tescilli olup `"UNLICENSED"` olarak belirlenmiştir; izinsiz ticari kullanımı yasaktır.
* Kullanılan harici kütüphaneler (`@mediapipe/tasks-vision`, `playwright`, `fastapi`, `next`, `react`, `lucide-react`) izin verici (permissive) açık kaynak lisanslara (Apache-2.0, MIT, BSD, ISC) sahiptir.
* Lisans dökümü için [LICENSES.md](LICENSES.md) dosyasına bakınız.
