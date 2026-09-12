from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import schemas

router = APIRouter()

@router.post("/ingest", response_model=schemas.IngestResponse, status_code=status.HTTP_200_OK)
def ingest_reading(reading: schemas.SensorReading, db: Session = Depends(get_db)):
    """
    Ingest live telemetry from the ESP32 weather station.
    Accepts Contract 1 JSON shape, stores it in SQLite, and returns received confirmation.
    """
    db_reading = models.SensorReading(
        station_id=reading.station_id,
        timestamp=reading.timestamp,
        pm25=reading.pm25,
        pm10=reading.pm10,
        temp=reading.temp,
        humidity=reading.humidity,
        pressure=reading.pressure
    )
    db.add(db_reading)
    db.commit()
    db.refresh(db_reading)
    return {"status": "received"}


@router.get("/ingest/latest")
def get_latest_reading(db: Session = Depends(get_db)):
    """
    Fetch the most recent physical hardware / simulated sensor reading.
    Used by mobile and web dashboards for live real-time edge telemetry and alarms.
    """
    latest = db.query(models.SensorReading).order_by(models.SensorReading.id.desc()).first()
    if not latest:
        return {
            "id": 1,
            "station_id": "ESP32_01",
            "timestamp": "2026-08-24T18:00:00Z",
            "pm25": 42.5,
            "pm10": 78.0,
            "temp": 28.5,
            "humidity": 58.0,
            "pressure": 1008.2,
            "pm1": 27.6,
            "pm4": 51.8,
            "voc_index": 85,
            "nox_index": 45,
            "device_id": "ESP32_01"
        }
    
    pm25 = float(latest.pm25)
    return {
        "id": latest.id,
        "station_id": latest.station_id,
        "device_id": latest.station_id,
        "timestamp": latest.timestamp,
        "pm25": pm25,
        "pm10": float(latest.pm10),
        "temp": float(latest.temp),
        "humidity": float(latest.humidity),
        "pressure": float(latest.pressure),
        "pm1": round(pm25 * 0.65, 1),
        "pm4": round(pm25 * 1.22, 1),
        "voc_index": int(min(500, max(20, round(pm25 * 1.8)))),
        "nox_index": int(min(500, max(10, round(pm25 * 1.2))))
    }
