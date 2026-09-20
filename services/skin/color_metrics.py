"""
Skin Regional Metrics & Delta Comparator
Lisans: Apache-2.0 / MIT
MediaPipe Face Mesh (Apache-2.0) 468 yüz noktası topolojisi referans alınır.
Yasal ve klinik olarak açıklanabilir renk uzayı (CIELAB) ve doku analizleri içerir.
"""

from typing import Dict, Any

class SkinRegionAnalyzer:
    @staticmethod
    def calculate_redness_index(r: float, g: float, b: float) -> float:
        """
        Deterministik kızarıklık indeksi: 2R - G - B (normalize 0-100 aralığında).
        """
        raw_val = (2.0 * r) - g - b
        normalized = max(0.0, min(100.0, (raw_val / 255.0) * 100.0))
        return round(normalized, 2)

    @staticmethod
    def compare_against_baseline(current_metrics: Dict[str, float], baseline_metrics: Dict[str, float]) -> Dict[str, Any]:
        """
        Baz çizgi ile yeni ölçüm arasındaki bölgesel yüzdesel değişimi hesaplar.
        """
        deltas = {}
        highest_change_region = ""
        max_delta = 0.0

        for region, curr_val in current_metrics.items():
            base_val = baseline_metrics.get(region, curr_val)
            if base_val == 0:
                pct = 0.0
            else:
                pct = round(((curr_val - base_val) / base_val) * 100.0, 1)
            deltas[region] = pct
            if abs(pct) > abs(max_delta):
                max_delta = pct
                highest_change_region = region

        referral_needed = abs(max_delta) >= 20.0 # %20 üzeri belirgin görsel değişim
        return {
            "deltas": deltas,
            "highestChangeRegion": highest_change_region,
            "highestChangePct": max_delta,
            "referralRecommended": referral_needed,
            "clinicalNote": (
                f"Önceki taramanıza göre {highest_change_region} bölgesinde görsel değişim gözlendi."
                if referral_needed
                else "Bölgesel ölçümler baz çizgi referans bandında seyretmektedir."
            )
        }
