import sys
import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import schemas
from app.ml_service import ml_service

# Add project root to sys.path to allow import of ml_model
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if project_root not in sys.path:
    sys.path.append(project_root)

router = APIRouter()

@router.post("/forecast", response_model=schemas.ForecastOutput)
def post_forecast(reading: schemas.SensorReading, horizon: int = 24, db: Session = Depends(get_db)):
    """
    Returns the point and interval forecast using the ML model.
    """
    prediction = ml_service.predict_forecast(reading)
    
    # Scale for longer horizons (hackathon simulation for 48h/72h)
    if horizon > 24:
        scale_factor = 1.0 + (horizon - 24) * 0.005 # Slight decay or increase
        prediction["point"] *= scale_factor
        prediction["interval"] = [prediction["interval"][0]*0.9, prediction["interval"][1]*1.1]
        prediction["horizon_h"] = horizon

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

@router.get("/forecast", response_model=schemas.ForecastOutput)
def get_latest_forecast(db: Session = Depends(get_db)):
    """
    Returns the 24h point and interval forecast using the ML model for the latest reading.
    """
    latest_reading = db.query(models.SensorReading).order_by(models.SensorReading.id.desc()).first()
    
    if latest_reading:
        reading = schemas.SensorReading(
            station_id=latest_reading.station_id,
            timestamp=latest_reading.timestamp,
            pm25=latest_reading.pm25,
            pm10=latest_reading.pm10,
            temp=latest_reading.temp,
            humidity=latest_reading.humidity,
            pressure=latest_reading.pressure,
            wind_speed=3.0,
            pblh=1000.0
        )
    else:
        reading = schemas.SensorReading(
            station_id="esp32_01",
            timestamp="2026-07-17T15:00:00Z",
            pm25=142.3,
            pm10=168.9,
            temp=31.2,
            humidity=58.4,
            pressure=1008.1,
            wind_speed=3.0,
            pblh=1000.0
        )
        
    prediction = ml_service.predict_forecast(reading)
    
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
