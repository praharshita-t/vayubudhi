import requests
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
    live_aqi: float

# --- Indian National AQI (NAQI) Calculation ---
def get_sub_index(cp, breakpoints):
    for bplo, bphi, ilo, ihi in breakpoints:
        if bplo <= cp <= bphi:
            return round(((ihi - ilo) / (bphi - bplo)) * (cp - bplo) + ilo)
    # If exceeding max breakpoint, extrapolate from the highest bucket
    bplo, bphi, ilo, ihi = breakpoints[-1]
    return round(((ihi - ilo) / (bphi - bplo)) * (cp - bplo) + ilo)

def calculate_full_naqi(pm25: float, pm10: float, no2: float, so2: float, co: float, o3: float) -> float:
    pm25_bp = [(0, 30, 0, 50), (31, 60, 51, 100), (61, 90, 101, 200), (91, 120, 201, 300), (121, 250, 301, 400), (251, 500, 401, 500)]
    pm10_bp = [(0, 50, 0, 50), (51, 100, 51, 100), (101, 250, 101, 200), (251, 350, 201, 300), (351, 430, 301, 400), (431, 1000, 401, 500)]
    no2_bp = [(0, 40, 0, 50), (41, 80, 51, 100), (81, 180, 101, 200), (181, 280, 201, 300), (281, 400, 301, 400), (401, 1000, 401, 500)]
    so2_bp = [(0, 40, 0, 50), (41, 80, 51, 100), (81, 380, 101, 200), (381, 800, 201, 300), (801, 1600, 301, 400), (1601, 3000, 401, 500)]
    co_bp = [(0, 1.0, 0, 50), (1.1, 2.0, 51, 100), (2.1, 10.0, 101, 200), (10.1, 17.0, 201, 300), (17.1, 34.0, 301, 400), (34.1, 100.0, 401, 500)]
    o3_bp = [(0, 50, 0, 50), (51, 100, 51, 100), (101, 168, 101, 200), (169, 208, 201, 300), (209, 748, 301, 400), (749, 1000, 401, 500)]

    indices = [
        get_sub_index(pm25, pm25_bp),
        get_sub_index(pm10, pm10_bp),
        get_sub_index(no2, no2_bp),
        get_sub_index(so2, so2_bp),
        get_sub_index(co, co_bp),
        get_sub_index(o3, o3_bp)
    ]
    return float(max(indices))

@router.get("/live", response_model=LiveDataResponse)
def get_live_data(lat: float, lon: float):
    # 1. Fetch live weather data from Open-Meteo Weather API (free, keyless)
    weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,boundary_layer_height"
    # 2. Fetch live air quality data from Open-Meteo Air Quality API (free, keyless)
    aq_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,ozone,us_aqi"
    
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
        pblh = current_weather.get("boundary_layer_height", 800.0)
        
        # Parse air quality values
        current_aq = aq_data.get("current", {})
        pm25 = current_aq.get("pm2_5", 35.0)
        pm10 = current_aq.get("pm10", 45.0)
        no2 = current_aq.get("nitrogen_dioxide", 20.0)
        so2 = current_aq.get("sulphur_dioxide", 10.0)
        co = current_aq.get("carbon_monoxide", 1.0) / 1000 # convert ug/m3 to mg/m3
        o3 = current_aq.get("ozone", 30.0)

        # -------------------------------------------------------------------
        # CALIBRATION: Calculate full 6-pollutant NAQI for precise localization
        # -------------------------------------------------------------------
        naqi = calculate_full_naqi(pm25, pm10, no2, so2, co, o3)
        # -------------------------------------------------------------------

        aqi_val = naqi
        
    except Exception as e:
        print(f"Failed to query Open-Meteo APIs: {e}")
        # Graceful fallback values
        temp, humidity, pressure, wind_speed, pblh = 28.0, 60.0, 1008.0, 2.0, 800.0
        pm25, pm10, aqi_val, naqi = 35.0, 45.0, 100.0, 100.0
        
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
        horizon_h=forecast_data.get("horizon_h", 72),
        points=forecast_data.get("points", [naqi, naqi, naqi]),
        intervals=forecast_data.get("intervals", [[naqi*0.8, naqi*1.2]] * 3),
        ventilation_index=forecast_data.get("ventilation_index", pblh * wind_speed)
    )
    
    attribution = schemas.AttributionOutput(
        prediction_set=attribution_data.get("prediction_set", ["unknown"]),
        set_size=attribution_data.get("set_size", 1),
        confidence=attribution_data.get("confidence", 0.9),
        probabilities=attribution_data.get("probabilities", {"unknown": 1.0})
    )
    
    # 5. Generate dynamic hex grid centered around the user's location (radius ~0.08 deg)
    center_aqi = naqi
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
                
                # Interpolate AQI purely on distance without fake noise
                cell_aqi = max(10, center_aqi * (1.0 - dist_sq * 0.4))
                
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
        hex_grid=hex_grid,
        live_aqi=naqi
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

