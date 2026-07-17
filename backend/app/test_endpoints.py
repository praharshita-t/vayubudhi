import sys
import os

# Add the backend directory (parent of app) to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, engine, Base
from app import models

# Ensure tables are clean for testing
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    print("Health check passed.")

def test_ingest():
    payload = {
        "station_id": "esp32_01",
        "timestamp": "2026-07-07T10:15:00Z",
        "pm25": 142.3,
        "pm10": 168.9,
        "temp": 31.2,
        "humidity": 58.4,
        "pressure": 1008.1,
        "wind_speed": 2.5,
        "pblh": 800.0
    }
    response = client.post("/api/ingest", json=payload)
    assert response.status_code == 200
    assert response.json() == {"status": "received"}
    
    # Verify insertion into SQLite
    db = SessionLocal()
    reading = db.query(models.SensorReading).filter_by(station_id="esp32_01").first()
    assert reading is not None
    assert reading.pm25 == 142.3
    db.close()
    print("POST /ingest check passed.")

def test_forecast():
    payload = {
        "station_id": "esp32_01",
        "timestamp": "2026-07-07T10:15:00Z",
        "pm25": 142.3,
        "pm10": 168.9,
        "temp": 31.2,
        "humidity": 58.4,
        "pressure": 1008.1,
        "wind_speed": 2.5,
        "pblh": 800.0
    }
    response = client.post("/api/forecast", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["horizon_h"] == 24
    
    # Verify logged forecast in SQLite
    db = SessionLocal()
    forecast = db.query(models.Forecast).first()
    assert forecast is not None
    db.close()
    print("POST /api/forecast check passed.")

def test_attribution():
    payload = {
        "station_id": "esp32_01",
        "timestamp": "2026-07-07T10:15:00Z",
        "pm25": 142.3,
        "pm10": 168.9,
        "temp": 31.2,
        "humidity": 58.4,
        "pressure": 1008.1,
        "wind_speed": 2.5,
        "pblh": 800.0
    }
    response = client.post("/api/attribution", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    # Verify logged attribution in SQLite
    db = SessionLocal()
    attr = db.query(models.AttributionResult).first()
    assert attr is not None
    db.close()
    print("POST /api/attribution check passed.")

def test_optimize():
    response = client.get("/api/optimize")
    assert response.status_code == 200
    data = response.json()
    assert data["route_id"] == "inspector_1"
    assert len(data["stops"]) == 1
    stop = data["stops"][0]
    assert stop["source_id"] == "S01"
    assert round(stop["lat"], 4) == 28.6469
    assert round(stop["lon"], 4) == 77.3164
    assert stop["eta"] == "09:23"
    assert stop["action"] == "FULL_INSPECTION"
    assert stop["roi"] == 210.2
    
    # Verify route and ROI logs in SQLite
    db = SessionLocal()
    route = db.query(models.EnforcementRoute).filter_by(route_id="inspector_1").first()
    assert route is not None
    assert len(route.stops) == 1
    
    roi = db.query(models.ROIResult).filter_by(route_id="inspector_1").first()
    assert roi is not None
    assert roi.roi == 210.2
    
    # Verify van and drone routes were computed and logged as well
    van_route = db.query(models.EnforcementRoute).filter_by(route_id="van_1").first()
    assert van_route is not None
    assert len(van_route.stops) == 3
    
    drone_route = db.query(models.EnforcementRoute).filter_by(route_id="drone_1").first()
    assert drone_route is not None
    # Corrected to 1: S09 is too far and cannot be visited within the drone's 45-min sortie limit
    assert len(drone_route.stops) == 1
    
    db.close()
    print("GET /optimize check passed.")


if __name__ == "__main__":
    print("Running tests...")
    test_health()
    test_ingest()
    test_forecast()
    test_attribution()
    test_optimize()
    print("All tests completed successfully!")
