# Togg Health MVP

> **Togg Akıllı Cihazları İçin Bütünleşik, Yapay Zekâ Destekli Önleyici Sağlık ve İyi Oluş Platformu**

[![Lisans: MIT](https://img.shields.io/badge/Lisans-MIT-blue.svg)](LICENSES.md)
[![Arayüz: Türkçe](https://img.shields.io/badge/Dil-T%C3%BCrk%C3%A7e-red.svg)](#)
[![Mimari: Monorepo](https://img.shields.io/badge/Mimari-Next.js%20%2B%20FastAPI-emerald.svg)](#)
[![Güvenlik: Non--Diagnostic](https://img.shields.io/badge/Klinik%20G%C3%BCvenlik-Tan%C4%B1%20Koymaz-orange.svg)](SAFETY.md)

---

## 1. Projenin Amacı ve Çözülen Problem

Modern araçlar artık yalnızca bir ulaşım aracı değil, kullanıcıların her gün saatlerini geçirdiği birer yaşam alanıdır ("üçüncü yaşam alanı"). Ancak günümüz araç içi sağlık teknolojileri genellikle basit kalp atışı okuma veya nefes egzersizi gibi pasif ve kopuk özelliklerle sınırlıdır.

**Togg Health MVP**, araç içi donanımları (geniş kokpit ekranı, kabin kamerası, mikrofon sistemi, araç konumu ve sürüş telemetrisi) aktif ve önleyici bir sağlık takip merkezine dönüştürür.

Bu proje bağımsız 4 ayrı demo değildir. **Ortak bir kullanıcı profili, ortak sağlık geçmişi, ortak güvenlik katmanı ve ortak randevu altyapısı** ile birbirine bağlı çalışan tek bir bütünleşik üründür.

---

## 2. Dört Temel Modül

1. **Görme Kontrolü:** Araç ekranını aktif bir optometri değerlendirme aracına dönüştürür. Kamera ile mesafe kalibrasyonu yapar; sağ/sol göz keskinliğini ve kontrast hassasiyetini ölçer, geçmiş sonuçlarla karşılaştırır.
2. **Cilt Kontrolü:** Araç içi kamera ile yüzü 6 bölgeye (alın, yanaklar, burun, çene, göz çevresi) ayırır; kızarıklık, pigmentasyon ve doku değişimlerini zamana yayılan baz çizgi ile karşılaştırır.
3. **Yapay Zekâ Destekli Ruhsal İyi Oluş Asistanı:** Yalnızca ruh hali tespiti yapmakla kalmaz; uzun süreli sesli diyalog kurar, seans hafızası tutar, eğilimleri analiz eder. Sürüş sırasında dikkat dağıtmayacak kısa sesli yanıtlara geçer, park halinde detaylı özetler sunar.
4. **Sağlık Profesyoneli ve Randevu Asistanı:** Kullanıcıya yalnızca "doktora git" demez; uygun branştaki hekimleri (DoktorTakvimi, Doktorsitesi vb.) browser agent ile tarar, kullanıcının takvimi ve araç sürüş süresiyle eşleştirir, kullanıcının açık onayıyla randevu planlar.

---

## 3. Mevcut Togg Dijital Sağlık Deneyiminden Farkımız

Togg'un halihazırda dijital sağlık alanında ruh hali analizi, ses analizi, nefes egzersizleri ve rahatlatıcı müzik gibi kıymetli çalışmaları bulunmaktadır. Bu ürün bunların bir kopyası değildir:

| Özellik | Standart Araç İçi Çözümler | Togg Health MVP |
| :--- | :--- | :--- |
| **Görme** | Yok / Yalnızca yorgunluk ikazı | Araç ekranında aktif Landolt C & kontrast hassasiyeti ön değerlendirmesi |
| **Cilt** | Yok | MediaPipe ile 6 bölgeli zaman içindeki cilt değişimi takibi |
| **Ruhsal Destek**| Kısa ruh hali etiketi, nefes egzersizi | Sürekli sesli diyalog, seans hafızası, kronik stres eğilim tespiti |
| **Aksiyon** | Pasif tavsiye ("dinlenin") | Otonom browser agent ile takvim ve araç sürüş süresi uyumlu randevu bulma |
| **Tıbbi Güvenlik**| - | Kesinlikle tanı koymaz; açık, yargılamayan değişim dili ve kriz protokolü |

---

## 4. Temel Ürün Yaklaşımı ve Klinik Dil

Ürün **TANI KOYMAMALIDIR**.

* ❌ **YANLIŞ:** *"Akneniz var."*, *"Depresyondasınız."*, *"Gözünüzde katarakt var."*
* ✅ **DOĞRU:**
  - *"Önceki ölçümünüze göre sağ yanak bölgesinde görsel bir değişim gözlendi."*
  - *"Son görüşmelerinizde stres ve uyku tekrar eden temalar olarak öne çıktı."*
  - *"Önceki değerlendirmeye göre kontrast hassasiyetinizde değişim gözlendi."*
  - *"Bir sağlık profesyoneliyle görüşmeniz faydalı olabilir."*

---

## 5. Teknik Mimari

* **Frontend:** Next.js 14+ (App Router), React, TypeScript, Tailwind CSS. Otomotiv standartlarına uygun geniş yatay ekran tasarımı, koyu tema, yüksek kontrast, büyük dokunma alanları.
* **Backend:** Python 3.11, FastAPI, Pydantic, SQLite (local-first, sıfır harici bulut bağımlılığı).
* **Araç Bağlamı (Vehicle Context):** `VehicleContextProvider` ve `MockVehicleProvider` arayüzü sayesinde gerçek Togg API'leri gelmeden sürüş/park modu eksiksiz simüle edilir.
* **Açık Kaynak Lisans İzolasyonu:** FrACT GPL olduğu için kod kopyalanmamış, formülleri sıfırdan MIT olarak yazılmıştır. MediaPipe ve Playwright ise ticari kullanıma uygun Apache-2.0 lisanslıdır.

---

## 6. Kurulum ve Çalıştırma

### Gereksinimler
- Node.js 18+ (Node 22 önerilir)
- Python 3.11+
- Git

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
   Arayüz `http://localhost:3000` adresinde çalışacaktır.

3. **Backend Kurulumu (Yeni Terminalde):**
   ```bash
   cd services/core-api
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```

---

## 7. Ana Demo Yolculukları

### Demo 1 — Görme Ön Değerlendirmesi
Ana Ekran → Görme Kontrolü → Kamera mesafe kalibrasyonu (50-60 cm) → Sağ göz testi → Sol göz testi → Kontrast hassasiyeti → Değişim analizi → Göz doktoru önerisi → Care Agent'a aktarım → Takvim ve ulaşım uyumlu slot seçimi → Kullanıcı onayı. *(Araç sürüş moduna alındığında test kilitlenir).*

### Demo 2 — Cilt Değişimi Takibi
Ana Ekran → Cilt Kontrolü → Kamera açısı ve ışık hizalaması → 6 bölgeli tarama (alın, yanaklar, burun, çene, göz çevresi) → Önceki tarama ile karşılaştırma → Bölgesel kızarıklık/doku değişimi bildirimi → Dermatolog önerisi → Randevu asistanı.

### Demo 3 — Sesli Ruhsal İyi Oluş Asistanı
Sesli başlatma ("Togg, nasılsın?") → Kullanıcı konuşur → Asistan dinler ve yanıtlar → Seans hafızası ve eğilim güncellemesi → Sürüşte kısa yanıtlar, parkta derinleşme → Tekrarlayan stres/uyku durumunda uzman psikolog önerisi → Randevu planlama.

---

## 8. Gizlilik ve Güvenlik (Privacy-by-Design)

- **Kamera ve Mikrofon:** Ham görüntüler veya sesler sunucuda saklanmaz; analiz sonrası derhal bellekten atılır.
- **Kişisel Sağlık Verisi:** Yalnızca kullanıcının yerel cihazında (local SQLite) şifrelenebilir yapıda tutulur.
- **Public Repo İzolasyonu:** `.gitignore` kuralları ile hiçbir API anahtarı, `.env` dosyası veya kişisel veri GitHub'a gönderilmez.
- Detaylar için [SAFETY.md](SAFETY.md) ve [LICENSES.md](LICENSES.md) dosyalarını inceleyin.

---

## 9. Togg Entegrasyon Stratejisi

Bu MVP, Togg'a bir fikir değil, çalışan bir ürün olarak sunulmak üzere geliştirilmiştir:
- `MockVehicleProvider` $\rightarrow$ `ToggVehicleProvider`
- `DemoIdentityProvider` $\rightarrow$ `ToggTruIDProvider`
- `MockTravelTimeProvider` $\rightarrow$ `ToggNavigationProvider`

Detaylı gelişim aşamaları için [ROADMAP.md](ROADMAP.md) belgesine bakınız.
