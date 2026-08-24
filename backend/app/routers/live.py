import requests
import os
import time
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


def _get_with_retry(url: str, timeout: int = 10, retries: int = 3) -> requests.Response:
    """Retry Open-Meteo requests — transient SSL/connection resets are common on Windows."""
    last_err = None
    for attempt in range(retries):
        try:
            resp = requests.get(url, timeout=timeout)
            resp.raise_for_status()
            return resp
        except Exception as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(1.0 * (attempt + 1))
    raise last_err


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

def apply_humidity_correction(pm25: float, humidity: float) -> float:
    """
    Applies κ-Köhler theory to correct PM2.5 readings for hygroscopic growth due to high humidity.
    Prevents fog from being falsely reported as severe particulate pollution.
    """
    kappa = 0.3 # Typical urban aerosol hygroscopicity parameter
    rh = min(humidity, 95.0) # Clamp to avoid division by zero
    growth_factor = 1.0 + kappa * (rh / (100.0 - rh))
    return pm25 / growth_factor

@router.get("/live", response_model=LiveDataResponse)
def get_live_data(lat: float, lon: float):
    # 1. Fetch live weather data from Open-Meteo Weather API (free, keyless)
    weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,boundary_layer_height"
    # 2. Fetch live air quality data from Open-Meteo Air Quality API (free, keyless)
    aq_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,ozone,us_aqi"
    
    try:
        weather_res = _get_with_retry(weather_url, timeout=8)
        aq_res = _get_with_retry(aq_url, timeout=8)
        
        weather_data = weather_res.json()
        aq_data = aq_res.json()
        
        # Parse weather values
        current_weather = weather_data.get("current", {})
        temp = current_weather.get("temperature_2m", 28.0)
        humidity = current_weather.get("relative_humidity_2m", 60.0)
        pressure = current_weather.get("surface_pressure", 1008.0)
        wind_speed = current_weather.get("wind_speed_10m", 2.0)
        wind_dir = current_weather.get("wind_direction_10m", 0.0)
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
        # Apply Humidity Correction to PM2.5
        # -------------------------------------------------------------------
        corrected_pm25 = apply_humidity_correction(pm25, humidity)
        naqi = calculate_full_naqi(corrected_pm25, pm10, no2, so2, co, o3)
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
        wind_dir=wind_dir,
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
    wind_dir: float = 0.0
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
        # Fallback list, overridden by dynamic load below
        {"name": "Zoo Park", "lat": 17.3497, "lon": 78.4517},
        {"name": "Bollaram", "lat": 17.5400, "lon": 78.3588},
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
    "Bengaluru": [
        {"name": "Silk Board", "lat": 12.9172, "lon": 77.6228},
        {"name": "BTM Layout", "lat": 12.9166, "lon": 77.6101},
        {"name": "Peenya", "lat": 13.0285, "lon": 77.5197},
        {"name": "Hebbal", "lat": 13.0354, "lon": 77.5988},
        {"name": "Jayanagar", "lat": 12.9299, "lon": 77.5826},
        {"name": "City Railway Station", "lat": 12.9771, "lon": 77.5671},
        {"name": "Indiranagar", "lat": 12.9784, "lon": 77.6408},
        {"name": "Koramangala", "lat": 12.9279, "lon": 77.6271},
        {"name": "Whitefield", "lat": 12.9698, "lon": 77.7499},
        {"name": "Electronic City", "lat": 12.8452, "lon": 77.6602},
    ],
}

try:
    import json
    # Ensure BASE_DIR is defined correctly for this path resolution
    base_dir_for_json = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    districts_path = os.path.join(base_dir_for_json, 'data', 'hyderabad_districts.json')
    if os.path.exists(districts_path):
        with open(districts_path, 'r') as f:
            hyd_districts = json.load(f)
        CITY_STATIONS["Hyderabad"] = [
            {"name": d["name"], "lat": d["lat"], "lon": d["lon"], "id": d.get("id", f"HYD_{i}")} 
            for i, d in enumerate(hyd_districts)
        ]
        print(f"Loaded {len(hyd_districts)} dynamic districts for Hyderabad map.")
except Exception as e:
    print(f"Failed to load dynamic hyderabad districts: {e}")

CITY_CENTERS_BACKEND = {
    "Delhi": {"lat": 28.625, "lon": 77.15},
    "Hyderabad": {"lat": 17.425, "lon": 78.45},
    "Guwahati": {"lat": 26.15, "lon": 91.725},
    "Bengaluru": {"lat": 12.97, "lon": 77.59},
}

import threading
from concurrent.futures import ThreadPoolExecutor

CITY_DATA_CACHE = {}        # key: city_name, value: (timestamp, CityDataResponse)
CITY_HIST_CACHE = {}        # key: cache_key, value: (timestamp, CityHistoricalResponse)
CACHE_LOCK = threading.Lock()
CACHE_TTL = 300             # 5 minutes in seconds

