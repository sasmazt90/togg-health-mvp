# Canlı test düzeltmeleri

Başlangıç: main 7b3010ca5f03a55f0faa906296520d8097974acb; doğrulanmış Linux run 36955786226. Bu sonuçlar yeni değişikliklerin geçtiği anlamına gelmez.

## Başlangıç sınıflandırması

| Belge konusu | Sınıf | Kaynak / sınır |
|---|---|---|
| Işık ve netlik etiketleri | Kodla doğrulanmış hata | Tüm kare ölçülüyordu; bilinmeyen durumda yeşil etiket. Kamera piksel kalitesi klinik yeterlilik değildir. |
| Sağ/sol talimatı | Ek doğrulama gereken gözlem | Tek açıdaki talimat karşıya dönme isteğiydi; screenshot yaw işaretini kanıtlamaz. |
| Üç ayrı açı | Yeni ürün gereksinimi | Başlangıçta tek karşı açı; üç açı mevcutmuş gibi gösterilmemeli. |
| Siyah sonuç / bölge gösterimi | Kodla doğrulanmış hata | Durdurulan video; sabit demo mesh gerçek landmark gibi görünüyordu. |
| İlk referans / bölgesel not | Kodla doğrulanmış hata | İlk taramada yüzde; tüm taramanın notu başka bölgeye aktarılıyordu. |
| Aksiyon okları / hatırlatma | Hata ve yeni gereksinim | İşlevsiz oklar; kapalı uygulama bildirimi için tarayıcı timer uygun değil. |
| Profilde ikinci gizlilik düğmesi | Tasarım gereksinimi | Üst menü izin denetimi korunmalı. |
| Çok turlu görüşme / tüm mesajlar / bitişte özet | Kodla doğrulanmış hata ve yeni akış | Single-shot recognition; TTS sonrası başlamama; slice(-2); erken kayıt. |
| Tekrarlayan cevap / robotik ses | Sağlayıcı ve ortam | Yerel sağlayıcı deterministik; yapılandırılmış anahtar başarılı istek demek değildir. |
| Türkçe özet / grafik | Kodla doğrulanmış hata ve tasarım | Enum metni görünüyordu; taslak yüzdeleri gerçek veri değildir. |
| Landolt boşluğu / yan yana düzen | Kodla doğrulanmış hata ve tasarım | Dash boşluğu kardinal açıyla uyuşmuyordu. Dört yön ve mm ölçüsü korunur. |
| Seçmeli rapor / PDF | Kodla doğrulanmış hata ve yeni akış | Sadece alert; otomatik tüm kategoriler; örnek hasta kimliği. |

## Değişiklik ve doğrulama notları

- Landolt: dış çap 100, çizgi 20 ve boşluk 20 birim; sağda merkezlenmiş 20 birim açıklığı olan doğrudan yay path'i. Kalibre edilmiş küçük boyutlarda raster maske kullanılmaz. Rotasyon animasyonu yok. Dört yön gerçek tarayıcı pikselleriyle sınanır; motorun kalibre boyutu büyütülmez.
- Paylaşım: başlangıçta tüm seçimler kapalı; veri olmayan kategoriler devre dışı. Tek seçilmiş veri modeli önizleme ve disposable yazdırma belgesine gider. Yazdırma/PDF kaydetme işletim sistemi penceresinde kullanıcı işlemi; dosya indirildi veya hekime gönderildi iddiası yok.
- Cilt: yüz kutusu kalite bölgesi; 40–220 ve 4.0 eşikleri korunur. Boş ROI sayısal varsayılan üretmez. Sonuç açık etiketli anatomik şemadır; kamera kapalı, yüz fotoğrafı saklanmaz. Scan overlay gerçek landmark noktalarıdır, video object-contain ile aynı koordinat alanındadır.
- Referans: ilk sayısal tarama, ayrı metadata; eski referans silinmez. Eski metadata yoksa veya ışık/netlik uyumsuzsa delta sunulmaz. Işık farkı 15 piksel birimi ve netlik oranı 2; yaw/pitch farkı .12, roll farkı .15 ve yüz ölçeği farkı .08, karşılaştırmayı engelleyen muhafazakâr MVP koşullarıdır; klinik doğrulanmış sınırlar değildir.
- Trend: ilk referans sıfır değişim noktası sayılmaz; yalnızca karşılaştırılabilir takip deltasından grafik. Saat görünür, grafik ölçeği değerleri kapsar.
- Hatırlatma: 28 takvim günü; aynı plan tek UID, düzenleme/iptal. Gerçek .ics dosyası DISPLAY alarm içerir, hassas sağlık başlığı içermez. İçe aktarım ve takvim bildirimi doğrulanamadığı açıkça gösterilir. Uygulama kapalıyken kendi servisleri çalıştırılmaz. Takvime aktarılmış kayıt uygulama içi iptal ile takvimden silinmez; kullanıcıya ayrıca silmesi gerektiği bildirilir.

