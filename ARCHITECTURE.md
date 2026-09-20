# Sistem Mimarisi (ARCHITECTURE.md)

Bu belge, **Togg Health MVP**'nin modüler monorepo yapısını, veri akışını, otomotiv soyutlama katmanlarını ve dört temel sağlık modülünün teknik mimarisini açıklar.

---

## 1. Genel Sistem Mimarisi

```
+-------------------------------------------------------------------------+
|                        TOGG HEALTH MVP KOKPİT                           |
|                  (Next.js 14 / TypeScript / Tailwind)                   |
+--------------------+-------------------------------+--------------------+
                     |                               |
        [VehicleContextProvider]            [Unified Health Profile]
        - Sürüş / Park Durumu                - Görme Geçmişi
        - Hız & Konum                        - Cilt Değişim Geçmişi
        - Kamera / Mikrofon İzinleri         - Seans Özetleri & Eğilimler
                     |                               |
+--------------------+-------------------------------+--------------------+
|                         FASTAPI CORE API                                |
|                   (Python 3.11 / Asenkron Çekirdek)                     |
+------------+---------------+-------------------+------------------------+
             |               |                   |                        |
             v               v                   v                        v
      [1. GÖRME]        [2. CİLT]          [3. MENTAL]              [4. CARE AGENT]
      - Landolt C       - MediaPipe Mesh   - Web Speech API         - Playwright Agent
      - Adaptive PEST   - CIELAB Değişim   - Driving State Machine  - Calendar Matcher
      - Kontrast        - Doku & Gözenek   - Seans Hafızası         - TravelTime Mock
      - Mesafe Ölçüm    - Bölgesel Delta   - Kriz Filtresi          - Onay Kapısı
             |               |                   |                        |
             +---------------+-------------------+------------------------+
                                         |
                       [Local-First SQLite Veritabanı]
```

---

## 2. Monorepo Yapısı

```
togg-health-mvp/
  apps/
    vehicle-app/                  # Next.js 14 kokpit web uygulaması
  services/
    core-api/                     # FastAPI ana API servisi
    vision/                       # Görme testi hesaplama & optometri servisleri
    skin/                         # Cilt bölütleme & görüntü işleme pipeline'ı
    mental/                       # Ruhsal iyi oluş ve diyalog motoru
    care-agent/                   # Otonom randevu arama ve takvim eşleme servisi
  packages/
    vehicle-context/              # IVehicleProvider & MockVehicleProvider
    health-profile/               # Ortak Pydantic ve TypeScript veri tipleri
    session-memory/               # Seans kayıt ve eğilim analiz motoru
    safety/                       # Klinik ve sürüş güvenlik katmanları
    shared/                       # Ortak konfigürasyon ve yardımcılar
  docs/                           # Ürün, mimari ve yasal dokümantasyon
  tests/                          # Birim ve uçtan uca testler
```

---

## 3. Dört Modülün Teknik Mimarisi

### 3.1. Modül 1 — Görme Kontrolü (`services/vision`)
* **Lisans Güvenliği:** GPL lisanslı FrACT kodundan bağımsız; kamu malı formüllerle ($MAR = \frac{d}{D}$) sıfırdan geliştirilmiş psikofiziksel test motoru.
* **Mesafe Kalibrasyonu:** Kameradaki iki göz bebeği arası piksel mesafesi (interpupillary distance - IPD) referans alınarak kullanıcı-ekran mesafesi ($cm$) hesaplanır.
* **Optotip ve Test Akışı:** Ekran üzerinde 8 farklı yöne açılan Landolt C halkaları oluşturulur. Adaptive staircase (2-down / 1-up) algoritması ile kullanıcının yanıtlarına göre optotip küçülür/büyür ve görme keskinliği LogMAR / Snellen eşdeğeri olarak kaydedilir.
* **Kontrast Hassasiyeti:** Arka plan ile harf arasındaki kontrast Michelson ve Weber standartlarına göre kademeli düşürülerek kontrast eşiği belirlenir.
* **Sürüş Kısıtı:** `VehicleContext.vehicleMoving == true` ise test başlatılamaz.

### 3.2. Modül 2 — Cilt Kontrolü (`services/skin`)
* **Yüz Tespiti ve Bölütleme:** Apache-2.0 lisanslı MediaPipe Face Landmarker kullanılır. 468 yüz noktasından 6 ana bölge (Alın, Sağ Yanak, Sol Yanak, Burun, Çene, Göz Çevresi) konveks poligonlar halinde dilimlenir.
* **Yönlendirme & Kalibrasyon:** Kullanıcının yüz açısı (yaw, pitch, roll) ve mesafesi hesaplanır; "Biraz sola dönün", "Lütfen yaklaşın" rehberliği sağlanır.
* **Görsel Göstergeler:**
  - *Kızarıklık İndeksi:* CIELAB $a^*$ kanalı veya $2R - G - B$ renk farkı.
  - *Pigmentasyon:* $L^*$ parlaklık ve melanin eşdeğer kontrastı.
  - *Doku & Gözenekler:* Yüksek frekanslı Laplacian filtresi varyansı.
