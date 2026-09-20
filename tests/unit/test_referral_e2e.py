import pytest
from pathlib import Path
import sys

root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root_dir / "services" / "core-api"))
sys.path.insert(0, str(root_dir / "services" / "skin"))
sys.path.insert(0, str(root_dir / "services" / "vision"))

from main import app
from fastapi.testclient import TestClient
from color_metrics import SkinRegionAnalyzer
from staircase import AdaptiveVisionStaircase

client = TestClient(app)

def test_e2e_vision_to_care_referral_flow():
    """Görme testi keskinlik düşüşü -> Referral context -> Care Agent (Göz Hastalıkları) akışı."""
    # 1. Görme testi simülasyonu: ardışık yanlışlar ile LogMAR yükselir
    staircase = AdaptiveVisionStaircase(initial_logmar=0.3)
    staircase.register_response(False)
    staircase.register_response(False)
    final_logmar = staircase.current_logmar
    assert final_logmar >= 0.4
    snellen = staircase.get_snellen_equivalent()

    # 2. Sevk bağlamı oluşturulur
    referral_context = {
        "sourceModule": "VISION",
        "specialty": "Göz Hastalıkları",
        "reasonSummary": f"Ön değerlendirmede görme keskinliği {snellen} olarak kaydedildi.",
        "timestamp": "2026-09-21T10:00:00Z"
    }

    # 3. Care Agent'a aktarım ve randevu eşleştirme
    care_resp = client.post("/api/care/match", json={
        "specialty": referral_context["specialty"],
        "preferredCity": "İstanbul",
        "useBrowserAgent": False
    })
    assert care_resp.status_code == 200
    care_data = care_resp.json()
    assert care_data["specialty"] == "Göz Hastalıkları"
    assert len(care_data["matchedSlots"]) > 0

def test_e2e_skin_to_care_referral_flow():
    """Cilt taraması görsel değişim -> Referral context -> Care Agent (Dermatoloji) akışı."""
    # 1. Cilt analizi: Sağ yanakta %25 değişim
    baseline = {"Sağ Yanak": 20.0}
    current = {"Sağ Yanak": 25.0} # +25% delta
    analysis = SkinRegionAnalyzer.compare_against_baseline(current, baseline, change_threshold=20.0)
    assert analysis["referralRecommended"] is True

    # 2. Sevk bağlamı oluşturulur
    referral_context = {
        "sourceModule": "SKIN",
        "specialty": "Dermatoloji",
        "reasonSummary": analysis["clinicalNote"],
        "timestamp": "2026-09-21T10:00:00Z"
    }

    # 3. Care Agent hekim listelemesi
    care_resp = client.post("/api/care/match", json={
        "specialty": referral_context["specialty"],
        "preferredCity": "İstanbul",
        "useBrowserAgent": False
    })
    assert care_resp.status_code == 200
    care_data = care_resp.json()
    assert care_data["specialty"] == "Dermatoloji"
    assert len(care_data["matchedSlots"]) > 0

def test_e2e_mental_to_care_referral_flow():
    """Ruhsal sohbet tekrarlayan stres teması -> Referral context -> Care Agent (Klinik Psikoloji) akışı."""
    # 1. Park halinde sohbet
    client.post("/api/vehicle/set-speed", json={"speedKmH": 0.0})
    mental_resp = client.post("/api/mental/converse", json={
        "userMessage": "Son birkaç haftadır geceleri hiç rahat uyuyamıyorum ve işte aşırı stres altındayım"
    })
    assert mental_resp.status_code == 200
    data = mental_resp.json()
    assert data["escalationSuggested"] is True

    # 2. Sevk bağlamı oluşturulur
    referral_context = {
        "sourceModule": "MENTAL",
        "specialty": "Klinik Psikoloji",
        "reasonSummary": "Tekrarlayan uyku ve stres temaları nedeniyle profesyonel görüşme önerildi.",
        "timestamp": "2026-09-21T10:00:00Z"
    }

    # 3. Care Agent üzerinden psikolog arama
    care_resp = client.post("/api/care/match", json={
        "specialty": referral_context["specialty"],
        "preferredCity": "İstanbul",
        "useBrowserAgent": False
    })
    assert care_resp.status_code == 200
    care_data = care_resp.json()
    assert care_data["specialty"] == "Klinik Psikoloji"
    assert len(care_data["matchedSlots"]) > 0
