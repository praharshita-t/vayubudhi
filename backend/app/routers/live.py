import requests
import random
import os
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from app import schemas
from app.ml_service import ml_service

# URL for the live Google Sheet containing the dataset
SHEET_URL = "https://docs.google.com/spreadsheets/d/1myYlsoOTpXPPN9mKfZkEDrX_H5mlAiIPbM0HxA6L0OY/export?format=csv"

historical_df = None
try:
    print("Fetching live dataset from Google Sheets...")
    historical_df = pd.read_csv(SHEET_URL)
    print(f"Successfully loaded {len(historical_df)} rows from live dataset.")
except Exception as e:
    print(f"Failed to fetch live dataset from Google Sheets: {e}")
    # Fallback to local if network fails
    try:
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        DATASET_PATH = os.path.join(BASE_DIR, 'ml_model', 'data', 'dataset.csv')
        if os.path.exists(DATASET_PATH):
            historical_df = pd.read_csv(DATASET_PATH)
    except Exception as e2:
        print(f"Failed local fallback: {e2}")

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
    stations = []
    center_aqi = 0
    total_aqi = 0
    
    # Generate a spatial grid based on the city bounds
    lats, lons = [], []
    curr_lat = bounds["lat_start"]
    while curr_lat <= bounds["lat_end"]:
        curr_lon = bounds["lon_start"]
        while curr_lon <= bounds["lon_end"]:
            lats.append(round(curr_lat, 4))
            lons.append(round(curr_lon, 4))
            curr_lon += bounds["step"]
        curr_lat += bounds["step"]
    
    # If dataset is loaded, use it to populate stations!
    if historical_df is not None:
        # Handle aliases used in the dataset
        if city == "Delhi": dataset_city = "New Delhi"
        elif city == "Bengaluru": dataset_city = "Bangalore"
        else: dataset_city = city
            
        city_df = historical_df[historical_df['city'] == dataset_city]
        
        if not city_df.empty:
            for i, row in city_df.iterrows():
                try:
                    # Distribute the identical CSV coordinates across our spatial grid
                    grid_idx = i % len(lats)
                    lat = lats[grid_idx]
                    lon = lons[grid_idx]
                    
                    pm25 = float(row.get('pm25', 35.0))
                    if pd.isna(pm25): pm25 = 35.0
                    pm10 = float(row.get('pm10', pm25 * 1.5))
                    if pd.isna(pm10): pm10 = pm25 * 1.5
                    no2 = float(row.get('no2', 20.0))
                    if pd.isna(no2): no2 = 20.0
                    so2 = float(row.get('so2', 10.0))
                    if pd.isna(so2): so2 = 10.0
                    co = float(row.get('co', 1.0))
                    if pd.isna(co): co = 1.0
                    o3 = float(row.get('o3', 30.0))
                    if pd.isna(o3): o3 = 30.0
                    
                    temp = float(row.get('temp_c', 28.0))
                    if pd.isna(temp): temp = 28.0
                    humidity = float(row.get('humidity', 60.0))
                    if pd.isna(humidity): humidity = 60.0
                    pressure = float(row.get('pressure_mb', 1008.0))
                    if pd.isna(pressure): pressure = 1008.0
                    wind_speed = float(row.get('wind_kph', 7.2)) / 3.6  # convert kph to m/s
                    if pd.isna(wind_speed): wind_speed = 2.0
                    
                    pblh = float(row.get('pblh', 800.0))
                    if pd.isna(pblh): pblh = 800.0
                    
                    ml_aqi = pm25_to_aqi(pm25)
                    total_aqi += ml_aqi
                    
                    stations.append(StationData(
                        id=f"ST_{row.get('uid', i)}",
                        name=str(row.get('station', f"{city} Station {i}")),
                        lat=lat,
                        lon=lon,
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
                        pblh=pblh,
                        aqi=round(ml_aqi),
                        source="iot" if i % 5 == 0 else "caaqms",
                        status="alert" if ml_aqi > 200 else "online"
                    ))
                except Exception as e:
                    print(f"Skipping row {i} due to parsing error: {e}")
                    
    # If historical_df failed or city not in dataset, use basic fallback grid
    if len(stations) == 0:
        for i in range(min(len(lats), 25)):
            ml_aqi = 50.0 + random.uniform(-10, 10)
            total_aqi += ml_aqi
            stations.append(StationData(
                id=f"OM_{city[:3]}_{i}",
                name=f"{city} District {i+1}",
                lat=lats[i],
                lon=lons[i],
                pm25=35.0,
                pm10=45.0,
                no2=20.0,
                so2=10.0,
                co=1.0,
                o3=30.0,
                temp=28.0,
                humidity=60.0,
                pressure=1008.0,
                wind_speed=2.0,
                pblh=800.0,
                aqi=round(ml_aqi),
                source="caaqms",
                status="online"
            ))
            
    if len(stations) > 0:
        center_aqi = total_aqi / len(stations)
        
    return CityDataResponse(
        city=city,
        stations=stations,
        center_aqi=center_aqi
    )