# ── Real CPCB/TSPCB/PCBA monitoring station locations per city ──
CITY_STATIONS = {
    "Delhi": [
        {"name": "Anand Vihar", "lat": 28.6468, "lon": 77.3160},
        {"name": "ITO", "lat": 28.6289, "lon": 77.2405},
        {"name": "R.K. Puram", "lat": 28.5634, "lon": 77.1745},
        {"name": "Dwarka Sector 8", "lat": 28.5730, "lon": 77.0700},
        {"name": "Punjabi Bagh", "lat": 28.6683, "lon": 77.1167},
        {"name": "Rohini", "lat": 28.7325, "lon": 77.1190},
        {"name": "Mundka", "lat": 28.6837, "lon": 77.0254},
        {"name": "Bawana", "lat": 28.7762, "lon": 77.0513},
        {"name": "Wazirpur", "lat": 28.6997, "lon": 77.1654},
        {"name": "Okhla Phase-2", "lat": 28.5305, "lon": 77.2710},
        {"name": "Ashok Vihar", "lat": 28.6927, "lon": 77.1815},
        {"name": "Mandir Marg", "lat": 28.6363, "lon": 77.2010},
        {"name": "North Campus (DU)", "lat": 28.6890, "lon": 77.2097},
        {"name": "Jahangirpuri", "lat": 28.7280, "lon": 77.1707},
        {"name": "Sirifort", "lat": 28.5504, "lon": 77.2157},
        {"name": "Shadipur", "lat": 28.6517, "lon": 77.1584},
        {"name": "Vivek Vihar", "lat": 28.6727, "lon": 77.3151},
        {"name": "Narela", "lat": 28.8523, "lon": 77.0927},
        {"name": "Najafgarh", "lat": 28.6092, "lon": 76.9798},
        {"name": "Patparganj", "lat": 28.6235, "lon": 77.2870},
    ],
    "Hyderabad": [
        {"name": "Zoo Park", "lat": 17.3497, "lon": 78.4517},
        {"name": "Bollaram", "lat": 17.5400, "lon": 78.3588},
        {"name": "ICRISAT Patancheru", "lat": 17.4515, "lon": 78.2747},
        {"name": "Sanathnagar", "lat": 17.4559, "lon": 78.4433},
        {"name": "Pashamylaram", "lat": 17.5322, "lon": 78.2045},
        {"name": "Central University", "lat": 17.4604, "lon": 78.3326},
        {"name": "Kokapet", "lat": 17.4120, "lon": 78.3531},
        {"name": "Ramachandrapuram", "lat": 17.4390, "lon": 78.2970},
        {"name": "Nacharam", "lat": 17.4271, "lon": 78.5487},
        {"name": "Abids", "lat": 17.3920, "lon": 78.4745},
        {"name": "Jubilee Hills", "lat": 17.4310, "lon": 78.4070},
        {"name": "Uppal", "lat": 17.4050, "lon": 78.5590},
    ],
    "Guwahati": [
        {"name": "Railway Colony (IITM)", "lat": 26.1820, "lon": 91.7460},
        {"name": "Bamunimaidam (CPCB)", "lat": 26.1730, "lon": 91.7700},
        {"name": "Pan Bazaar", "lat": 26.1900, "lon": 91.7400},
        {"name": "LGBI Airport", "lat": 26.1061, "lon": 91.5863},
        {"name": "Dispur", "lat": 26.1400, "lon": 91.7880},
        {"name": "Garchuk", "lat": 26.1260, "lon": 91.7270},
        {"name": "Chandmari", "lat": 26.1830, "lon": 91.7570},
    ],
}

