# Togg Donanım ve Ekosistem Entegrasyon Spesifikasyonu

Bu doküman, **Togg Health MVP**'nin mevcut mock soyutlama katmanlarından gerçek Togg araç donanımlarına ve Tru.ID / Trugo ekosistemine nasıl taşınacağını detaylandırır.

---

## 1. Soyutlama Mimarisi ve Geçiş Planı

```
+-------------------------------------------------------------+
|                     Togg Health MVP UI                      |
+-------------------------------------------------------------+
                              |
                     IVehicleProvider
                              |
              +----------------+----------------+
              |                                 |
   [MockVehicleProvider]              [ToggVehicleProvider]
      (Mevcut MVP)                       (Hedef PoC)
   - Simüle hız (0/75 km/s)           - Resmi Togg Araç Telemetrisi
   - Web kamera / mic                 - Uygun kabin kamerası (PoC API erişiminde)
   - Sentetik GPS                     - Harita ve rota entegrasyonu
   - Mock Tru.ID                      - Gerçek Tru.ID OAuth2
```

---

## 2. Donanım ve Arayüz Bileşenleri

### 2.1. Araç Ekranı (Widescreen Infotainment Display)
- **Tasarım Standartları:** Togg kokpit ekranında sürücü ve yolcu görüş açılarına optimize edilmiş koyu tema (slate/zinc) ve minimum 56px dokunma hedefleri kullanılır.
- **Çözünürlük:** Yatay format (16:9 / 24:9) reaktif grid düzeni ile desteklenir.

### 2.2. Kabin İçi Kamera (In-Cabin Camera)
- **Kullanım:** Togg tarafından PoC kapsamında erişime açılacak uygun kamera, giriş, ses, navigasyon ve araç bağlamı API/SDK'ları doğrultusunda uyarlanacaktır.
- **Gizlilik:** Ham video kareleri asla diske veya uzak sunucuya yazılmaz; analiz anında RAM üzerinde çalışır ve görüntü kalıcı tutulmaz.

### 2.3. Giriş ve Ses Kontrolleri
- **Fiziksel Tuşlar:** Direksiyon tuşları erişilebilir ise Landolt C yön seçiminde alternatif bir giriş yöntemi olarak değerlendirilebilir.
- **Ses Girişi:** Togg araç içi mikrofon ve ses altyapısı üzerinden sesli diyalog entegrasyonu (uygun ses API/SDK erişimi kapsamında).

---

## 3. Telemetri ve Güvenlik Sinyalleri (Togg Araç API Soyutlaması — Gelecek Plan)

> [!NOTE]
> Tüm araç telemetrisi teknik olarak `VehicleDataProvider` / `ToggVehicleProvider` soyutlama katmanı üzerinden ve Togg tarafından sağlanacak resmi araç API'leri / SDK'ları aracılığıyla dinlenecektir.

Gelecekte `ToggVehicleProvider` tarafından Togg resmi API'larından alınması hedeflenen sinyaller:
1. `Vehicle_Speed_kmh`: $v > 0$ ise Görme ve Cilt modülleri derhal dondurulur.
2. `Gear_Position`: Yalnızca `P` konumunda kalibrasyon ve test başlatılabilir.
3. `Driver_Drowsiness_Warning`: Togg sürücü yorgunluk ikazı tetiklendiğinde Ruhsal Asistan dinlenme molası ve nefes/iyi oluş seansı önerir.
4. `Trugo_Charging_Active`: Şarj istasyonunda bekleme süresince 5 dakikalık "Mola Sağlık Kontrolü" önerilir.
