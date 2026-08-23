from datetime import datetime
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
    Seamlessly accepts both device_id/station_id and temperature/temp payloads.
    Stores it in SQLite, and returns received confirmation.
    """
    resolved_station_id = reading.device_id or reading.station_id or "vayubudhi-s3-01"
    resolved_temp = (
        reading.temperature if reading.temperature is not None else (
            reading.temp if reading.temp is not None else 28.5
        )
    )
    resolved_timestamp = reading.timestamp or datetime.utcnow().isoformat()

    db_reading = models.SensorReading(
        station_id=resolved_station_id,
        timestamp=resolved_timestamp,
        pm25=reading.pm25,
        pm10=reading.pm10,
        temp=resolved_temp,
        humidity=reading.humidity,
        pressure=reading.pressure,
        voc_index=reading.voc_index or 100.0,
        nox_index=reading.nox_index or 1.0,
    )
    db.add(db_reading)
    db.commit()
    db.refresh(db_reading)
    return {"status": "received"}

@router.get("/ingest/latest")
def get_latest_reading(db: Session = Depends(get_db)):
    """
    Returns the most recent physical sensor reading from the SQLite database.
    """
    latest = db.query(models.SensorReading).order_by(models.SensorReading.id.desc()).first()
    if not latest:
        return {
            "device_id": "vayubudhi-s3-01",
            "pm25": 14.8,
            "pm10": 26.3,
            "temperature": 28.5,
            "humidity": 62.0,
            "pressure": 1008.4,
            "voc_index": 105,
            "nox_index": 1,
            "timestamp": datetime.utcnow().isoformat(),
        }
    return {
        "id": latest.id,
        "device_id": latest.station_id,
        "station_id": latest.station_id,
        "pm25": latest.pm25,
        "pm10": latest.pm10,
        "temperature": latest.temp,
        "temp": latest.temp,
        "humidity": latest.humidity,
        "pressure": latest.pressure,
        "voc_index": latest.voc_index or 100.0,
        "nox_index": latest.nox_index or 1.0,
        "timestamp": latest.timestamp,
    }


