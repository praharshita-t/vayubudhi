from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import schemas
from app.ml_service import ml_service

router = APIRouter()

@router.post("/forecast", response_model=schemas.ForecastOutput)
def get_forecast(reading: schemas.SensorReading, horizon: int = 24, db: Session = Depends(get_db)):
    """
    Returns the point and interval forecast using the ML model.
    """
    # Call the ML service
    prediction = ml_service.predict_forecast(reading)
    
    # Scale for longer horizons (hackathon simulation for 48h/72h)
    if horizon > 24:
        scale_factor = 1.0 + (horizon - 24) * 0.005 # Slight decay or increase
        prediction["point"] *= scale_factor
        prediction["interval"] = [prediction["interval"][0]*0.9, prediction["interval"][1]*1.1]
        prediction["horizon_h"] = horizon

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

from typing import List

@router.post("/forecast/grid", response_model=List[schemas.ForecastOutput])
def get_grid_forecast(readings: List[schemas.SensorReading], horizon: int = 24, db: Session = Depends(get_db)):
    """
    Returns forecasts for multiple grid points simultaneously.
    """
    results = []
    for reading in readings:
        pred = ml_service.predict_forecast(reading)
        if horizon > 24:
            scale_factor = 1.0 + (horizon - 24) * 0.005
            pred["point"] *= scale_factor
            pred["interval"] = [pred["interval"][0]*0.9, pred["interval"][1]*1.1]
            pred["horizon_h"] = horizon
        results.append(pred)
    return results
