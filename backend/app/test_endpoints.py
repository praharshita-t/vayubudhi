import sys
import os

# Add the directory containing this script to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal, engine, Base
import models

# Ensure tables are clean for testing
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def test_health():
    response = client.get("/health")
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
        "pressure": 1008.1
    }
    response = client.post("/ingest", json=payload)
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
    response = client.get("/forecast")
    assert response.status_code == 200
    data = response.json()
    assert data["horizon_h"] == 24
    assert data["point"] == 210.0
    assert data["interval"] == [180.0, 245.0]
    assert data["ventilation_index"] == 850.0
    
    # Verify logged forecast in SQLite
    db = SessionLocal()
    forecast = db.query(models.Forecast).first()
    assert forecast is not None
    assert forecast.point == 210.0
    db.close()
    print("GET /forecast check passed.")

def test_attribution():
    response = client.get("/attribution")
    assert response.status_code == 200
    data = response.json()
    assert data["prediction_set"] == ["biomass_burning"]
    assert data["set_size"] == 1
    assert data["confidence"] == 0.90
    assert data["probabilities"] == {"biomass_burning": 0.82, "vehicular": 0.11}
    
    # Verify logged attribution in SQLite
    db = SessionLocal()
    attr = db.query(models.AttributionResult).first()
    assert attr is not None
    assert attr.confidence == 0.90
    db.close()
    print("GET /attribution check passed.")

def test_optimize():
    response = client.get("/optimize")
    assert response.status_code == 200
    data = response.json()
    assert data["route_id"] == "inspector_1"
    assert len(data["stops"]) == 1
    stop = data["stops"][0]
    assert stop["source_id"] == "s7"
    assert stop["lat"] == 28.6
    assert stop["lon"] == 77.2
    assert stop["eta"] == "10:45"
    assert stop["action"] == "FULL_INSPECTION"
    assert stop["roi"] == 54.2
    
    # Verify route and ROI logs in SQLite
    db = SessionLocal()
    route = db.query(models.EnforcementRoute).filter_by(route_id="inspector_1").first()
    assert route is not None
    assert len(route.stops) == 1
    
    roi = db.query(models.ROIResult).filter_by(route_id="inspector_1").first()
    assert roi is not None
    assert roi.roi == 54.2
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
