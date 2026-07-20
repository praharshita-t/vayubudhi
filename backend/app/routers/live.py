import requests
import random
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from app import schemas
from app.ml_service import ml_service

router = APIRouter()

class LiveDataResponse(BaseModel):
    lat: float
    lon: float
    reading: schemas.SensorReading
    attribution: schemas.AttributionOutput
    forecast: schemas.ForecastOutput
    hex_grid: List[Dict[str, Any]]

def pm25_to_aqi(pm25: float) -> float:
    """
    Standard Indian AQI conversion formula for PM2.5 (24h avg proxy)
    """
    if pm25 <= 30:
        return pm25 * 50 / 30
    elif pm25 <= 60:
        return 50 + (pm25 - 30) * 50 / 30
    elif pm25 <= 90:
        return 100 + (pm25 - 60) * 100 / 30
    elif pm25 <= 120:
        return 200 + (pm25 - 90) * 100 / 30
    elif pm25 <= 250:
        return 300 + (pm25 - 120) * 100 / 130
    else:
        return 400 + (pm25 - 250) * 100 / 100

@router.get("/live", response_model=LiveDataResponse)
def get_live_data(lat: float, lon: float):
    # 1. Fetch live weather data from Open-Meteo Weather API (free, keyless)
    weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m"
    # 2. Fetch live air quality data from Open-Meteo Air Quality API (free, keyless)
    aq_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=pm2_5,pm10"
    
    try:
        weather_res = requests.get(weather_url, timeout=5)
        aq_res = requests.get(aq_url, timeout=5)
        
        weather_data = weather_res.json()
        aq_data = aq_res.json()
        
        # Parse weather values
        current_weather = weather_data.get("current", {})
        temp = current_weather.get("temperature_2m", 28.0)
        humidity = current_weather.get("relative_humidity_2m", 60.0)
        pressure = current_weather.get("surface_pressure", 1008.0)
        wind_speed = current_weather.get("wind_speed_10m", 2.0)
        
        # Parse air quality values
        current_aq = aq_data.get("current", {})
        pm25 = current_aq.get("pm2_5", 35.0)
        pm10 = current_aq.get("pm10", 45.0)
        
    except Exception as e:
        print(f"Failed to query Open-Meteo APIs: {e}")
        # Graceful fallback values
        temp, humidity, pressure, wind_speed = 28.0, 60.0, 1008.0, 2.0
        pm25, pm10 = 35.0, 45.0
        
    # Standard fallback mock for PBLH (Planetary Boundary Layer Height)
    pblh = 800.0
    
    # 3. Create sensor reading schema object
    reading = schemas.SensorReading(
        station_id="user_gps",
        timestamp="now",
        pm25=pm25,
        pm10=pm10,
        temp=temp,
        humidity=humidity,
        pressure=pressure,
        wind_speed=wind_speed,
        pblh=pblh
    )
    
    # 4. Execute ML predictions
    forecast_data = ml_service.predict_forecast(reading)
    attribution_data = ml_service.predict_attribution(reading)
    
    # Map raw dicts to schemas
    forecast = schemas.ForecastOutput(
        horizon_h=forecast_data.get("horizon_h", 24),
        point=forecast_data.get("point", pm25_to_aqi(pm25)),
        interval=forecast_data.get("interval", [pm25_to_aqi(pm25)*0.8, pm25_to_aqi(pm25)*1.2]),
        ventilation_index=forecast_data.get("ventilation_index", pblh * wind_speed)
    )
    
    attribution = schemas.AttributionOutput(
        prediction_set=attribution_data.get("prediction_set", ["unknown"]),
        set_size=attribution_data.get("set_size", 1),
        confidence=attribution_data.get("confidence", 0.9),
        probabilities=attribution_data.get("probabilities", {"unknown": 1.0})
    )
    
    # 5. Generate dynamic hex grid centered around the user's location (radius ~0.08 deg)
    center_aqi = forecast.point
    hex_grid = []
    step = 0.015
    for i in range(-4, 5):
        for j in range(-4, 5):
            # Hexagonal offset
            offset_lon = step * (i + (0.5 if j % 2 else 0))
            offset_lat = step * j * 0.866
            
            # Simple circular boundary check
            dist_sq = (offset_lon/0.08)**2 + (offset_lat/0.08)**2
            if dist_sq <= 1.0:
                cell_lat = lat + offset_lat
                cell_lon = lon + offset_lon
                
                # Interpolate AQI with spatial noise
                cell_aqi = max(10, center_aqi * (1.0 - dist_sq * 0.4) + random.uniform(-15, 15))
                
                hex_grid.append({
                    "lat": round(cell_lat, 4),
                    "lon": round(cell_lon, 4),
                    "aqi": round(cell_aqi),
                    "pm25": round(cell_aqi * 0.4)
                })
                
    return LiveDataResponse(
        lat=lat,
        lon=lon,
        reading=reading,
        attribution=attribution,
        forecast=forecast,
        hex_grid=hex_grid
    )
