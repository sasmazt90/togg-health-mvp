import pytest
from pathlib import Path
import sys

root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root_dir / "services" / "core-api"))

from mental_provider import (
    MentalConversationProvider,
    LocalFallbackMentalProvider,
    check_mental_crisis,
    get_active_mental_provider
)
from session_memory import SessionMemoryManager

def test_mental_provider_fallback_when_no_api_key(monkeypatch):
    """API anahtarı olmadığında sistem açıkça LocalFallbackMentalProvider (Demo) kullanmalıdır."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    provider = get_active_mental_provider()
    assert isinstance(provider, LocalFallbackMentalProvider)
    assert provider.is_live_llm() is False
    assert "LOCAL_DEMO" in provider.get_provider_name()

def test_mental_driving_mode_response_constraint():
    """Araç hareket halindeyken (is_driving=True) yanıt kısa, sakin ve dikkati yola odaklayıcı olmalıdır."""
    provider = LocalFallbackMentalProvider()
    reply_obj = provider.generate_reply(
        user_message="Bugün işte çok yoruldum ve çok stresliyim",
        is_driving=True,
        history=[]
    )
    
    assert reply_obj["isDriving"] is True
    assert reply_obj["escalationSuggested"] is False
    # Kısa olmalı (en fazla 2-3 cümle)
    sentences = [s for s in reply_obj["reply"].split(".") if s.strip()]
    assert len(sentences) <= 3
    # Sürüş güvenliği vurgusu
    assert any(term in reply_obj["reply"].lower() for term in ["yol", "sürüş", "dikkat", "park"])

def test_mental_crisis_flow_112_present_and_182_strictly_forbidden():
    """
    ZORUNLU KRİZ GÜVENLİK TESTİ:
    Akut kriz durumunda '112' Acil Çağrı bulunmalı;
    '182' KESİNLİKLE kriz cevabında yer almamalıdır!
    """
    crisis_messages = [
        "artık yaşamak istemiyorum",
        "kendime zarar vermek istiyorum",
        "canıma kıymak istiyorum",
        "ölmek istiyorum"
    ]

    for msg in crisis_messages:
        # Park halinde kriz
        parked_result = check_mental_crisis(msg, is_driving=False)
        assert parked_result["isCrisis"] is True
        assert "112" in parked_result["reply"]
        assert "182" not in parked_result["reply"], f"HATA: 182 kriz cevabında yer alamaz! Mesaj: {parked_result['reply']}"

        # Sürüş halinde kriz
        driving_result = check_mental_crisis(msg, is_driving=True)
        assert driving_result["isCrisis"] is True
        assert "112" in driving_result["reply"]
        assert "182" not in driving_result["reply"]
        # Ekrana baktırmama ve güvenle durma öğüdü
        assert "ekrana bakmayın" in driving_result["reply"].lower()
        assert "güvenli bir yerde durdurun" in driving_result["reply"].lower()

def test_mental_session_memory_persistence_without_raw_audio():
    """Seans hafızası özet ve temaları saklamalı, ham ses veya ses dalgası içermemelidir."""
    SessionMemoryManager.clear_all()
    initial_sessions = SessionMemoryManager.get_all_sessions()
    assert len(initial_sessions) == 0

    added = SessionMemoryManager.add_session(
        summary_text="Trafik ve iş temposu konuşuldu.",
        recurring_themes=["iş stresi", "yorgunluk"],
        duration_seconds=150,
        mood_before="STRESSED",
        mood_after="RELAXED"
    )

    assert added["summaryText"] == "Trafik ve iş temposu konuşuldu."
    assert "rawAudio" not in added
    assert "audioData" not in added
    assert "audioUrl" not in added

    all_sessions = SessionMemoryManager.get_all_sessions()
    assert len(all_sessions) == 1
    assert all_sessions[0]["sessionId"] == added["sessionId"]
