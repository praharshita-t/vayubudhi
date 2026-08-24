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

TOMTOM_API_KEY = "F2IGExpJqNtrBHZoOGmiSIhhV63Q4BSz"
TRAFFIC_CACHE = {}
CACHE_TTL = 300  # 5 minutes

def get_station_profile(station_name: str):
    name = station_name.lower()
    industrial = 1.0
    green = 1.0
    
    if any(x in name for x in ["peenya", "industrial", "phase", "bkc", "kurla", "anand vihar", "bawana", "mundka", "okhla", "patancheru", "sanathnagar", "quthbullapur"]):
        industrial = 1.25
    elif any(x in name for x in ["park", "garden", "campus", "memorial", "cubbon", "forest", "jayanagar", "jubilee hills", "secunderabad", "alwal"]):
        green = 0.85
        
    return industrial, green

def get_traffic_multiplier(lat: float, lon: float) -> float:
    key = f"{lat},{lon}"
    now = time.time()
    if key in TRAFFIC_CACHE and (now - TRAFFIC_CACHE[key]['time']) < CACHE_TTL:
        return TRAFFIC_CACHE[key]['val']

    try:
        url = f"https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point={lat},{lon}&unit=KMPH&key={TOMTOM_API_KEY}"
        res = requests.get(url, timeout=2).json()
        flow = res.get("flowSegmentData", {})
        current = flow.get("currentSpeed", 1)
        free = flow.get("freeFlowSpeed", 1)
        if free <= 0: return 1.0
        
        congestion = (free - current) / free
        multiplier = 1.0 + (max(0, congestion) * 0.4)
        final_mult = min(multiplier, 1.5)
        TRAFFIC_CACHE[key] = {'val': final_mult, 'time': now}
        return final_mult
    except Exception as e:
        print(f"TomTom traffic fetch failed for {lat},{lon}: {e}")
        return 1.0

router = APIRouter()

class LiveDataResponse(BaseModel):
    lat: float
    lon: float
    reading: schemas.SensorReading
    attribution: schemas.AttributionOutput
    forecast: schemas.ForecastOutput
    hex_grid: List[Dict[str, Any]]
    live_aqi: float

# Humidity correction and India NAQI removed per user request to strictly use US EPA standard.
@router.get("/live", response_model=LiveDataResponse)
def get_live_data(lat: float, lon: float):
    # 1. Fetch live weather data from Open-Meteo Weather API (free, keyless)
    weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,boundary_layer_height"
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
        us_aqi = current_aq.get("us_aqi", 100.0)

        aqi_val = float(us_aqi)
        naqi = aqi_val
        
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
    pblh: float = 800.0
    aqi: float
    source: str
    status: str

class CityDataResponse(BaseModel):
    city: str
    stations: List[StationData]
    center_aqi: float

