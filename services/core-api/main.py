"""
Togg Health MVP - Core API (FastAPI)
Yerel önleyici sağlık ve araç bağlamı orkestrasyon servisi.
Lisans: UNLICENSED
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import os

from mental_provider import get_active_mental_provider, check_mental_crisis
from session_memory import SessionMemoryManager
from care_provider import BrowserCareSearchProvider, DemoCareSearchProvider, CalendarProvider, TravelTimeProvider

app = FastAPI(
    title="Togg Health MVP Core API",
    description="Togg araç içi önleyici sağlık, görme, cilt, sesli asistan ve randevu orkestrasyonu.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# In-Memory State & Mock Data (Local-First)
# ---------------------------------------------------------------------------

vehicle_state = {
    "state": "PARKED",
    "vehicleMoving": False,
    "vehicleParked": True,
    "currentSpeed": 0,
    "gear": "P",
    "currentLocation": {"latitude": 40.9912, "longitude": 29.0234, "label": "Kadıköy, İstanbul"},
    "destination": {"latitude": 41.0082, "longitude": 28.9784, "label": "Levent, İstanbul"},
    "estimatedTravelTimeToDestMin": 22,
    "driverAuthenticated": True,
    "driverId": "tru-user-001",
    "driverName": "Ahmet Yılmaz",
    "driverFatigueSignal": "LOW",
    "cabinCameraAvailable": True,
    "microphoneAvailable": True,
    "batteryLevelPct": 78,
    "lastUpdated": datetime.utcnow().isoformat()
}

profile_state = {
    "user": {
        "id": "user-togg-001",
        "displayName": "Ahmet Yılmaz",
        "truId": "TRU-8924-IST",
        "ageRange": "36-50",
        "preferredCity": "İstanbul",
        "preferredConsultationType": "ALL"
    },
    "visionSummary": {
        "lastTestDate": "2026-09-18T09:15:00Z",
        "acuityRightSnellen": "20/30",
        "acuityLeftSnellen": "20/24",
        "contrastSensitivityLogCS": 1.55,
        "baselineDiffNote": "Önceki ölçümünüze göre sağ göz kontrast hassasiyetinizde değişim gözlendi.",
        "referralSuggested": True
    },
    "skinSummary": {
        "lastScanDate": "2026-09-17T18:40:00Z",
        "highestChangeRegion": "Sağ Yanak",
        "changePct": 24,
        "baselineDiffNote": "Önceki ölçümünüze göre sağ yanak bölgesinde belirgin bir görsel değişim gözlendi. İsterseniz bir dermatologla görüşmek için uygun seçenekleri bulabilirim.",
        "referralSuggested": True
    },
    "mentalSummary": {
        "lastSessionDate": "2026-09-19T19:10:00Z",
        "recurringThemes": ["uyku düzensizliği", "süregelen yorgunluk", "stres"],
        "summaryText": "Son görüşmelerinizde uyku ve stres temalarının tekrar ettiği gözlemlendi.",
        "referralSuggested": True
    }
}

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class SpeedUpdatePayload(BaseModel):
    speedKmH: float

class ConversePayload(BaseModel):
    userMessage: str
    sessionId: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = None

class CreateSessionPayload(BaseModel):
    summaryText: str
    recurringThemes: List[str]
    durationSeconds: Optional[int] = 180
    moodBefore: Optional[str] = "TIRED"
    moodAfter: Optional[str] = "RELAXED"
    escalationSuggested: Optional[bool] = False
    suggestedAction: Optional[str] = None

class AppointmentMatchPayload(BaseModel):
    specialty: str
    preferredCity: Optional[str] = "İstanbul"
    maxTravelTimeMin: Optional[int] = 30
    useBrowserAgent: Optional[bool] = True

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def read_root():
    return {
        "service": "Togg Health MVP Core API",
        "status": "OPERATIONAL",
        "language": "tr-TR",
        "clinicalSafety": "Non-diagnostic trend monitoring",
        "version": "0.2.0-faz2"
    }

@app.get("/api/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

# ---------------------------------------------------------------------------
# Vehicle State
# ---------------------------------------------------------------------------

@app.get("/api/vehicle/state")
def get_vehicle_state():
    return vehicle_state

@app.post("/api/vehicle/toggle")
def toggle_vehicle_mode():
    if vehicle_state["vehicleParked"]:
        vehicle_state["currentSpeed"] = 75
        vehicle_state["vehicleMoving"] = True
        vehicle_state["vehicleParked"] = False
        vehicle_state["gear"] = "D"
        vehicle_state["state"] = "DRIVING"
    else:
        vehicle_state["currentSpeed"] = 0
        vehicle_state["vehicleMoving"] = False
        vehicle_state["vehicleParked"] = True
        vehicle_state["gear"] = "P"
        vehicle_state["state"] = "PARKED"
    vehicle_state["lastUpdated"] = datetime.utcnow().isoformat()
    return vehicle_state

@app.post("/api/vehicle/set-speed")
def set_vehicle_speed(payload: SpeedUpdatePayload):
    is_moving = payload.speedKmH > 0
    vehicle_state["currentSpeed"] = payload.speedKmH
    vehicle_state["vehicleMoving"] = is_moving
    vehicle_state["vehicleParked"] = not is_moving
    vehicle_state["gear"] = "D" if is_moving else "P"
    vehicle_state["state"] = "DRIVING" if is_moving else "PARKED"
    vehicle_state["lastUpdated"] = datetime.utcnow().isoformat()
    return vehicle_state

@app.get("/api/profile")
def get_profile():
    return profile_state

# ---------------------------------------------------------------------------
# Mental Wellbeing Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/mental/provider-status")
def get_mental_provider_status():
    provider = get_active_mental_provider()
    return {
        "providerName": provider.get_provider_name(),
        "isLiveLLM": provider.is_live_llm(),
        "apiKeyConfigured": bool(os.getenv("OPENAI_API_KEY"))
    }

@app.post("/api/mental/converse")
def converse_mental_assistant(payload: ConversePayload):
    is_driving = vehicle_state["vehicleMoving"]
    user_msg = payload.userMessage.strip()

    # 1. Kriz Güvenlik Filtresi (Deterministik + Sürüş duyarlı)
    crisis_check = check_mental_crisis(user_msg, is_driving)
    if crisis_check.get("isCrisis"):
        return {
            "reply": crisis_check["reply"],
            "isCrisis": True,
            "drivingModeResponse": is_driving,
            "providerType": "CRISIS_SAFETY_GUARD"
        }

    # 2. Mental Conversation Provider (OpenAI veya LocalFallback)
    provider = get_active_mental_provider()
    history = payload.history or []
    driver_name = vehicle_state.get("driverName", "Ahmet Bey")

    result = provider.generate_reply(
        user_message=user_msg,
        is_driving=is_driving,
        history=history,
        driver_name=driver_name
    )

    return result

@app.get("/api/mental/sessions")
def get_mental_sessions():
    return SessionMemoryManager.get_all_sessions()

@app.post("/api/mental/sessions")
def record_mental_session(payload: CreateSessionPayload):
    return SessionMemoryManager.add_session(
        summary_text=payload.summaryText,
        recurring_themes=payload.recurringThemes,
        duration_seconds=payload.durationSeconds or 180,
        mood_before=payload.moodBefore or "TIRED",
        mood_after=payload.moodAfter or "RELAXED",
        escalation_suggested=payload.escalationSuggested or False,
        suggested_action=payload.suggestedAction
    )

# ---------------------------------------------------------------------------
# Care Agent Endpoints (Playwright Browser + Calendar Collision + Travel)
# ---------------------------------------------------------------------------

calendar_provider = CalendarProvider()

@app.post("/api/care/match")
def match_appointments(payload: AppointmentMatchPayload):
    specialty = payload.specialty
    city = payload.preferredCity or "İstanbul"

    # Browser Agent veya Demo Arama
    if payload.useBrowserAgent:
        provider = BrowserCareSearchProvider()
    else:
        provider = DemoCareSearchProvider()

    search_result = provider.search_slots(specialty=specialty, city=city)
    slots = search_result.get("slots", [])

    # Her slot için gerçek takvim çakışması ve ulaşım süresi hesabı
    processed_slots = []
    for slot in slots:
        date_time_str = slot.get("dateTime", "")
        has_conflict = calendar_provider.has_conflict(date_time_str)

        travel_info = TravelTimeProvider.calculate_travel_time_min(slot.get("locationLabel", ""))

        processed_slots.append({
            **slot,
            "calendarConflict": has_conflict,
            "calendarFits": not has_conflict,
            "travelTimeMin": travel_info["estimatedMinutes"],
            "trafficBadge": travel_info["trafficBadge"],
            "matchScore": 95 if not has_conflict else 70
        })

    return {
        "status": search_result.get("status", "SUCCESS"),
        "specialty": specialty,
        "city": city,
        "providerType": search_result.get("providerType"),
        "sourceBadge": search_result.get("sourceBadge"),
        "handoffNote": search_result.get("handoffNote"),
        "liveSearchUrl": search_result.get("liveSearchUrl"),
        "matchedSlots": processed_slots,
        "currentTravelBufferMin": vehicle_state["estimatedTravelTimeToDestMin"]
    }

# ---------------------------------------------------------------------------
# Privacy & Data Deletion
# ---------------------------------------------------------------------------

@app.post("/api/privacy/wipe")
def wipe_user_health_data():
    SessionMemoryManager.clear_all()
    return {
        "status": "SUCCESS",
        "message": "Tüm yerel sağlık verisi, geçmiş seans kayıtları ve önbellekler başarıyla silindi.",
        "timestamp": datetime.utcnow().isoformat()
    }
