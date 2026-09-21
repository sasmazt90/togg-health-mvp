# Togg Health MVP

> **Togg Akıllı Cihazları İçin Bütünleşik, Yapay Zekâ Destekli Önleyici Sağlık ve İyi Oluş Platformu**

[![Lisans: UNLICENSED](https://img.shields.io/badge/Lisans-UNLICENSED-red.svg)](#)
[![Arayüz: Türkçe](https://img.shields.io/badge/Dil-T%C3%BCrk%C3%A7e-red.svg)](#)
[![Mimari: Monorepo](https://img.shields.io/badge/Mimari-Next.js%20%2B%20FastAPI-emerald.svg)](#)
[![Güvenlik: Non--Diagnostic](https://img.shields.io/badge/Klinik%20G%C3%BCvenlik-Tan%C4%B1%20Koymaz-orange.svg)](SAFETY.md)

---

## 1. Projenin Amacı ve Çözülen Problem

Modern araçlar artık yalnızca bir ulaşım aracı değil, kullanıcıların her gün saatlerini geçirdiği birer yaşam alanıdır ("üçüncü yaşam alanı"). Ancak günümüz araç içi sağlık teknolojileri genellikle basit nabız okuma veya nefes egzersizi gibi pasif ve kopuk özelliklerle sınırlıdır.

**Togg Health MVP**, araç içi donanımları (geniş kokpit ekranı, kabin kamerası, mikrofon sistemi, araç konumu ve sürüş telemetrisi) aktif ve önleyici bir sağlık takip merkezine dönüştürür.

Bu proje bağımsız 4 ayrı demo değildir. **Ortak bir kullanıcı profili, ortak sağlık geçmişi, ortak güvenlik katmanı ve modüller arası randevu sevk altyapısı (`ReferralContext`)** ile birbirine bağlı çalışan tek bir bütünleşik üründür.

---

## 2. REAL / DEMO / PLANNED Durum Matrisi

Depodaki kaynak kodlar ile dokümantasyon birebir doğrulanmıştır. Her özellik gerçeklik seviyesine göre şeffaf biçimde sınıflandırılmıştır:

### REAL (Gerçekte Çalışan Fonksiyonlar)
* **Görme (Vision):**
  - Gerçek webcam video akışı (`navigator.mediaDevices.getUserMedia`).
  - Standart kart (85.6 mm) referansı ile ekran piksel yoğunluğu (DPI ve px/mm) kalibrasyonu.
  - Kullanıcı doğrulamalı test mesafesi seçimi (50 / 55 / 60 cm) ve kamera kılavuz kadrajı.
  - 4 yönlü Landolt C optotipi ve 2-down / 1-up psikometrik adaptif basamak algoritması.
  - Ekran tabanlı Weber kontrast duyarlılığı ön değerlendirmesi (fotometrik kalibrasyon içermez, tarama amaçlıdır).
  - Sürüş halinde otomatik park kilidi (araç hareket ettiğinde test dondurulur).
* **Cilt (Skin):**
  - Sürümü pinlenmiş (`1.0.1`) Apache-2.0 lisanslı `@mediapipe/tasks-vision` (FaceLandmarker) ile gerçek 468 nirengi yüz tespiti. *(Not: İlk çalıştırmada model asset'inin Google CDN üzerinden indirilmesi için internet bağlantısı gereklidir).*
  - Yüz yönelimi (yaw, pitch, roll) ve ışık/bulanıklık kalite filtreleri.
  - 6 anatomik ROI (alın, yanaklar, burun, çene, göz çevresi) nirengi poligonu ekstraksiyonu.
  - Göz ve dudak alanlarını dışlayan koruyucu maskeleme.
  - Non-klinik piksel göstergeleri: $2R - G - B$ kızarıklık eğilimi, CIE parlaklık ve doku varyansı hesabı.
  - İlk ölçümü referans alarak zaman içindeki gerçek yüzdelik değişim ($\Delta$) takibi.
  - Sıfır ham görüntü kaydı (analiz RAM üzerinde anlık yürütülür, görüntü diske kaydedilmez).
  - Yalnızca MediaPipe doğrulaması olan sonuçların kaydedilmesine izin veren doğrulama kapısı.
* **Ruhsal Asistan (Mental):**
  - W3C Web Speech API ile tarayıcı içi gerçek zamanlı Türkçe ses tanıma (STT) ve seslendirme (TTS).
  - `MentalConversationProvider` mimarisi (OpenAI uyumlu canlı LLM veya açıkça etiketli yerel fallback motoru).
  - `MentalSessionAnalyzer` ile konuşmanın gerçek metin içeriğinden dinamik özet ve tema çıkarımı (sabit tema içermez).
  - Sürüş modunda 25 kelime altı dikkat dağıtmayan sesli yanıt kısıtları.
  - İki katmanlı kriz güvenliği: Öncelikli anahtar kelime filtresi, yalnızca 112 Acil Çağrı Merkezi yönlendirmesi (182 kriz mesajlarında ASLA yer almaz).
* **Sağlık Asistanı (Care Agent):**
  - Microsoft Playwright ile kamuya açık hekim sayfalarında salt-okunur arama girişimi ve bot koruması tespiti.
  - Erişim kısıtlandığında şeffaf güvenli web devri (Safe Handoff).
  - `CalendarProvider` gerçek zaman aralığı çarpışma matematiği.
  - Sevk bağlamı (`ReferralContext`) ile Görme, Cilt ve Mental modüllerinden branş ve gerekçe devralma.
  - Randevu devri öncesi çift kademeli zorunlu kullanıcı onayı kapısı (Mandatory Consent Gate).
* **Gizlilik ve Veri Denetimi (`/privacy`):**
  - Donanım izinleri (kamera/mikrofon) durumu ve canlı test.
  - Mental seans özetlerini saklama izni toggle'ı (kapalıyken diske hiçbir oturum yazılmaz).
  - Tek tıkla yerel sağlık geçmişini ve telemetriyi kalıcı olarak sıfırlama.

### DEMO (Simüle Edilen Bileşenler)
* **Araç Hız ve Sürüş Simülasyonu:** Üst barda yer alan Park (0 km/s) ve Sürüş (50 km/s) durum butonları ile araç telematik durumu simüle edilir (`MockVehicleProvider`).
* **Demo Randevu Slotları:** Canlı web sitelerinde bot koruması nedeniyle slot saatleri doğrudan okunamadığında devreye giren jenerik sentetik hekim/klinik profilleri (`[Demo Takvim (Yerel Simülasyon)]`).
* **Demo Takvim Verisi:** Kullanıcının mevcut ajandası yerel bir takvim modeli üzerinde test edilir (`[Demo Takvim]`).
* **Seyahat Süresi (Travel Time):** Sürüş süreleri deterministik bir mesafe modeli üzerinden hesaplanır (`[Tahmini Süre — Demo Model]`).
* **Yerel LLM Fallback:** `OPENAI_API_KEY` girilmediğinde çalışan kural tabanlı yerel yanıt motoru (`[AI: Yerel / Demo (API Key Yok)]`).

### PLANNED (Gelecek Yol Haritası)
* Togg tarafından PoC kapsamında sağlanacak resmi araç API'leri / SDK'ları (`VehicleDataProvider` / `ToggVehicleProvider` köprüsü).
* Araç içi kamera ve ses donanımlarının doğrudan API entegrasyonu.
* Togg navigasyon ve canlı trafik SDK bağlantısı.
* Sağlık kuruluşları ve hekim ağları ile kurumsal HL7 / FHIR API ortaklıkları.
* Ürün iddialarına ve hedef pazara göre gerekli klinik validasyon ve düzenleyici sınıflandırmanın değerlendirilmesi.

---

## 3. 5 Dakikalık Canlı Demo Akışı

Sunum veya değerlendirme sırasında ürünü 5 dakikada uçtan uca deneyimlemek için önerilen senaryo:

1. **Araç Park Durumu (DEMO):**
   - Üst çubukta araç durumunun **PARK (P) • 0 km/s** olduğunu doğrulayın. (Sürüş moduna alındığında testlerin güvenlik kilidiyle kapandığını gözlemleyebilirsiniz).
2. **Görme Modülü (`/vision` - REAL):**
   - Standart kart ile ekran kalibrasyonu yapın.
   - Kullanıcı doğrulamalı mesafeyi seçin (50 cm) ve yüzünüzü kamera çerçevesine hizalayın.
   - Landolt C yön testini ve ekran tabanlı kontrast duyarlılığı ön değerlendirmesini tamamlayın.
3. **Cilt Modülü (`/skin` - REAL):**
   - Kamerayı açın; **"Yüz Analizi: MediaPipe Face Landmarker"** durumunun aktifleştiğini görün.
   - 6 anatomik ROI bölgesinin nirengilerden ayrıştırılmasını izleyin ve taramayı başlatın.
   - Baz çizgiye göre bölgesel değişim yüzdesini ve non-klinik bilgilendirme notunu inceleyin.
4. **Ruhsal Asistan (`/mental` - REAL):**
   - Mikrofonu açarak Türkçe sesli sohbet edin.
   - Seansı tamamlayıp konuşulan gerçek konulardan dinamik oturum özeti çıkarıldığını görün.
   - Kriz güvenliği filtresini test edin (akut ifadelerde derhal 112 Acil Çağrı önerilir).
5. **Care Agent Randevu Sevki (`/care` - REAL + DEMO):**
   - Cilt veya Görme sonucundaki "Uzmanları İncele" butonu ile otomatik sevk bağlamının (`ReferralContext`) aktarıldığını görün.
   - Kamuya açık arama denemesini ve bot korumasında devreye giren **Safe Handoff** kartını inceleyin.
   - Demo takvim çakışma kontrolünü ve zorunlu onay kapısını (Consent Gate) test edin.
6. **Gizlilik ve Sıfırlama (`/privacy` - REAL):**
   - Donanım izinlerini denetleyin.
   - "Tüm Yerel Verileri Sıfırla" butonu ile tek tıkla cihazdaki tüm telemetriyi temizleyin.

---

## 4. Klinik Güvenlik ve İletişim Dili

Ürün **KESİNLİKLE TANI KOYMAZ**.

* ❌ **YANLIŞ:** *"Eritem tespit edildi."*, *"Gözünüz bozulmuş."*, *"Ağır depresyondasınız."*, *"Derhal doktora başvurun."*
* ✅ **DOĞRU:**
  - *"Önceki ölçümünüze göre sağ yanak bölgesinde belirgin bir görsel değişim gözlendi. Bir dermatologla görüşmek faydalı olabilir."*
  - *"Son görüşmelerinizde uyku ve yoğun tempo temalarının tekrar ettiği gözlemlendi."*
  - *"Ölçülen değerler kullanıcı doğrulamalı mesafeye dayalı işlevsel bir ön değerlendirmedir; kesin muayene niteliği taşımaz."*

Detaylı klinik protokol ve kriz kuralları için [SAFETY.md](SAFETY.md) belgesini inceleyin.

---

## 5. Kurulum ve Çalıştırma

### Gereksinimler
- Node.js 18+ (Node 20 veya 22 önerilir)
- Python 3.11+
- Google Chrome veya Chromium

### Hızlı Başlatma (Windows PowerShell)
```powershell
# Hem backend hem frontend'i tek komutla başlatır:
.\scripts\start-demo.ps1

# Test oturum verilerini sıfırlamak için:
.\scripts\reset-demo.ps1
```

### Manuel Kurulum

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
   API `http://localhost:8000` adresinde açılacaktır.

---

## 6. Testlerin Çalıştırılması

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

## 7. Lisans ve Telif Durumu

* Bu projenin kendi özgün kaynak kodları tescilli olup `"UNLICENSED"` olarak belirlenmiştir; izinsiz ticari kullanımı yasaktır.
* Kullanılan harici kütüphaneler (`@mediapipe/tasks-vision`, `playwright`, `fastapi`, `next`, `react`, `lucide-react`) izin verici (permissive) açık kaynak lisanslara (Apache-2.0, MIT, BSD, ISC) sahiptir.
* Lisans dökümü için [LICENSES.md](LICENSES.md) dosyasına bakınız.
