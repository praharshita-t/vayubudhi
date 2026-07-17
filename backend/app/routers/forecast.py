from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import schemas
from app.ml_service import ml_service

router = APIRouter()

@router.post("/forecast", response_model=schemas.ForecastOutput)
def get_forecast(reading: schemas.SensorReading, db: Session = Depends(get_db)):
    """
    Returns the 24h point and interval forecast using the ML model.
    """
    # Call the ML service
    prediction = ml_service.predict_forecast(reading)
    
    # Log to DB (optional, simplified for hackathon)
    db_forecast = models.Forecast(
        horizon_h=prediction["horizon_h"],
        point=prediction["point"],
        interval=prediction["interval"],
        ventilation_index=prediction["ventilation_index"]
    )
    db.add(db_forecast)
    db.commit()
    db.refresh(db_forecast)
    
    return prediction