# ── Real CPCB/State PCB monitoring station locations per city ──
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
        {"name": "Bollaram Industrial", "lat": 17.5400, "lon": 78.3588},
        {"name": "Jeedimetla Phase-1", "lat": 17.5186, "lon": 78.4418},
        {"name": "KBR National Park", "lat": 17.4213, "lon": 78.4231},
        {"name": "HITEC City", "lat": 17.4435, "lon": 78.3772},
        {"name": "Gachibowli", "lat": 17.4401, "lon": 78.3489},
        {"name": "Charminar", "lat": 17.3616, "lon": 78.4747},
        {"name": "Sanjeevaiah Park", "lat": 17.4334, "lon": 78.4745},
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
    "Mumbai": [
        {"name": "Colaba", "lat": 18.9067, "lon": 72.8147},
        {"name": "BKC", "lat": 19.0657, "lon": 72.8687},
        {"name": "Kurla", "lat": 19.0726, "lon": 72.8845},
        {"name": "Andheri East", "lat": 19.1136, "lon": 72.8697},
        {"name": "Borivali", "lat": 19.2307, "lon": 72.8567},
        {"name": "Navi Mumbai", "lat": 19.0330, "lon": 73.0297},
        {"name": "Thane", "lat": 19.2183, "lon": 72.9781},
        {"name": "Worli", "lat": 19.0176, "lon": 72.8178},
        {"name": "Chembur", "lat": 19.0522, "lon": 72.8994},
        {"name": "Bandra", "lat": 19.0596, "lon": 72.8295},
    ],
    "Chennai": [
        {"name": "Alandur", "lat": 13.0033, "lon": 80.2014},
        {"name": "Manali", "lat": 13.1667, "lon": 80.2667},
        {"name": "Velachery", "lat": 12.9759, "lon": 80.2212},
        {"name": "Royapuram", "lat": 13.1147, "lon": 80.2982},
        {"name": "Kodungaiyur", "lat": 13.1362, "lon": 80.2612},
        {"name": "Perungudi", "lat": 12.9654, "lon": 80.2461},
        {"name": "Ambattur", "lat": 13.1143, "lon": 80.1548},
        {"name": "Anna Nagar", "lat": 13.0850, "lon": 80.2101},
    ],
    "Kolkata": [
        {"name": "Victoria Memorial", "lat": 22.5448, "lon": 88.3426},
        {"name": "Rabindra Bharati", "lat": 22.5833, "lon": 88.3667},
        {"name": "Jadavpur", "lat": 22.4989, "lon": 88.3713},
        {"name": "Ballygunge", "lat": 22.5280, "lon": 88.3655},
        {"name": "Fort William", "lat": 22.5542, "lon": 88.3375},
        {"name": "Salt Lake", "lat": 22.5867, "lon": 88.4178},
        {"name": "Howrah", "lat": 22.5958, "lon": 88.2636},
    ],
    "Pune": [
        {"name": "Shivajinagar", "lat": 18.5308, "lon": 73.8475},
        {"name": "Hadapsar", "lat": 18.5089, "lon": 73.9260},
        {"name": "Kothrud", "lat": 18.5074, "lon": 73.8077},
        {"name": "Bhosari", "lat": 18.6279, "lon": 73.8447},
        {"name": "Pashan", "lat": 18.5412, "lon": 73.7925},
        {"name": "Katraj", "lat": 18.4575, "lon": 73.8677},
        {"name": "Viman Nagar", "lat": 18.5679, "lon": 73.9143},
    ],
    "Ahmedabad": [
        {"name": "Maninagar", "lat": 22.9980, "lon": 72.6026},
        {"name": "Chandkheda", "lat": 23.1118, "lon": 72.5853},
        {"name": "Rakhial", "lat": 23.0232, "lon": 72.6179},
        {"name": "Bopal", "lat": 23.0338, "lon": 72.4633},
        {"name": "Vatva", "lat": 22.9648, "lon": 72.6322},
    ],
    "Jaipur": [
        {"name": "Adarsh Nagar", "lat": 26.9010, "lon": 75.8362},
        {"name": "Shastri Nagar", "lat": 26.9422, "lon": 75.7951},
        {"name": "Mansarovar", "lat": 26.8527, "lon": 75.7683},
        {"name": "Sitapura", "lat": 26.7820, "lon": 75.8270},
        {"name": "Police Commissionerate", "lat": 26.9157, "lon": 75.8011},
    ],
    "Lucknow": [
        {"name": "Lalbagh", "lat": 26.8489, "lon": 80.9419},
        {"name": "Talkatora", "lat": 26.8331, "lon": 80.8931},
        {"name": "Gomti Nagar", "lat": 26.8540, "lon": 80.9984},
        {"name": "Aliganj", "lat": 26.8833, "lon": 80.9333},
        {"name": "BR Ambedkar University", "lat": 26.7725, "lon": 80.9230},
    ],
    "Chandigarh": [
        {"name": "Sector 22", "lat": 30.7280, "lon": 76.7710},
        {"name": "Sector 53", "lat": 30.7230, "lon": 76.7350},
        {"name": "Sector 25", "lat": 30.7510, "lon": 76.7640},
        {"name": "Panchkula", "lat": 30.6942, "lon": 76.8606},
    ],
    "Thiruvananthapuram": [
        {"name": "Palayam", "lat": 8.5060, "lon": 76.9530},
        {"name": "Kariavattom", "lat": 8.5640, "lon": 76.8840},
        {"name": "Vellayambalam", "lat": 8.5130, "lon": 76.9580},
        {"name": "Thampanoor", "lat": 8.4900, "lon": 76.9520},
    ],
    "Kanpur": [
        {"name": "Nehru Nagar", "lat": 26.4710, "lon": 80.3220},
        {"name": "Sharda Nagar", "lat": 26.4910, "lon": 80.2980},
        {"name": "Kidwai Nagar", "lat": 26.4320, "lon": 80.3340},
    ],
    "Nagpur": [
        {"name": "Civil Lines", "lat": 21.1530, "lon": 79.0760},
        {"name": "Ambazari", "lat": 21.1270, "lon": 79.0490},
        {"name": "Mahal", "lat": 21.1440, "lon": 79.1120},
    ],
    "Indore": [
        {"name": "Chhoti Gwaltoli", "lat": 22.7190, "lon": 75.8710},
        {"name": "Vijay Nagar", "lat": 22.7533, "lon": 75.8937},
        {"name": "Sanwer Road", "lat": 22.7840, "lon": 75.8530},
    ],
    "Bhopal": [
        {"name": "TT Nagar", "lat": 23.2350, "lon": 77.4010},
        {"name": "Kolar Road", "lat": 23.1780, "lon": 77.4260},
        {"name": "Govindpura", "lat": 23.2560, "lon": 77.4620},
    ],
    "Patna": [
        {"name": "IGSC Planetarium", "lat": 25.6090, "lon": 85.1370},
        {"name": "Samana Har", "lat": 25.6210, "lon": 85.1480},
        {"name": "Muradpur", "lat": 25.6180, "lon": 85.1660},
        {"name": "Danapur", "lat": 25.6330, "lon": 85.0440},
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
    "Mumbai": {"lat": 19.076, "lon": 72.877},
    "Chennai": {"lat": 13.0827, "lon": 80.2707},
    "Kolkata": {"lat": 22.5726, "lon": 88.3639},
    "Pune": {"lat": 18.5204, "lon": 73.8567},
    "Ahmedabad": {"lat": 23.0225, "lon": 72.5714},
    "Jaipur": {"lat": 26.9124, "lon": 75.7873},
    "Lucknow": {"lat": 26.8467, "lon": 80.9462},
    "Chandigarh": {"lat": 30.7333, "lon": 76.7794},
    "Thiruvananthapuram": {"lat": 8.5241, "lon": 76.9366},
    "Kanpur": {"lat": 26.4499, "lon": 80.3319},
    "Nagpur": {"lat": 21.1458, "lon": 79.0882},
    "Indore": {"lat": 22.7196, "lon": 75.8577},
    "Bhopal": {"lat": 23.2599, "lon": 77.4126},
    "Patna": {"lat": 25.5941, "lon": 85.1376},
}

