from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app import schemas

router = APIRouter()

@router.get("/health", response_model=schemas.HealthStatus, status_code=status.HTTP_200_OK)
def check_health(db: Session = Depends(get_db)):
    """
    Performs server connectivity and database readiness checks.
    """
    database_status = "disconnected"
    try:
        db.execute(text("SELECT 1"))
        database_status = "connected"
    except Exception:
        pass
        
    return {
        "status": "healthy",
        "database": database_status
    }

import sys
import os
from pydantic import BaseModel

# Adjust path to import agent_advisor module
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.append(os.path.join(BASE_DIR, 'agent_advisor', 'src'))
try:
    from coordinator import AgentCoordinator
    coordinator = AgentCoordinator()
except ImportError:
    coordinator = None

class AdvisoryRequest(BaseModel):
    city: str
    language: str
    reading: schemas.SensorReading

class AdvisoryResponse(BaseModel):
    advisory: str
    language: str
    city: str

@router.post("/advisory", response_model=AdvisoryResponse)
def get_health_advisory(req: AdvisoryRequest):
    """
    Generates a localized, multilingual health advisory using LLMs.
    """
    from app.ml_service import ml_service
    
    # Get ML predictions
    forecast = ml_service.predict_forecast(req.reading)
    attribution = ml_service.predict_attribution(req.reading)
    
    # -------------------------------------------------------------------
    # VULNERABILITY MAPPING ENGINE
    # Map forecast AQI against local vulnerable population centers
    # -------------------------------------------------------------------
    vulnerable_centers = [
        {"type": "Hospital", "name": "City General", "distance_km": 1.2, "patients_at_risk": 450},
        {"type": "School", "name": "Primary Academy", "distance_km": 0.8, "students_at_risk": 1200}
    ]
    
    if forecast["point"] > 200:
        vuln_context = f"High alert for {vulnerable_centers[0]['name']} and {vulnerable_centers[1]['name']}."
    else:
        vuln_context = "Vulnerable populations are not at critical risk currently."
    
    if coordinator:
        result = coordinator.execute({
            "forecast": forecast,
            "attribution": attribution,
            "language": req.language,
            "city": req.city,
            "vulnerability": vuln_context
        })
        return result
    else:
        # Generate multi-channel mock response simulating Gemini output
        base_msg = f"Due to high {attribution.get('prediction_set', ['pollution'])[0]} in {req.city}, the AQI will be {forecast.get('point', 0):.0f}. {vuln_context}"
        
        if req.language.lower() == "kannada":
            base_msg = f"[Kannada translation pending Gemini integration] {base_msg}"
        elif req.language.lower() == "tamil":
            base_msg = f"[Tamil translation pending Gemini integration] {base_msg}"
        elif req.language.lower() == "hindi":
            base_msg = f"[Hindi translation pending Gemini integration] {base_msg}"
            
        push_payload = f"*** SMS/IVR Gateway Payload ***\nTarget Demo: Elderly & Students\nChannel: SMS & WhatsApp\nMessage: {base_msg}"
            
        return {
            "advisory": push_payload,
            "language": req.language,
            "city": req.city
        }
