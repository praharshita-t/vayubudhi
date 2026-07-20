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
    
    if coordinator:
        result = coordinator.execute({
            "forecast": forecast,
            "attribution": attribution,
            "language": req.language,
            "city": req.city
        })
        return result
    else:
        return {
            "advisory": f"[Fallback] Due to high {attribution.get('prediction_set', ['pollution'])[0]} in {req.city}, the AQI is {forecast.get('point', 0):.0f}. Please limit outdoor activities.",
            "language": req.language,
            "city": req.city
        }