@router.get("/city-data", response_model=CityDataResponse)
def get_city_data(city: str):
    now = time.time()
    with CACHE_LOCK:
        if city in CITY_DATA_CACHE:
            ts, val = CITY_DATA_CACHE[city]
            if now - ts < CACHE_TTL:
                return val

    station_list = CITY_STATIONS.get(city, [])
    if not station_list:
        return CityDataResponse(city=city, stations=[], center_aqi=0)

    stations = []
    total_aqi = 0

    lats_str = ",".join(str(st["lat"]) for st in station_list)
    lons_str = ",".join(str(st["lon"]) for st in station_list)

    try:
        # 1. Bulk Weather (PBLH, Temp, Humidity, Wind, Pressure)
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lats_str}&longitude={lons_str}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,boundary_layer_height"
        
        # 2. Bulk Air Quality
        aq_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lats_str}&longitude={lons_str}&current=pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,ozone,us_aqi"

        # Concurrently fetch Weather and Air Quality APIs
        with ThreadPoolExecutor(max_workers=2) as executor:
            future_weather = executor.submit(_get_with_retry, weather_url, 12, 3)
            future_aq = executor.submit(_get_with_retry, aq_url, 12, 3)
            
            w_res = future_weather.result().json()
            aq_res = future_aq.result().json()

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
            base_wind_dir = cw.get("wind_direction_10m", 0.0)
            base_pblh = cw.get("boundary_layer_height", 800.0)

            base_pm25 = caq.get("pm2_5", 35.0)
            base_pm10 = caq.get("pm10", 45.0)
            base_no2 = caq.get("nitrogen_dioxide", 20.0)
            base_so2 = caq.get("sulphur_dioxide", 10.0)
            base_co = caq.get("carbon_monoxide", 1.0) / 1000 # convert ug/m3 to mg/m3 for NAQI
            base_o3 = caq.get("ozone", 30.0)

            # Determine station source
            source = "iot" if i % 5 == 0 else "caaqms"

            # Apply Humidity Correction to PM2.5 ONLY if source is "iot"
            if source == "iot":
                corrected_pm25 = apply_humidity_correction(base_pm25, base_hum)
            else:
                corrected_pm25 = base_pm25

            # Calibrate using full 6-pollutant Indian NAQI
            ml_aqi = calculate_full_naqi(corrected_pm25, base_pm10, base_no2, base_so2, base_co, base_o3)
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
                wind_dir=base_wind_dir,
                pblh=base_pblh,
                aqi=round(ml_aqi),
                source=source,
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
                temp=28.0, humidity=60.0, pressure=1008.0, wind_speed=2.0, wind_dir=0.0, pblh=800.0,
                aqi=100.0, source="iot" if i % 5 == 0 else "caaqms", status="online"
            ))

    if stations:
        # Use statistical median for city center AQI to prevent outlier skew from industrial clusters
        aqi_values = sorted([s.aqi for s in stations])
        mid = len(aqi_values) // 2
        center_aqi = float(aqi_values[mid] if len(aqi_values) % 2 != 0 else (aqi_values[mid - 1] + aqi_values[mid]) / 2.0)
    else:
        center_aqi = 0.0

    res = CityDataResponse(
        city=city,
        stations=stations,
        center_aqi=center_aqi
    )
    with CACHE_LOCK:
        CITY_DATA_CACHE[city] = (time.time(), res)
    return res

class HourlyAqiPoint(BaseModel):
    time: str
    timestamp: str
    aqi: float
    pm25: float
    pm10: float

class CityHistoricalResponse(BaseModel):
    city: str
    history: List[HourlyAqiPoint]

@router.get("/city-historical", response_model=CityHistoricalResponse)
def get_city_historical(city: str = "Hyderabad", lat: float = None, lon: float = None):
    """
    Fetches real 24-hour historical hourly telemetry from Open-Meteo Air Quality satellite archive
    and computes the calibrated Indian NAQI for each past hour.
    """
    from datetime import datetime, timezone
    
    # Resolve coordinates
    if lat is None or lon is None:
        coords = CITY_CENTERS_BACKEND.get(city, {"lat": 17.425, "lon": 78.45})
        lat = coords["lat"]
        lon = coords["lon"]
        
    cache_key = f"{city}_{lat}_{lon}"
    now = time.time()
    with CACHE_LOCK:
        if cache_key in CITY_HIST_CACHE:
            ts, val = CITY_HIST_CACHE[cache_key]
            if now - ts < CACHE_TTL:
                return val

    history = []
    try:
        url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&hourly=pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,ozone&past_days=1&forecast_days=1"
        res = _get_with_retry(url, timeout=10).json()
        
        times = res.get("hourly", {}).get("time", [])
        pm25s = res.get("hourly", {}).get("pm2_5", [])
        pm10s = res.get("hourly", {}).get("pm10", [])
        no2s = res.get("hourly", {}).get("nitrogen_dioxide", [])
        so2s = res.get("hourly", {}).get("sulphur_dioxide", [])
        cos = res.get("hourly", {}).get("carbon_monoxide", [])
        o3s = res.get("hourly", {}).get("ozone", [])
        
        now = datetime.now()
        for i in range(len(times)):
            t = datetime.fromisoformat(times[i])
            if t <= now:
                p25 = pm25s[i] if i < len(pm25s) and pm25s[i] is not None else 30.0
                p10 = pm10s[i] if i < len(pm10s) and pm10s[i] is not None else 45.0
                no2 = no2s[i] if i < len(no2s) and no2s[i] is not None else 20.0
                so2 = so2s[i] if i < len(so2s) and so2s[i] is not None else 10.0
                co = (cos[i] / 1000.0) if i < len(cos) and cos[i] is not None else 0.5
                o3 = o3s[i] if i < len(o3s) and o3s[i] is not None else 30.0
                
                aqi = calculate_full_naqi(p25, p10, no2, so2, co, o3)
                
                history.append(HourlyAqiPoint(
                    time=t.strftime("%I:%M %p"),
                    timestamp=times[i],
                    aqi=float(round(aqi)),
                    pm25=float(round(p25, 1)),
                    pm10=float(round(p10, 1))
                ))
                
        # Keep last 24 hours of data
        history = history[-24:]
    except Exception as e:
        print(f"Failed to fetch historical AQI for {city}: {e}")
        
    res = CityHistoricalResponse(city=city, history=history)
    with CACHE_LOCK:
        CITY_HIST_CACHE[cache_key] = (time.time(), res)
    return res
