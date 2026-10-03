"""
Togg Health MVP - Core API (FastAPI)
Yerel önleyici sağlık ve araç bağlamı orkestrasyon servisi.
Lisans: UNLICENSED
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field, StrictBool
from typing import List, Optional, Dict, Any
from datetime import datetime
from contextlib import asynccontextmanager
import os
from time import perf_counter
from openai_client import get_openai_client, close_openai_client
from pathlib import Path

# Backend-only local configuration. CI has no local file and remains keyless.
_local_env = Path(__file__).resolve().parents[2] / '.env.local'
if os.getenv('ATTUNE_LOAD_LOCAL_ENV') == '1' and _local_env.is_file():
    for _line in _local_env.read_text(encoding='utf-8').splitlines():
        _name, _separator, _value = _line.partition('=')
        if _separator and _name.strip() in ('OPENAI_API_KEY', 'OPENAI_MODEL', 'OPENAI_TTS_MODEL'):
            os.environ[_name.strip()] = _value.strip().strip('\"').strip("'")

from mental_provider import (get_active_mental_provider, check_mental_crisis, get_active_session_analyzer,
                             LocalFallbackMentalProvider, LocalFallbackSessionAnalyzer, provider_error_category)
from session_memory import SessionMemoryManager
from care_provider import BrowserCareSearchProvider, DemoCareSearchProvider, CalendarProvider, TravelTimeProvider

@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        yield
    finally:
        close_openai_client()

app = FastAPI(
    title="Togg Health MVP Core API",
    description="Togg araç içi önleyici sağlık, görme, cilt, sesli asistan ve randevu orkestrasyonu.",
    version="1.0.0",
    lifespan=lifespan
)


@app.exception_handler(RequestValidationError)
async def request_validation_error(_request, error: RequestValidationError):
    # Do not echo private request values. Non-finite input also cannot be JSON-serialized.
    return JSONResponse(status_code=422, content={"detail": [
        {key: item[key] for key in ("loc", "type", "msg")} for item in error.errors()
    ]})

trusted_origins = [origin.strip() for origin in os.getenv(
    "ATTUNE_TRUSTED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
).split(",") if origin.strip()]
if not trusted_origins or "*" in trusted_origins:
    raise ValueError("ATTUNE_TRUSTED_ORIGINS must list explicit trusted origins")

app.add_middleware(
    CORSMiddleware,
    allow_origins=trusted_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
    expose_headers=["Server-Timing"],
)


@app.middleware("http")
async def enforce_browser_origin(request: Request, call_next):
    origin = request.headers.get("origin")
    # CORS handles preflight. Reject actual untrusted browser requests before
    # they can mutate local health data, including simple POSTs without preflight.
    if request.method != "OPTIONS" and origin is not None and origin not in trusted_origins:
        return JSONResponse(status_code=403, content={"detail": "Untrusted browser origin"})
    started = perf_counter()
    response = await call_next(request)
    if request.url.path.startswith("/api/mental/"):
        existing = response.headers.get("Server-Timing")
        timing = f"app;dur={(perf_counter() - started) * 1000:.1f}"
        response.headers["Server-Timing"] = f"{existing}, {timing}" if existing else timing
    return response


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
    "driverId": "demo-driver-001",
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
        "baselineDiffNote": "Önceki ölçümünüze göre sağ yanak bölgesinde belirgin bir görsel değişim gözlendi. Bir dermatologla görüşmek faydalı olabilir.",
        "referralSuggested": True
    },
    "mentalSummary": {
        "lastSessionDate": "2026-09-19T19:10:00Z",
        "recurringThemes": ["uyku düzensizliği", "fiziksel yorgunluk"],
        "summaryText": "Son görüşmelerinizde uyku ve yorgunluk temalarının tekrar ettiği gözlemlendi.",
        "referralSuggested": True
    }
}

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class SpeedUpdatePayload(BaseModel):
    speedKmH: float = Field(ge=0, allow_inf_nan=False)

class ConversePayload(BaseModel):
    userMessage: str = Field(min_length=1, max_length=6000)
    sessionId: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = None
    cloudConsent: StrictBool = False

class AnalyzeSessionPayload(BaseModel):
    messages: List[Dict[str, str]]
    cloudConsent: StrictBool = False

class SpeechPayload(BaseModel):
    text: str = Field(min_length=1, max_length=4096)
    cloudConsent: StrictBool = False

class CreateSessionPayload(BaseModel):
    summaryText: str
    recurringThemes: List[str]
    durationSeconds: Optional[int] = 180
    moodBefore: Optional[str] = "TIRED"
    moodAfter: Optional[str] = "RELAXED"
    escalationSuggested: Optional[bool] = False
    suggestedAction: Optional[str] = None
    saveMentalSummaries: StrictBool = False

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
        "version": "0.3.0-faz3"
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
def toggle_driving_mode():
    if vehicle_state["vehicleMoving"]:
        vehicle_state["vehicleMoving"] = False
        vehicle_state["vehicleParked"] = True
        vehicle_state["currentSpeed"] = 0
        vehicle_state["gear"] = "P"
        vehicle_state["state"] = "PARKED"
    else:
        vehicle_state["vehicleMoving"] = True
        vehicle_state["vehicleParked"] = False
        vehicle_state["currentSpeed"] = 50
        vehicle_state["gear"] = "D"
        vehicle_state["state"] = "DRIVING"
    vehicle_state["lastUpdated"] = datetime.utcnow().isoformat()
    return vehicle_state

@app.post("/api/vehicle/speed")
def update_vehicle_speed(payload: SpeedUpdatePayload):
    speed = payload.speedKmH
    vehicle_state["currentSpeed"] = speed
    if speed > 0:
        vehicle_state["vehicleMoving"] = True
        vehicle_state["vehicleParked"] = False
        vehicle_state["gear"] = "D"
        vehicle_state["state"] = "DRIVING"
    else:
        vehicle_state["vehicleMoving"] = False
        vehicle_state["vehicleParked"] = True
        vehicle_state["gear"] = "P"
        vehicle_state["state"] = "PARKED"
    vehicle_state["lastUpdated"] = datetime.utcnow().isoformat()
    return vehicle_state

# ---------------------------------------------------------------------------
# Health Profile Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/profile")
def get_user_profile():
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

    # 1. Kriz Güvenlik Filtresi (İki katmanlı: Deterministik + Sürüş duyarlı)
    crisis_check = check_mental_crisis(user_msg, is_driving)
    if crisis_check.get("isCrisis"):
        return {
            "reply": crisis_check["reply"],
            "isCrisis": True,
            "riskLevel": crisis_check.get("riskLevel", "IMMINENT"),
            "emergencyContact": crisis_check.get("emergencyContact", "112 Acil Çağrı Merkezi"),
            "drivingModeResponse": is_driving,
            "providerType": "CRISIS_SAFETY_GUARD",
            "clinicalDisclaimer": crisis_check.get("clinicalDisclaimer")
        }

    # 2. Mental Conversation Provider (OpenAI veya LocalFallback)
    if payload.cloudConsent and not os.getenv('OPENAI_API_KEY', '').strip():
        raise HTTPException(status_code=503, detail='PROVIDER_NOT_CONFIGURED')
    provider = get_active_mental_provider() if payload.cloudConsent else LocalFallbackMentalProvider()
    history = payload.history or []
    driver_name = vehicle_state.get("driverName", "Ahmet Bey")

    result = provider.generate_reply(
        user_message=user_msg,
        is_driving=is_driving,
        history=history,
        driver_name=driver_name
    )

    return result

@app.post("/api/mental/analyze-session")
def analyze_mental_session(payload: AnalyzeSessionPayload):
    if not any(m.get('role') == 'user' and m.get('content', '').strip() for m in payload.messages):
        raise HTTPException(status_code=422, detail='EMPTY_SESSION')
    if payload.cloudConsent and not os.getenv('OPENAI_API_KEY', '').strip():
        raise HTTPException(status_code=503, detail='PROVIDER_NOT_CONFIGURED')
    analyzer = get_active_session_analyzer() if payload.cloudConsent else LocalFallbackSessionAnalyzer()
    return analyzer.analyze_session(payload.messages)

@app.post('/api/mental/speech')
def mental_speech(payload: SpeechPayload):
    if not payload.cloudConsent:
        raise HTTPException(status_code=403, detail='CLOUD_CONSENT_REQUIRED')
    if vehicle_state['vehicleMoving']:
        raise HTTPException(status_code=409, detail='PARK_REQUIRED')
    api_key = os.getenv('OPENAI_API_KEY', '').strip()
    if not api_key:
        raise HTTPException(status_code=503, detail='PROVIDER_NOT_CONFIGURED')
    try:
        started = perf_counter()
        client = get_openai_client(api_key)
        connected = perf_counter()
        with client.audio.speech.with_streaming_response.create(
            model=os.getenv('OPENAI_TTS_MODEL', 'gpt-4o-mini-tts'), voice='coral',
            input=payload.text, response_format='mp3',
            instructions='Türkçe konuş. Sakin, sıcak ve doğal bir sohbet tonu kullan. Abartılı vurgu yapma.'
        ) as speech:
            headers_ready = perf_counter()
            audio = speech.read()
        finished = perf_counter()
        # Provider generation overlaps transfer; these are measured boundaries, not a claim
        # that generation and network time can be separated without provider telemetry.
        timing = f'sdk;dur={(connected-started)*1000:.1f}, tts_headers;dur={(headers_ready-connected)*1000:.1f}, tts_body;dur={(finished-headers_ready)*1000:.1f}'
        return Response(content=audio, media_type='audio/mpeg', headers={'Cache-Control': 'no-store', 'Server-Timing': timing})
    except Exception as error:
        raise HTTPException(status_code=503, detail=provider_error_category(error)) from None

@app.get("/api/mental/sessions")
def get_mental_sessions():
    return SessionMemoryManager.get_all_sessions()

class DeleteSessionPayload(BaseModel):
    deletionToken: str = Field(min_length=64, max_length=64)

@app.delete('/api/mental/sessions/{session_id}')
def delete_mental_session(session_id: str, payload: DeleteSessionPayload):
    if vehicle_state['vehicleMoving']:
        raise HTTPException(status_code=409, detail='PARK_REQUIRED')
    try:
        deleted = SessionMemoryManager.delete_session(session_id, payload.deletionToken)
    except (OSError, ValueError, RuntimeError):
        raise HTTPException(status_code=503, detail='DELETION_UNVERIFIED') from None
    if not deleted:
        raise HTTPException(status_code=404, detail='OWNED_RECORD_NOT_FOUND')
    return {'deleted': True}

@app.post("/api/mental/sessions")
def record_mental_session(payload: CreateSessionPayload):
    return SessionMemoryManager.add_session(
        summary_text=payload.summaryText,
        recurring_themes=payload.recurringThemes,
        duration_seconds=payload.durationSeconds or 180,
        mood_before=payload.moodBefore or "TIRED",
        mood_after=payload.moodAfter or "RELAXED",
        escalation_suggested=payload.escalationSuggested or False,
        suggested_action=payload.suggestedAction,
        save_mental_summaries=payload.saveMentalSummaries
    )

# ---------------------------------------------------------------------------
# Care Agent Endpoints (Playwright Browser + Calendar Collision + Travel)
# ---------------------------------------------------------------------------

calendar_provider = CalendarProvider()

@app.post("/api/care/match")
def match_appointments(payload: AppointmentMatchPayload):
    specialty = payload.specialty
    city = payload.preferredCity or "İstanbul"

    if payload.useBrowserAgent:
        provider = BrowserCareSearchProvider()
    else:
        provider = DemoCareSearchProvider()

    search_result = provider.search_slots(specialty=specialty, city=city)
    slots = search_result.get("slots", [])

    processed_slots = []
    for slot in slots:
        date_time_str = slot.get("dateTime", "")
        has_conflict = False
        if date_time_str:
            has_conflict = calendar_provider.has_conflict(date_time_str)

        travel_info = TravelTimeProvider.calculate_travel_time_min(slot.get("locationLabel", ""))

        processed_slots.append({
            **slot,
            "calendarConflict": has_conflict,
            "calendarFits": not has_conflict if date_time_str else True,
            "calendarBadge": "Demo Takvim (Yerel Simülasyon)",
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
