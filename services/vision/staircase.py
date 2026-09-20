"""
Adaptive Psychometric Staircase for Visual Acuity & Contrast Sensitivity
Lisans: MIT (Kamu malı standart optometri formülleri üzerine sıfırdan yazılmıştır).
FrACT (GPL) bağımlılığı veya kod alıntısı İÇERMEZ.

Standart Formül:
MAR (Minimum Angle of Resolution) = d / D
5 arcmin = 1.0 Snellen (20/20) = 0.0 LogMAR
"""

import math
from typing import List, Tuple

class AdaptiveVisionStaircase:
    def __init__(self, initial_logmar: float = 0.3, step_size: float = 0.1):
        """
        2-down / 1-up adaptive staircase yöneticisi.
        """
        self.current_logmar = initial_logmar
        self.step_size = step_size
        self.consecutive_correct = 0
        self.history: List[Tuple[float, bool]] = []

    def register_response(self, correct: bool) -> float:
        """
        Kullanıcının yanıtına göre zorluğu (optotip boyutunu) günceller.
        """
        self.history.append((self.current_logmar, correct))
        if correct:
            self.consecutive_correct += 1
            if self.consecutive_correct >= 2:
                # Başarılı: Optotipi küçült (daha zor)
                self.current_logmar = round(max(-0.3, self.current_logmar - self.step_size), 2)
                self.consecutive_correct = 0
        else:
            self.consecutive_correct = 0
            # Hatalı: Optotipi büyüt (daha kolay)
            self.current_logmar = round(min(1.3, self.current_logmar + self.step_size), 2)
        return self.current_logmar

    def calculate_optotype_size_mm(self, viewing_distance_cm: float) -> float:
        """
        Verilen mesafe ve güncel LogMAR için Landolt C dış çapını (mm) hesaplar.
        5 arcmin = 1.0 Snellen (0.0 LogMAR)
        """
        mar_arcmin = 10 ** self.current_logmar
        mar_radians = (mar_arcmin / 60.0) * (math.pi / 180.0)
        # Landolt C boyutu = 5 * MAR
        size_mm = 5.0 * (viewing_distance_cm * 10.0) * math.tan(mar_radians)
        return round(size_mm, 2)

    def get_snellen_equivalent(self) -> str:
        """
        LogMAR'ı Snellen 20/X formatına dönüştürür.
        """
        snellen_denominator = round(20.0 * (10 ** self.current_logmar))
        return f"20/{snellen_denominator}"
