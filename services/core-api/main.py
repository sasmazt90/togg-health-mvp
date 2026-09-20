"""
Togg Health MVP - Core API (FastAPI)
Yerel önleyici sağlık ve araç bağlamı orkestrasyon servisi.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

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
        "baselineDiffNote": "Önceki taramanıza kıyasla sağ yanak bölgesinde kızarıklık ve doku görünümünde %24 belirgin değişim gözlendi.",
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

class AppointmentMatchPayload(BaseModel):
    specialty: str
    preferredCity: Optional[str] = "İstanbul"
    maxTravelTimeMin: Optional[int] = 30

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def read_root():
    return {
        "service": "Togg Health MVP Core API",
        "status": "OPERATIONAL",
        "language": "tr-TR",
        "clinicalSafety": "Non-diagnostic trend monitoring"
    }

@app.get("/api/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

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

@app.post("/api/mental/converse")
def converse_mental_assistant(payload: ConversePayload):
    msg = payload.userMessage.strip().lower()
    
    # Crisis Guard
    crisis_terms = ["intihar", "ölmek istiyorum", "kendime zarar", "yaşamak istemiyorum"]
    for term in crisis_terms:
        if term in msg:
            return {
                "reply": "Söyledikleriniz benim için çok önemli ve zor bir andan geçtiğinizi anlıyorum. Ancak ben acil durum servisi değilim. Lütfen şu an 112 Acil Çağrı veya 182 Danışma Hattı ile iletişime geçin. Yalnız değilsiniz.",
                "isCrisis": True,
                "drivingModeResponse": True
            }
            
    # Driving mode constraint check
    is_driving = vehicle_state["vehicleMoving"]
    if is_driving:
        return {
            "reply": "Sizi dinliyorum. Şu an araç hareket halinde olduğu için dikkatinizi yoldan ayırmamanız önemli. Derin bir nefes alabilirsiniz. İsterseniz bu konuyu araç güvenle park edildiğinde daha ayrıntılı konuşabiliriz.",
            "isDriving": True,
            "escalationSuggested": False
        }
    
    return {
        "reply": "Paylaştığınız için teşekkür ederim. Gün içindeki tempo ve dinlenme ihtiyacı birbiriyle çok bağlantılı. Bu durum son birkaç görüşmemizde de öne çıkmıştı. Kendinize bugün biraz dinlenme alanı yaratmak ister misiniz?",
        "isDriving": False,
        "escalationSuggested": True,
        "suggestedAction": "Bir klinik psikologla görüşmeniz faydalı olabilir."
    }

@app.post("/api/care/match")
def match_appointments(payload: AppointmentMatchPayload):
    """
    Kullanıcı takvimi ve araç tahmini ulaşım süresine göre filtrelenmiş demo randevu listesi.
    """
    specialty = payload.specialty
    travel_time = vehicle_state["estimatedTravelTimeToDestMin"]
    
    options = [
        {
            "id": "slot-001",
            "specialty": specialty,
            "providerName": "Doç. Dr. Selin Kaya",
            "title": f"{specialty} Uzmanı",
            "clinicName": "Acıbadem Altunizade Hastanesi",
            "locationLabel": "Altunizade (Araçla 14 dk)",
            "dateTime": "Yarın 18:20",
            "travelTimeMin": 14,
            "calendarFits": True,
            "matchScore": 96,
            "bookingStatus": "AVAILABLE"
        },
        {
            "id": "slot-002",
            "specialty": specialty,
            "providerName": "Prof. Dr. Emre Demir",
            "title": f"{specialty} ve Danışman Hekim",
            "clinicName": "Dünyagöz Etiler",
            "locationLabel": "Etiler (Araçla 22 dk)",
            "dateTime": "Çarşamba 17:45",
            "travelTimeMin": 22,
            "calendarFits": True,
            "matchScore": 91,
            "bookingStatus": "AVAILABLE"
        },
        {
            "id": "slot-003",
            "specialty": specialty,
            "providerName": "Uzm. Psk. Zeynep Arslan",
            "title": f"{specialty} Danışmanı",
            "clinicName": "Online Görüşme",
            "locationLabel": "Online / Araç İçi Ekran",
            "dateTime": "Çarşamba 20:00",
            "travelTimeMin": 0,
            "calendarFits": True,
            "matchScore": 95,
            "bookingStatus": "AVAILABLE"
        }
    ]
    return {"specialty": specialty, "matchedSlots": options, "currentTravelBufferMin": travel_time}
