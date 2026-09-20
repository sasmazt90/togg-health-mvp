import pytest
from datetime import datetime, timedelta
from pathlib import Path
import sys

root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root_dir / "services" / "core-api"))

from care_provider import (
    CareSearchProvider,
    DemoCareSearchProvider,
    BrowserCareSearchProvider,
    CalendarProvider,
    TravelTimeProvider
)

def test_care_provider_normalization():
    """Tüm sağlayıcılar normalize edilmiş slot şeması döndürmelidir."""
    provider = DemoCareSearchProvider()
    result = provider.search_slots(specialty="Dermatoloji", city="İstanbul")
    
    assert result["status"] == "SUCCESS"
    assert len(result["slots"]) > 0
    
    first_slot = result["slots"][0]
    required_keys = ["id", "specialty", "providerName", "clinicName", "dateTime", "travelTimeMin", "sourceType", "sourceBadge"]
    for key in required_keys:
        assert key in first_slot, f"Eksik anahtar: {key}"
    assert first_slot["sourceType"] in ["LIVE", "DEMO"]

def test_calendar_provider_interval_conflict_math():
    """Takvim sağlayıcısı zaman aralığı çakışmalarını doğru hesaplamalıdır."""
    cal = CalendarProvider()
    now = datetime.now()
    
    # 1. Çakışan zaman: Yarın 18:20 (Kullanıcının yarın 18:00 - 19:00 arası toplantısı var)
    conflict_time = (now + timedelta(days=1)).replace(hour=18, minute=20, second=0, microsecond=0).isoformat()
    assert cal.has_conflict(conflict_time, duration_min=45) is True

    # 2. Uygun zaman: Yarın 14:00 (Program boş)
    free_time = (now + timedelta(days=1)).replace(hour=14, minute=0, second=0, microsecond=0).isoformat()
    assert cal.has_conflict(free_time, duration_min=45) is False

def test_travel_time_provider_mock_badge():
    """Harita anahtarı olmadığında seyahat süresi açıkça 'Demo Veri' olarak işaretlenmelidir."""
    travel = TravelTimeProvider.calculate_travel_time_min("Dünyagöz Etiler, Beşiktaş")
    assert travel["isLiveTraffic"] is False
    assert travel["provider"] == "MockTravelTimeProvider"
    assert "Demo Veri" in travel["trafficBadge"]
    assert travel["estimatedMinutes"] > 0

def test_care_browser_search_bot_block_or_network_fallback():
    """Playwright arama bot engeli veya ağ kısıtı ile karşılaştığında çökmek yerine güvenli handoff dönmelidir."""
    browser_provider = BrowserCareSearchProvider()
    # Kamusal aramayı çalıştır
    result = browser_provider.search_slots(specialty="Göz Hastalıkları", city="İstanbul")
    
    assert "status" in result
    assert result["status"] in ["SUCCESS", "FALLBACK_BLOCKED"]
    assert "slots" in result
    assert len(result["slots"]) > 0
    assert "liveSearchUrl" in result
