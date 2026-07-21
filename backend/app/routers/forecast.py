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
    
    # Scale for longer horizons (hackathon simulation for 48h/72h) - We don't need this simulation anymore!
    # The XGBoost models natively forecast 24h, 48h, 72h.

    db_forecast = models.Forecast(
        horizon_h=prediction["horizon_h"],
        points=prediction["points"],
        intervals=prediction["intervals"],
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
        prediction = ml_service.predict_forecast(reading)
        
        db_forecast = models.Forecast(
            horizon_h=prediction["horizon_h"],
            points=prediction["points"],
            intervals=prediction["intervals"],
            ventilation_index=prediction["ventilation_index"]
        )
        db.add(db_forecast)
        db.commit()
        db.refresh(db_forecast)
        
        return prediction
    
    return {"horizon_h": 72, "points": [0.0, 0.0, 0.0], "intervals": [[0.0, 0.0], [0.0, 0.0], [0.0, 0.0]], "ventilation_index": 0.0}

from typing import List

@router.post("/forecast/grid", response_model=List[schemas.ForecastOutput])
def get_grid_forecast(readings: List[schemas.SensorReading], horizon: int = 24, db: Session = Depends(get_db)):
    """
    Returns forecasts for multiple grid points simultaneously.
    """
    results = []
    for reading in readings:
        pred = ml_service.predict_forecast(reading)
        results.append(pred)
    return results

import math

@router.post("/forecast/dispersion", response_model=schemas.DispersionOutput)
def get_dispersion_model(reading: schemas.SensorReading, lat: float = 28.6139, lon: float = 77.2090, wind_deg: float = 45.0, db: Session = Depends(get_db)):
    """
    Hyperlocal Predictive AQI Forecasting Agent (Dispersion Model)
    Implements a simplified Gaussian plume dispersion model to map point forecasts across a 1km grid.
    """
    prediction = ml_service.predict_forecast(reading)
    base_aqi = prediction["points"][0]
    wind_speed = max(reading.wind_speed, 1.0)
    
    # 5x5 grid roughly 1kmx1km centered on the provided lat/lon
    # 1 degree lat is ~111km, so 1km is ~0.009 degrees. Step = 0.002
    grid = []
    step = 0.002
    
    wind_rad = math.radians(wind_deg)
    
    for i in range(-2, 3):
        for j in range(-2, 3):
            # Calculate distance and angle from center
            dy = i * step
            dx = j * step
            
            # Simple mock dispersion: higher AQI downwind, decays with distance
            dist = math.sqrt(dx**2 + dy**2)
            angle = math.atan2(dy, dx)
            
            # Angle difference from wind direction
            angle_diff = abs(angle - wind_rad)
            
            # Decay factor based on distance and wind direction
            # If downwind (angle_diff is small), decay is slower. If upwind, decay is faster.
            downwind_factor = math.cos(angle_diff)
            
            if dist == 0:
                aqi = base_aqi
            else:
                # Plume model mock: concentration = Q / (u * dist) * exp(-y^2 / ...)
                # Here we just use a heuristic decay
                decay = math.exp(-dist * 500 / wind_speed) 
                directional_boost = 1.0 + 0.5 * downwind_factor
                aqi = base_aqi * decay * directional_boost
                
            grid.append(schemas.DispersionPoint(
                lat=lat + dy,
                lon=lon + dx,
                aqi=max(0, min(500, aqi)) # Clamp to 0-500
            ))
            
    return schemas.DispersionOutput(
        center_lat=lat,
        center_lon=lon,
        grid=grid
    )
