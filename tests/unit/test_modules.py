import pytest
import math
from pathlib import Path
import sys

root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root_dir / "services" / "vision"))
sys.path.insert(0, str(root_dir / "services" / "skin"))

from staircase import AdaptiveVisionStaircase
from color_metrics import SkinRegionAnalyzer

def test_vision_staircase_logic():
    staircase = AdaptiveVisionStaircase(initial_logmar=0.3, step_size=0.1)
    assert staircase.current_logmar == 0.3
    
    # 2 correct answers should decrease logmar (make it harder)
    staircase.register_response(True)
    staircase.register_response(True)
    assert staircase.current_logmar == 0.2
    
    # 1 incorrect answer should increase logmar (make it easier)
    staircase.register_response(False)
    assert staircase.current_logmar == 0.3
    
    # Calculate optotype size at 55cm
    size_mm = staircase.calculate_optotype_size_mm(55.0)
    assert size_mm > 0.0

def test_skin_baseline_comparison():
    baseline = {
        "Alın": 18.0,
        "Sağ Yanak": 20.0,
        "Sol Yanak": 21.0
    }
    
    current = {
        "Alın": 18.5,
        "Sağ Yanak": 26.0, # +30% increase
        "Sol Yanak": 21.5
    }
    
    result = SkinRegionAnalyzer.compare_against_baseline(current, baseline)
    assert result["highestChangeRegion"] == "Sağ Yanak"
    assert result["highestChangePct"] == 30.0
    assert result["referralRecommended"] is True
    assert "görsel değişim gözlendi" in result["clinicalNote"]
    assert "akne" not in result["clinicalNote"] # Safety check: non-diagnostic