* **Zaman İçindeki Karşılaştırma:** Kullanıcının önceki baz çizgi (baseline) taraması ile yeni tarama hizalanarak bölge bazında değişim yüzdeleri raporlanır.

### 3.3. Modül 3 — Ruhsal İyi Oluş Asistanı (`services/mental`)
* **Ses Altyapısı:** Sıfır gecikmeli tarayıcı içi Web Speech API (SpeechRecognition + SpeechSynthesis) ile çift yönlü doğal sesli diyalog. Sunucu tarafında FastAPI yedek metin motoru.
* **Çift Modlu Çalışma Mantığı:**
  - *Sürüş Modu:* Soru listeleri veya ekrana bakmayı gerektiren öğeler devre dışıdır. Asistan kısa, sakin ve dikkati dağıtmayacak konuşmalar yapar. Gerekirse seansı park anına erteler.
  - *Park Modu:* Önceki görüşmelerin duygu eğilimleri, stres grafikleri ve seans özetleri incelenebilir.
* **Görüşme Hafızası ve Eskalasyon:** Tekrarlayan seanslarda stres, tükenmişlik ve uyku problemleri birikiyorsa sistem bunu tespit eder ve Care Agent üzerinden bir klinik psikolog önerisi sunar.

### 3.4. Modül 4 — Sağlık Profesyoneli & Randevu Asistanı (`services/care-agent`)
* **Otonom Tarama:** Microsoft Playwright tabanlı otonom browser-agent. Türkiye'deki sağlık randevu platformlarından (DoktorTakvimi, Doktorsitesi vb.) hekim müsaitlik slotlarını toplar.
* **Takvim ve Ulaşım Eşleştirme:**
  - `CalendarProvider` arayüzü kullanıcının mevcut takvimini inceler.
  - `TravelTimeProvider` araç konumu ve trafik bilgisinden tahmini sürüş süresini ekler.
  - Sadece kullanıcının gerçekten yetişebileceği slotlar listelenir.
* **Açık Onay Kapısı:** Kullanıcı ekranda açık onay vermeden randevu kesinleştirilemez. CAPTCHA veya ödeme gereken durumlarda güvenli insan devri (handoff) yapılır.

---

## 4. Araç Bağlamı Soyutlama Katmanı (Vehicle Context)

Togg'un gelecekteki resmi araç yazılımı API'leri doğrudan tak-çalıştır bağlanabilecek şekilde `IVehicleProvider` / `VehicleDataProvider` arayüzü ile soyutlanmıştır (*Doğrudan fiziksel CAN-bus erişimi varsayılmaz, resmi Togg yazılım köprüleri hedeflenir*):

```typescript
export interface VehicleState {
  vehicleMoving: boolean;
  vehicleParked: boolean;
  currentSpeed: number; // km/h
  currentLocation: { lat: number; lng: number; label: string };
  destination?: { lat: number; lng: number; label: string };
  estimatedTravelTime: number; // dakika
  driverAuthenticated: boolean;
  driverName: string;
  driverFatigueSignal: 'LOW' | 'MEDIUM' | 'HIGH';
  chargingStatus: 'DISCONNECTED' | 'CHARGING' | 'COMPLETED';
  cabinCameraAvailable: boolean;
  microphoneAvailable: boolean;
}
```

MVP'de bu arayüzü `MockVehicleProvider` doldurur ve geliştirici arayüzdeki durum çubuğundan aracı tek tıkla "Park Modu (0 km/s)" veya "Sürüş Modu (75 km/s)" konumuna alabilir.

---

## 5. Gizlilik ve Veri Güvenliği (Privacy-by-Design & /privacy Ekranı)

- **Sıfır Ham Veri İlkesi:** Ham yüz görüntüleri, video kareleri veya mikrofon ses dalgaları sunucu diskine veya yerel depolamaya kalıcı olarak kaydedilmez; analiz tamamlandıktan hemen sonra bellekten silinir.
- **Yerel Depolama (Local-First):** Tüm sayısal sağlık eğilimleri ve seans özetleri yerel tarayıcı depolamasında ve yerel SQLite servisinde tutulur.
- **Gizlilik Yönetim Ekranı (`/privacy`):** Kamera/mikrofon donanım izinlerinin durumu, mental özet saklama tercihi, kayıt istatistikleri ve tek tıkla "Tüm Yerel Veriyi Sil (Geçmişimi Sıfırla)" fonksiyonu kullanıcı denetimine sunulmuştur.
- Kamusal depoya hiçbir kullanıcı verisi veya API anahtarı dahil edilmez. Kod tabanımız UNLICENSED statüsündedir.
