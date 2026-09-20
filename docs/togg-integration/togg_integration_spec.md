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
  - Simüle hız (0/75 km/s)           - CAN-bus telemetrisi
  - Web kamera / mic                 - Kabin tavan kamerası
  - Sentetik GPS                     - Dahili Togg Navigasyonu
  - Mock Tru.ID                      - Gerçek Tru.ID OAuth2
```

---

## 2. Donanım ve Arayüz Bileşenleri

### 2.1. Araç Ekranı (Widescreen Infotainment Display)
- **Tasarım Standartları:** Togg'un uçtan uca uzanan panoramik kokpit ekranında, sürücü ve yolcu görüş açılarına optimize edilmiş koyu tema (slate/zinc) ve minimum 56px dokunma hedefleri kullanılır.
- **Çözünürlük:** Yatay format (16:9 / 24:9) reaktif grid düzeni ile desteklenir.

### 2.2. Kabin İçi Kamera (In-Cabin Camera)
- **Kullanım:** Görme keskinliği testi için mesafe/IPD ölçümü ve cilt analizi için 6 yüz bölgesi tespiti.
- **Protokol:** RTSP / GStreamer video stream üzerinden yerel bellek tamponuna (frame buffer) aktarılır.
- **Gizlilik:** Ham video kareleri asla diske yazılmaz; analiz tamamlandıktan hemen sonra bellekten silinir.

### 2.3. Direksiyon ve Ses Kontrolleri
- **Fiziksel Butonlar:** Landolt C görme testi yönlendirmeleri direksiyondaki 4 yönlü D-Pad tuşları ile kontrol edilebilir.
- **Mikrofon Dizilimi:** Kabin içi hüzmeleme (beamforming) destekli stereo mikrofon ile arka plan yol ve motor gürültüsü filtrelenir.

---

## 3. Telemetri ve Güvenlik Sinyalleri (CAN-bus Entegrasyonu)

Aşağıdaki CAN sinyalleri `ToggVehicleProvider` tarafından dinlenir:
1. `Vehicle_Speed_kmh`: $v > 0$ ise Görme ve Cilt modülleri derhal dondurulur.
2. `Gear_Position`: Yalnızca `P` konumunda kalibrasyon ve test başlatılabilir.
3. `Driver_Drowsiness_Warning`: Togg'un sürücü yorgunluk ikazı tetiklendiğinde Ruhsal Asistan dinlenme molası ve nefes/iyi oluş seansı önerir.
4. `Trugo_Charging_Active`: Şarj istasyonunda bekleme süresince 5 dakikalık "Mola Sağlık Kontrolü" önerilir.
