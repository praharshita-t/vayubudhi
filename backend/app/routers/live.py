import requests
import random
import os
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from app import schemas
from app.ml_service import ml_service

# Load the historical dataset for realistic peak pollution injection
# __file__ is backend/app/routers/live.py
# So we need to go up 3 levels to reach backend, then 1 more to reach root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DATASET_PATH = os.path.join(BASE_DIR, 'ml_model', 'data', 'dataset.csv')

historical_df = None
try:
    if os.path.exists(DATASET_PATH):
        historical_df = pd.read_csv(DATASET_PATH)
except Exception as e:
    print(f"Failed to load dataset: {e}")

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


class StationData(BaseModel):
    id: str
    name: str
    lat: float
    lon: float
    pm25: float
    pm10: float
    no2: float
    so2: float
    co: float
    o3: float
    temp: float = 30.0
    humidity: float = 50.0
    pressure: float = 1010.0
    wind_speed: float = 2.0
    pblh: float = 800.0
    aqi: float
    source: str
    status: str

class CityDataResponse(BaseModel):
    city: str
    stations: List[StationData]
    center_aqi: float

CITY_BOUNDS = {
    "Delhi": {"lat_start": 28.5, "lat_end": 28.75, "lon_start": 76.95, "lon_end": 77.3, "step": 0.08},
    "Mumbai": {"lat_start": 18.9, "lat_end": 19.15, "lon_start": 72.8, "lon_end": 72.95, "step": 0.08},
    "Bengaluru": {"lat_start": 12.85, "lat_end": 13.1, "lon_start": 77.5, "lon_end": 77.7, "step": 0.08},
    "Hyderabad": {"lat_start": 17.3, "lat_end": 17.55, "lon_start": 78.3, "lon_end": 78.6, "step": 0.08},
    "Guwahati": {"lat_start": 26.05, "lat_end": 26.3, "lon_start": 91.6, "lon_end": 91.85, "step": 0.08}
}

@router.get("/city-data", response_model=CityDataResponse)
def get_city_data(city: str):
    if city not in CITY_BOUNDS:
        return CityDataResponse(city=city, stations=[], center_aqi=0)
        
    bounds = CITY_BOUNDS[city]
    
    # Generate grid
    lats = []
    lons = []
    
    curr_lat = bounds["lat_start"]
    while curr_lat <= bounds["lat_end"]:
        curr_lon = bounds["lon_start"]
        while curr_lon <= bounds["lon_end"]:
            lats.append(round(curr_lat, 4))
            lons.append(round(curr_lon, 4))
            curr_lon += bounds["step"]
        curr_lat += bounds["step"]
        
    # Cap to max points to avoid URL too long
    lats = lats[:25]
    lons = lons[:25]
    
    lat_str = ",".join(map(str, lats))
    lon_str = ",".join(map(str, lons))
    
    aq_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat_str}&longitude={lon_str}&current=pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,ozone"
    weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat_str}&longitude={lon_str}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m"
    
    stations = []
    center_aqi = 0
    try:
        aq_res = requests.get(aq_url, timeout=10)
        aq_data = aq_res.json()
        
        weather_res = requests.get(weather_url, timeout=10)
        weather_data = weather_res.json()
        
        if not isinstance(aq_data, list):
            aq_data = [aq_data]
        if not isinstance(weather_data, list):
            weather_data = [weather_data]
            
        total_aqi = 0
        for i, data in enumerate(aq_data):
            current = data.get("current", {})
            pm25 = current.get("pm2_5") or 35.0
            pm10 = current.get("pm10") or (pm25 * 1.5)
            no2 = current.get("nitrogen_dioxide") or 20.0
            so2 = current.get("sulphur_dioxide") or 10.0
            co = current.get("carbon_monoxide") or 1.0
            o3 = current.get("ozone") or 30.0
            
            w_data = weather_data[i] if i < len(weather_data) else {}
            w_curr = w_data.get("current", {})
            temp = w_curr.get("temperature_2m", 28.0)
            humidity = w_curr.get("relative_humidity_2m", 60.0)
            pressure = w_curr.get("surface_pressure", 1008.0)
            wind_speed = w_curr.get("wind_speed_10m", 2.0)
            
            # Use the ML model to predict AQI natively for this district
            reading = schemas.SensorReading(
                station_id=f"OM_{city[:3]}_{i}",
                timestamp="now",
                pm25=pm25,
                pm10=pm10,
                temp=temp,
                humidity=humidity,
                pressure=pressure,
                wind_speed=wind_speed,
                pblh=800.0
            )
            
            forecast = ml_service.predict_forecast(reading)
            ml_aqi = forecast.get("point", pm25_to_aqi(pm25))
            total_aqi += ml_aqi
            
            stations.append(StationData(
                id=f"OM_{city[:3]}_{i}",
                name=f"{city} District {i+1}",
                lat=lats[i],
                lon=lons[i],
                pm25=pm25,
                pm10=pm10,
                no2=no2,
                so2=so2,
                co=co,
                o3=o3,
                temp=temp,
                humidity=humidity,
                pressure=pressure,
                wind_speed=wind_speed,
                pblh=800.0,
                aqi=round(ml_aqi),
                source="iot" if i % 5 == 0 else "caaqms",
                status="alert" if ml_aqi > 200 else "online"
            ))
            
        if len(stations) > 0:
            center_aqi = total_aqi / len(stations)
            
    except Exception as e:
        print(f"Failed to fetch bulk city data: {e}")
        
    return CityDataResponse(
        city=city,
        stations=stations,
        center_aqi=center_aqi
    )
