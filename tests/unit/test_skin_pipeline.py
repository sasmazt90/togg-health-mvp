import pytest
from pathlib import Path
import sys

root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root_dir / "services" / "skin"))

from color_metrics import SkinRegionAnalyzer, DEFAULT_DEMO_CHANGE_THRESHOLD

def test_skin_redness_metric_bounds():
    """Kızarıklık indeksi (2R - G - B) 0-100 aralığında normalize olmalıdır."""
    # Tam kırmızı
    val_red = SkinRegionAnalyzer.calculate_redness_index(255.0, 0.0, 0.0)
    assert val_red == 100.0

    # Tam yeşil (kızarıklık yok)
    val_green = SkinRegionAnalyzer.calculate_redness_index(0.0, 255.0, 0.0)
    assert val_green == 0.0

    # Nötr gri
    val_gray = SkinRegionAnalyzer.calculate_redness_index(128.0, 128.0, 128.0)
    assert 0.0 <= val_gray <= 100.0

def test_skin_baseline_delta_and_configurable_threshold():
    """Baz çizgi karşılaştırması konfigüre edilebilir eşik ile doğru çalışmalıdır."""
    baseline = {
        "Alın": 20.0,
        "Sağ Yanak": 25.0,
        "Sol Yanak": 22.0
    }
    current = {
        "Alın": 21.0,        # +5%
        "Sağ Yanak": 31.25,   # +25%
        "Sol Yanak": 22.5     # +2.2%
    }

    # Varsayılan %20 eşik ile: Sağ Yanak %25 değişim gösterir -> referral önerilmeli
    res_default = SkinRegionAnalyzer.compare_against_baseline(current, baseline, change_threshold=20.0)
    assert res_default["highestChangeRegion"] == "Sağ Yanak"
    assert res_default["highestChangePct"] == 25.0
    assert res_default["referralRecommended"] is True
    assert "belirgin bir görsel değişim gözlendi" in res_default["clinicalNote"]
    assert "dermatologla görüşmek" in res_default["clinicalNote"]

    # Eşik %30'a çekilirse aynı ölçümde referral tetiklenmemeli (configurable threshold testi)
    res_high_thresh = SkinRegionAnalyzer.compare_against_baseline(current, baseline, change_threshold=30.0)
    assert res_high_thresh["referralRecommended"] is False
    assert "referans bandında" in res_high_thresh["clinicalNote"]

def test_skin_non_diagnostic_language_guard():
    """Sonuç metninde hiçbir zaman tıbbi hastalık ismi veya teşhis yer almamalıdır."""
    forbidden_terms = ["akne", "melanom", "kanser", "ekzema", "sedef", "hastalıklısınız", "tedavi"]
    
    baseline = {"Sağ Yanak": 20.0}
    current = {"Sağ Yanak": 35.0} # +75% değişim
    res = SkinRegionAnalyzer.compare_against_baseline(current, baseline)
    
    note_lower = res["clinicalNote"].lower()
    for term in forbidden_terms:
        assert term not in note_lower

def test_skin_no_raw_image_persistence_contract():
    """Persist edilen model nesnesinde ham piksel dizisi veya base64 resim bulunmamalıdır."""
    baseline = {"Alın": 18.0, "Çene": 19.0}
    current = {"Alın": 18.5, "Çene": 19.2}
    res = SkinRegionAnalyzer.compare_against_baseline(current, baseline)
    
    # Sadece sayısal metrikler ve string açıklama olmalı
    assert "rawImage" not in res
    assert "imageData" not in res
    assert "pixels" not in res
    assert isinstance(res["deltas"], dict)
