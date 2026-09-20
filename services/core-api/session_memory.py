"""
Session Memory Manager (Local-First Persistence)
Lisans: UNLICENSED

Her görüşmeden:
- timestamp
- kısa kullanıcı onaylı özet
- yüksek seviyeli temalar
- mood (önce/sonra)
saklanır.
Ham ses veya tam konuşma dökümü KALICI OLARAK SAKLANMAZ.
"""

import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"
SESSIONS_FILE = DATA_DIR / "mental_sessions.json"

DEFAULT_SESSIONS = [
    {
        "sessionId": "men-001",
        "date": "2026-09-14T08:30:00Z",
        "durationSeconds": 240,
        "moodBefore": "STRESSED",
        "moodAfter": "FOCUSED",
        "recurringThemes": ["iş yoğunluğu", "toplantı trafiği"],
        "summaryText": "Sabah trafiğinde yoğun iş temposu üzerine konuşuldu. Kısa odaklanma desteği sağlandı.",
        "clinicalEscalationSuggested": False
    },
    {
        "sessionId": "men-002",
        "date": "2026-09-19T19:10:00Z",
        "durationSeconds": 380,
        "moodBefore": "TIRED",
        "moodAfter": "TIRED",
        "recurringThemes": ["uyku düzensizliği", "süregelen yorgunluk", "stres"],
        "summaryText": "Son 4 seans boyunca uyku kalitesi ve kronikleşen yorgunluk hissi tekrar eden ortak tema olarak öne çıktı.",
        "clinicalEscalationSuggested": True,
        "suggestedActionNote": "Son görüşmelerinizde uyku ve stres temalarının tekrar ettiği gözlemlendi. Bir klinik psikolog ile görüşmek faydalı olabilir."
    }
]

class SessionMemoryManager:
    @staticmethod
    def _ensure_storage():
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        if not SESSIONS_FILE.exists():
            with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
                json.dump(DEFAULT_SESSIONS, f, ensure_ascii=False, indent=2)

    @classmethod
    def get_all_sessions(cls) -> List[Dict[str, Any]]:
        cls._ensure_storage()
        try:
            with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return DEFAULT_SESSIONS

    @classmethod
    def add_session(
        cls,
        summary_text: str,
        recurring_themes: List[str],
        duration_seconds: int = 180,
        mood_before: str = "TIRED",
        mood_after: str = "RELAXED",
        escalation_suggested: bool = False,
        suggested_action: Optional[str] = None
    ) -> Dict[str, Any]:
        cls._ensure_storage()
        sessions = cls.get_all_sessions()
        new_session = {
            "sessionId": f"men-{len(sessions) + 1:03d}",
            "date": datetime.utcnow().isoformat() + "Z",
            "durationSeconds": duration_seconds,
            "moodBefore": mood_before,
            "moodAfter": mood_after,
            "recurringThemes": recurring_themes,
            "summaryText": summary_text,
            "clinicalEscalationSuggested": escalation_suggested,
            "suggestedActionNote": suggested_action
        }
        sessions.append(new_session)
        with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(sessions, f, ensure_ascii=False, indent=2)
        return new_session

    @classmethod
    def clear_all(cls) -> None:
        cls._ensure_storage()
        with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=2)