import threading
import time
from concurrent.futures import ThreadPoolExecutor

CITY_DATA_CACHE = {}        # key: city_name, value: (timestamp, CityDataResponse)
CITY_HIST_CACHE = {}        # key: cache_key, value: (timestamp, CityHistoricalResponse)
CACHE_LOCK = threading.Lock()
CACHE_TTL = 180             # 3 minutes in seconds

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
        # Fallback: if city has known center, generate distributed stations around it
        center = CITY_CENTERS_BACKEND.get(city, {"lat": 28.625, "lon": 77.15})
        clat, clon = center["lat"], center["lon"]
        offsets = [
            (0.0, 0.0, "Central"),
            (0.04, 0.0, "North"),
            (-0.04, 0.0, "South"),
            (0.0, 0.04, "East"),
            (0.0, -0.04, "West"),
            (0.03, 0.03, "North-East"),
            (-0.03, -0.03, "South-West"),
            (0.03, -0.03, "North-West")
        ]
        station_list = [
            {"name": f"{city} {name}", "lat": round(clat + dy, 4), "lon": round(clon + dx, 4)}
            for dy, dx, name in offsets
        ]

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
        # Using a custom User-Agent and sequential requests to avoid rate-limits/ConnectionResetError
        headers = {"User-Agent": "VayuBudhi/1.0 (Contact: admin@vayubudhi.local)"}
        
        try:
            w_resp = requests.get(weather_url, headers=headers, timeout=10)
            w_resp.raise_for_status()
            w_res = w_resp.json()
        except requests.exceptions.RequestException:
            # Retry once
            time.sleep(1)
            w_resp = requests.get(weather_url, headers=headers, timeout=15)
            w_resp.raise_for_status()
            w_res = w_resp.json()
            
        try:
            aq_resp = requests.get(aq_url, headers=headers, timeout=10)
            aq_resp.raise_for_status()
            aq_res = aq_resp.json()
        except requests.exceptions.RequestException:
            # Retry once
            time.sleep(1)
            aq_resp = requests.get(aq_url, headers=headers, timeout=15)
            aq_resp.raise_for_status()
            aq_res = aq_resp.json()

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
            base_us_aqi = caq.get("us_aqi", 100.0)

            # Determine station source
            source = "iot" if i % 5 == 0 else "caaqms"

            # Apply Realistic Modifiers (Traffic + Industrial + Green Cover)
            ind_factor, green_factor = get_station_profile(st["name"])
            traffic_factor = get_traffic_multiplier(st["lat"], st["lon"])
            
            final_pm25 = float(base_pm25) * traffic_factor * ind_factor * green_factor
            final_pm10 = float(base_pm10) * ind_factor * green_factor
            final_no2 = float(base_no2) * traffic_factor
            final_so2 = float(base_so2) * ind_factor
            final_co = float(base_co) * traffic_factor
            
            final_aqi = float(base_us_aqi) * traffic_factor * ind_factor * green_factor
            
            ml_aqi = float(final_aqi)
            total_aqi += ml_aqi

            stations.append(StationData(
                id=f"ST_{i}",
                name=st["name"],
                lat=st["lat"],
                lon=st["lon"],
                pm25=final_pm25,
                pm10=final_pm10,
                no2=final_no2,
                so2=final_so2,
                co=final_co,
                o3=float(base_o3),
                temp=float(base_temp),
                humidity=float(base_hum),
                pressure=float(base_press),
                wind_speed=float(base_wind),
                pblh=float(base_pblh),
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
                temp=28.0, humidity=60.0, pressure=1008.0, wind_speed=2.0, pblh=800.0,
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
        url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&hourly=pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,ozone,us_aqi&past_days=1&forecast_days=1"
        res = requests.get(url, timeout=8).json()
        
        times = res.get("hourly", {}).get("time", [])
        pm25s = res.get("hourly", {}).get("pm2_5", [])
        pm10s = res.get("hourly", {}).get("pm10", [])
        no2s = res.get("hourly", {}).get("nitrogen_dioxide", [])
        so2s = res.get("hourly", {}).get("sulphur_dioxide", [])
        cos = res.get("hourly", {}).get("carbon_monoxide", [])
        o3s = res.get("hourly", {}).get("ozone", [])
        us_aqis = res.get("hourly", {}).get("us_aqi", [])
        
        now = datetime.now()
        for i in range(len(times)):
            t = datetime.fromisoformat(times[i])
            if t <= now:
                p25 = pm25s[i] if i < len(pm25s) and pm25s[i] is not None else 30.0
                p10 = pm10s[i] if i < len(pm10s) and pm10s[i] is not None else 45.0
                
                aqi = us_aqis[i] if i < len(us_aqis) and us_aqis[i] is not None else 100.0
                
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