## Korunan doğrulamalar

Eski runner_v2 görme seçicisi `circle[stroke-dasharray]` yerine `svg[data-logmar]` kullanır; aynı üç doğru cevap sonrası gerçek boyut küçülme assertion korunur. Ek test dört yönün screenshot piksellerini doğrular.

Test beklentisi değişikliği gerektiğinde eski güvenlik amacı kaldırılmaz. Örneğin yeni görüşme yaşam döngüsünde erken kayıt bekleyen test, bitiş öncesi sıfır ve bitiş sonrası tek kayıt doğrulamasına dönüşmelidir. Yeni kalıcı alanlar gizlilik silme listesine dahildir. Makineye özel dosya yolları ve gerçek yüz/ses verileri repoya veya CI artifact'ine eklenmez.

Canlı sağlayıcı, gerçek Türkçe ses doğallığı, çok açılı fixture, Windows kısayol tanıtımı ve final Linux matrisi tamamlanmadan bütün kapsam tamamlandı denemez. Klinik doğruluk veya gerçek araç donanımı entegrasyonu iddiası yoktur.

## Ara doğrulama (Windows, anahtarsız yerel sağlayıcı)

- 114 birim testi geçti: başlangıçtaki 111 test korunur, 3 yeni test eklenir.
- Typecheck, lint, fresh production build geçti. Lint önceki üç uyarıyı bildiriyor.
- Tam ve production-only npm audit sıfır bulgu; bağımlılık manifest/lockfile değişmedi.
- İlk/ikinci gerçek MediaPipe taraması UI üzerinden; altı bölge, kamera track sonlanması, metadata ve gerçek bölgesel delta doğrulandı.
- Takvim dosyası gerçekten indirildi; UID tekrarsızlığı/iptal, depolama hatasının iletilmesi ve demo ayrımı doğrulandı.
- Yerel gerçek print beforeprint olayında seçilen cilt belgesi incelendi; seçilmeyen kategoriler HTML ve metadata içinde yok. Bu kontrol Windows PDF kaydetme diyalog seçiminin tamamlandığını iddia etmez.
- Yeni piksel testi PNG'yi tarayıcının yerel decoder'ıyla okur; Pillow ek bağımlılığı gerektirmez. Küçük ölçeklerde raster maskeyi kaldıran doğrudan Landolt yay path'i kullanılır.
- Bu ara kanıt final Linux/Windows/ses/çok açı kabul matrisi yerine geçmez.

### SVG raster sınırı için teknik kanıt

Chromium `SVGRootPainter` açıklaması, SVG layout viewport'u kesirli kalırken root border box'ın paint sırasında piksele yuvarlandığını belirtir:
https://chromium.googlesource.com/chromium/src/+/HEAD/third_party/blink/renderer/core/paint/svg_root_painter.h

Kesirli kare ölçüleri yatay/dikey farklı yuvarlanabiliyor. Dış SVG viewport'u tam piksel boyutunda ve minimum iki piksel boşlukludur; iç SVG'nin genişlik/yüksekliği mevcut kalibre `optotypeSizePx` değeridir. Görme sembolünün boyutu büyütülmez, logMAR hesabı değişmez. Runner/backlog rotasyon seçicileri dış SVG'nin gerçek dönüşümüne taşınır; fiziksel boyut assertion'ları içteki ölçülen simgede korunur. Yeni piksel testi dört yöne cevap doğruluğunu gerçek screenshot'ta denetler.
