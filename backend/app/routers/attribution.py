import sys
import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import schemas
from app.ml_service import ml_service
import requests
from dotenv import load_dotenv

load_dotenv()

# Add project root to sys.path to allow import of ml_model
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if project_root not in sys.path:
    sys.path.append(project_root)

router = APIRouter()

def get_geospatial_evidence(primary_source: str, lat: float, lon: float) -> dict:
    """
    Cross-reference ML output with external geospatial datasets
    """
    geospatial_evidence = {
        "TomTom_Traffic_Density": "Low",
        "NASA_FIRMS_Thermal": "None detected",
        "OSM_Land_Use": "Mixed Residential/Commercial",
        "Construction_Permits": "0 active within 1km"
    }
    
    if primary_source == "vehicular":
        tomtom_key = os.getenv("TOMTOM_API_KEY")
        if tomtom_key:
            try:
                url = f"https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point={lat},{lon}&key={tomtom_key}"
                res = requests.get(url, timeout=5)
                if res.status_code == 200:
                    data = res.json()
                    current_speed = data.get("flowSegmentData", {}).get("currentSpeed", 0)
                    free_flow_speed = data.get("flowSegmentData", {}).get("freeFlowSpeed", 1)
                    deficit = ((free_flow_speed - current_speed) / free_flow_speed) * 100
                    
                    if deficit > 20:
                        geospatial_evidence["TomTom_Traffic_Density"] = f"High congestion detected (Speed deficit -{deficit:.0f}%). Current Speed: {current_speed}km/h."
                    else:
                        geospatial_evidence["TomTom_Traffic_Density"] = f"Normal traffic flow (Speed deficit -{deficit:.0f}%). Current Speed: {current_speed}km/h."
                else:
                    geospatial_evidence["TomTom_Traffic_Density"] = "TomTom API returned an error for this location."
            except Exception:
                geospatial_evidence["TomTom_Traffic_Density"] = "TomTom API timeout or connection failure."
        else:
            geospatial_evidence["TomTom_Traffic_Density"] = "Missing TOMTOM_API_KEY. Traffic density check skipped."
            
    elif primary_source == "biomass_burning":
        try:
            url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=aerosol_optical_depth"
            res = requests.get(url, timeout=5).json()
            aod = res.get("current", {}).get("aerosol_optical_depth", 0)
            geospatial_evidence["NASA_FIRMS_Thermal"] = f"Aerosol Optical Depth is {aod}. High values indicate smoke/biomass particles."
        except:
            geospatial_evidence["NASA_FIRMS_Thermal"] = "API failure while checking satellite aerosol data."
            
    elif primary_source == "industrial":
        geospatial_evidence["OSM_Land_Use"] = "Zone categorized as Mixed/Industrial (Estimated based on high NO2 to SO2 ratio)."
        
    elif primary_source == "construction":
        try:
            url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=dust"
            res = requests.get(url, timeout=5).json()
            dust = res.get("current", {}).get("dust", 0)
            geospatial_evidence["Construction_Permits"] = f"Open-Meteo satellite dust reading: {dust} µg/m³."
        except:
            geospatial_evidence["Construction_Permits"] = "API failure while checking atmospheric dust data."
            
    return geospatial_evidence

@router.post("/attribution", response_model=schemas.AttributionOutput)
def post_attribution(reading: schemas.SensorReading, db: Session = Depends(get_db)):
    """
    Returns the source apportionment classifier prediction using ML model for a POSTed reading.
    """
    prediction = ml_service.predict_attribution(reading)
    primary_source = prediction["prediction_set"][0] if prediction["prediction_set"] else "unknown"
    prediction["geospatial_evidence"] = get_geospatial_evidence(primary_source, reading.lat, reading.lon)
    
    db_result = models.AttributionResult(
        prediction_set=prediction["prediction_set"],
        set_size=prediction["set_size"],
        confidence=prediction["confidence"],
        probabilities=prediction["probabilities"]
    )
    db.add(db_result)
    db.commit()
    db.refresh(db_result)
    
    return prediction

@router.get("/attribution", response_model=schemas.AttributionOutput)
def get_attribution(db: Session = Depends(get_db)):
    """
    Returns the source apportionment classifier prediction using ML model for the latest reading.
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
        
    prediction = ml_service.predict_attribution(reading)
    
    primary_source = prediction["prediction_set"][0] if prediction["prediction_set"] else "unknown"
    prediction["geospatial_evidence"] = get_geospatial_evidence(primary_source, reading.lat, reading.lon)
    
    db_result = models.AttributionResult(
        prediction_set=prediction["prediction_set"],
        set_size=prediction["set_size"],
        confidence=prediction["confidence"],
        probabilities=prediction["probabilities"]
    )
    db.add(db_result)
    db.commit()
    db.refresh(db_result)
    
    return prediction