CITY_CENTERS_BACKEND = {
    "Delhi": {"lat": 28.625, "lon": 77.15},
    "Hyderabad": {"lat": 17.425, "lon": 78.45},
    "Guwahati": {"lat": 26.15, "lon": 91.725},
}

@router.get("/city-data", response_model=CityDataResponse)
def get_city_data(city: str):
    station_list = CITY_STATIONS.get(city, [])
    if not station_list:
        return CityDataResponse(city=city, stations=[], center_aqi=0)

    stations = []
    total_aqi = 0

    lats_str = ",".join(str(st["lat"]) for st in station_list)
    lons_str = ",".join(str(st["lon"]) for st in station_list)

    try:
        # 1. Bulk Weather (PBLH, Temp, Humidity, Wind, Pressure)
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lats_str}&longitude={lons_str}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,boundary_layer_height"
        w_res = requests.get(weather_url, timeout=10).json()
        
        # 2. Bulk Air Quality
        aq_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lats_str}&longitude={lons_str}&current=pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,ozone,us_aqi"
        aq_res = requests.get(aq_url, timeout=10).json()
        
        # If the API returns a single object (e.g. only 1 station), wrap it in a list for consistent iteration
        if isinstance(w_res, dict) and "current" in w_res:
            w_res = [w_res]
        if isinstance(aq_res, dict) and "current" in aq_res:
            aq_res = [aq_res]

        for i, st in enumerate(station_list):
            cw = w_res[i].get("current", {})
            caq = aq_res[i].get("current", {})

            base_temp = cw.get("temperature_2m", 28.0)
            base_hum = cw.get("relative_humidity_2m", 60.0)
            base_press = cw.get("surface_pressure", 1008.0)
            base_wind = cw.get("wind_speed_10m", 2.0)
            base_pblh = cw.get("boundary_layer_height", 800.0)

            base_pm25 = caq.get("pm2_5", 35.0)
            base_pm10 = caq.get("pm10", 45.0)
            base_no2 = caq.get("nitrogen_dioxide", 20.0)
            base_so2 = caq.get("sulphur_dioxide", 10.0)
            base_co = caq.get("carbon_monoxide", 1.0) / 1000 # convert ug/m3 to mg/m3 for NAQI
            base_o3 = caq.get("ozone", 30.0)

            # Calibrate using full 6-pollutant Indian NAQI
            ml_aqi = calculate_full_naqi(base_pm25, base_pm10, base_no2, base_so2, base_co, base_o3)
            total_aqi += ml_aqi

            stations.append(StationData(
                id=f"ST_{i}",
                name=st["name"],
                lat=st["lat"],
                lon=st["lon"],
                pm25=base_pm25,
                pm10=base_pm10,
                no2=base_no2,
                so2=base_so2,
                co=base_co,
                o3=base_o3,
                temp=base_temp,
                humidity=base_hum,
                pressure=base_press,
                wind_speed=base_wind,
                pblh=base_pblh,
                aqi=round(ml_aqi),
                source="iot" if i % 5 == 0 else "caaqms",
                status="alert" if ml_aqi > 200 else "online"
            ))

    except Exception as e:
        import traceback
        with open("error_log.txt", "w") as f:
            f.write(traceback.format_exc())
        print(f"Failed to fetch live API data in bulk for {city}: {e}")
        # Graceful fallback in case Open-Meteo hits rate limits
        for i, st in enumerate(station_list):
            stations.append(StationData(
                id=f"ST_{i}", name=st["name"], lat=st["lat"], lon=st["lon"],
                pm25=35.0, pm10=45.0, no2=20.0, so2=10.0, co=1.0, o3=30.0,
                temp=28.0, humidity=60.0, pressure=1008.0, wind_speed=2.0, pblh=800.0,
                aqi=100.0, source="iot" if i % 5 == 0 else "caaqms", status="online"
            ))

    center_aqi = total_aqi / len(stations) if stations else 0

    return CityDataResponse(
        city=city,
        stations=stations,
        center_aqi=center_aqi
    )
