import os
import json
import time
import pandas as pd
import requests
from datetime import datetime, timedelta

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
DISTRICTS_FILE = os.path.join(DATA_DIR, "hyderabad_districts.json")
OUTPUT_FILE = os.path.join(DATA_DIR, "dataset_hyderabad_expanded.csv")

# Configuration
START_DATE = "2025-01-01"
END_DATE = "2026-08-01"

# APIs
AQ_API_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
WEATHER_API_URL = "https://archive-api.open-meteo.com/v1/era5"

def calculate_naqi(pm25, pm10):
    # Simplified NAQI calculation using PM2.5 and PM10 for now
    # The actual CPCB formula is a piecewise linear function
    # Here we use a rough approximation for continuous values
    if pd.isna(pm25) and pd.isna(pm10):
        return None
    
    # Rough approximation mapping
    aqi_pm25 = (pm25 / 60) * 100 if pd.notna(pm25) else 0
    aqi_pm10 = (pm10 / 100) * 100 if pd.notna(pm10) else 0
    
    return max(aqi_pm25, aqi_pm10)


def fetch_data_for_district(district):
    lat, lon = district['lat'], district['lon']
    print(f"Fetching data for {district['name']} ({lat}, {lon})...")
    
    # 1. Fetch Air Quality Data
    aq_params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": START_DATE,
        "end_date": END_DATE,
        "hourly": "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,aerosol_optical_depth",
        "timezone": "Asia/Kolkata"
    }
    
    try:
        aq_response = requests.get(AQ_API_URL, params=aq_params, timeout=30)
        aq_response.raise_for_status()
        aq_data = aq_response.json()
    except Exception as e:
        print(f"Error fetching AQ data for {district['name']}: {e}")
        return pd.DataFrame()

    aq_df = pd.DataFrame(aq_data['hourly'])
    # Rename columns to match our schema
    aq_df = aq_df.rename(columns={
        "time": "timestamp",
        "pm2_5": "pm25",
        "carbon_monoxide": "co",
        "nitrogen_dioxide": "no2",
        "sulphur_dioxide": "so2",
        "ozone": "o3",
        "aerosol_optical_depth": "aod"
    })
    
    # 2. Fetch Weather Data (ERA5)
    weather_params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": START_DATE,
        "end_date": END_DATE,
        "hourly": "temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,boundary_layer_height,cloud_cover,precipitation",
        "timezone": "Asia/Kolkata"
    }
    
    try:
        weather_response = requests.get(WEATHER_API_URL, params=weather_params, timeout=30)
        weather_response.raise_for_status()
        weather_data = weather_response.json()
    except Exception as e:
        print(f"Error fetching Weather data for {district['name']}: {e}")
        return pd.DataFrame()
        
    weather_df = pd.DataFrame(weather_data['hourly'])
    # Rename columns
    weather_df = weather_df.rename(columns={
        "time": "timestamp",
        "temperature_2m": "temp_c",
        "relative_humidity_2m": "humidity",
        "surface_pressure": "pressure_mb",
        "wind_speed_10m": "wind_speed_ms",
        "wind_direction_10m": "wind_direction_deg",
        "boundary_layer_height": "pblh",
        "cloud_cover": "cloud_cover",
        "precipitation": "precipitation"
    })
    
    # Convert wind speed from km/h (Open-Meteo default) to m/s
    if 'wind_speed_ms' in weather_df.columns:
        weather_df['wind_speed_ms'] = weather_df['wind_speed_ms'] * (1000 / 3600)
    
    # 3. Merge Datasets
    merged_df = pd.merge(aq_df, weather_df, on="timestamp", how="inner")
    
    # 4. Add District Info
    merged_df['district_id'] = district['id']
    merged_df['district_name'] = district['name']
    merged_df['latitude'] = lat
    merged_df['longitude'] = lon
    
    # 5. Compute derived features
    merged_df['aqi_in'] = merged_df.apply(lambda row: calculate_naqi(row['pm25'], row['pm10']), axis=1)
    
    # Be polite to the API
    time.sleep(1)
    
    return merged_df

def main():
    if not os.path.exists(DISTRICTS_FILE):
        print(f"Error: {DISTRICTS_FILE} not found.")
        return
        
    with open(DISTRICTS_FILE, 'r') as f:
        districts = json.load(f)
        
    print(f"Loaded {len(districts)} districts. Starting data acquisition...")
    
    all_dfs = []
    
    for district in districts:
        df = fetch_data_for_district(district)
        if not df.empty:
            all_dfs.append(df)
            print(f"Added {len(df)} rows for {district['name']}.")
            
    if all_dfs:
        final_df = pd.concat(all_dfs, ignore_index=True)
        # Drop rows with entirely null targets if any
        final_df = final_df.dropna(subset=['pm25', 'pm10'], how='all')
        
        final_df.to_csv(OUTPUT_FILE, index=False)
        print(f"\nSuccess! Saved {len(final_df)} rows to {OUTPUT_FILE}")
        print("\nData Quality Summary:")
        print(f"Date Range: {final_df['timestamp'].min()} to {final_df['timestamp'].max()}")
        print(f"Total Rows: {len(final_df)}")
        print(f"Districts Covered: {final_df['district_name'].nunique()}")
        print("\nNull Value Counts:")
        print(final_df[['pm25', 'pm10', 'temp_c', 'wind_speed_ms', 'pblh']].isnull().sum())
    else:
        print("Failed to acquire any data.")

if __name__ == "__main__":
    main()
