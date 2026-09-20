# Ürün Yol Haritası (ROADMAP.md)

Bu yol haritası, **Togg Health MVP**'nin çalışan bir yerel prototipten Togg araç içi ticari üretim ekosistemine ve sağlık ağı ortaklıklarına uzanan stratejik gelişim aşamalarını tanımlar.

---

## Aşama 1: Yerel Entegre MVP (Mevcut Durum)
* **Hedef:** Harici bulut veya araç donanımı olmadan, standart dizüstü/masaüstü web kamerası ve mikrofonu ile çalışan 4 modüllü entegre bir ürün demosu.
* **Kapsam:**
  - FrACT-bağımsız, kamu malı optometri formüllerine dayalı Landolt C görme keskinliği ve kontrast testi.
  - Apache-2.0 MediaPipe tabanlı 6 bölgeli cilt analizi ve baz çizgi (baseline) karşılaştırması.
  - Sürüş vs. Park duyarlı, kriz protokolü entegre sesli mental asistan.
  - Playwright browser agent ile takvim ve sürüş süresi uyumlu randevu eşleştirme.
  - `MockVehicleProvider` ile sürüş/park modu simülasyonu (`VehicleDataProvider` / `ToggVehicleProvider` soyutlaması).
  - Yerel localStorage ve JSON oturum belleği ile gizlilik mimarisi.

---

## Aşama 2: Togg PoC ve Araç İçi Test Tezgahı (Sonraki Adım)
* **Hedef:** Togg test araçlarında veya kabin simülatöründe donanım entegrasyon PoC'si.
* **Kapsam:**
  - Togg araç içi dikiz aynası/kabin tavan kamerasından video akışı alımı (*Togg kabin kamera API erişimine tabidir*).
  - Direksiyon simidi tuşları (ok düğmeleri) ile Landolt C yönlerinin seçilmesi.
  - Araç içi stereo mikrofon dizilimi ve hoparlörler ile gürültü filtrelemeli sesli diyalog.
  - Togg kullanıcı profili ile oturum açma soyutlaması.

---

## Aşama 3: Gerçek Araç ve Navigasyon API Entegrasyonu
* **Hedef:** `MockVehicleProvider` yerine `ToggVehicleProvider` geçişi.
* **Kapsam:**
  - Togg Araç İçi Bilgi-Eğlence İşletim Sistemi üzerinde yerel uygulama veya optimize Web App olarak çalışma.
  - Araç Telemetrisi (Togg tarafından sağlanacak resmi araç API'leri / SDK'ları ile entegre edilir; teknik abstraction: `VehicleDataProvider` / `ToggVehicleProvider`): Araç hızı ($v > 0$), vites konumu (P/D), şarj durumu ($SOC$).
  - Dahili Togg Navigasyonu ile randevu hekiminin kliniğine tek tıkla rota oluşturma (*Togg Navigasyon SDK desteği durumunda*).
  - Trugo şarj molalarında 5 dakikalık "Mola Sağlık Kontrolü" akıllı bildirimleri.

---

## Aşama 4: Sağlık Kuruluşları ve Platform Entegrasyonları
* **Hedef:** Browser agent yaklaşımından doğrudan kurumsal API ortaklıklarına geçiş.
* **Kapsam:**
  - Türkiye'deki önde gelen randevu platformları (DoktorTakvimi, Doktorsitesi vb.) ile resmi API köprüsü.
  - Özel hastane zincirleri (Acıbadem, Memorial, Medical Park vb.) ile HL7 / FHIR uyumlu randevu entegrasyonu.
  - Kullanıcının izniyle, geçmiş görme veya cilt değişim raporunun hekime PDF / FHIR özeti olarak iletilmesi.

---

## Aşama 5: Ticari Model ve Ekosistem Yayılımı
* **Hedef:** Sürdürülebilir gelir modeli ve Togg ekosistem değeri.
* **Kapsam:**
  - **Togg Kullanıcı Aboneliği:** Tru.More uygulaması üzerinden premium sağlık asistanı aboneliği (aylık/yıllık paketler).
  - **Kurumsal Filo Sağlığı:** Togg ticari filo sürücülerinin yorgunluk, stres ve görme sağlığının anonim/toplu takibi.
  - **Sağlık Kuruluşları ile Ortaklık:** Tarafsız sıralama ilkesi korunarak, onaylanan randevulardan teknoloji komisyonu veya yazılım lisanslama geliri.
