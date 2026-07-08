from fastapi import APIRouter, status
from backend.app.models.schemas import SensorReading, AttributionOutput, ForecastOutput, RoutePlan

api_router = APIRouter()

@api_router.post("/ingest", status_code=status.HTTP_200_OK, summary="Ingest Sensor Readings (Contract 1)")
def ingest_reading(reading: SensorReading):
    """
    Ingests live telemetry from the ESP32 weather station.
    Accepts Contract 1 JSON shape.
    """
    # Empty logic / stub implementation for Day 1
    return {"status": "success", "message": "Telemetry received successfully"}

@api_router.get("/attribution", response_model=AttributionOutput, summary="Get Source Attribution (Contract 2)")
def get_attribution():
    """
    Returns the source apportionment classifier prediction.
    Outputs Contract 2 JSON shape.
    """
    # Stub response
    return {
        "prediction_set": ["biomass_burning"],
        "set_size": 1,
        "confidence": 0.90,
        "probabilities": {"biomass_burning": 0.82, "vehicular": 0.11}
    }

@api_router.get("/forecast", response_model=ForecastOutput, summary="Get AQI Forecast (Contract 3)")
def get_forecast():
    """
    Returns the 24h point and interval forecast.
    Outputs Contract 3 JSON shape.
    """
    # Stub response
    return {
        "horizon_h": 24,
        "point": 210.0,
        "interval": [180.0, 245.0],
        "ventilation_index": 850.0
    }

@api_router.post("/optimize", response_model=RoutePlan, summary="Optimize Inspection Routes (Contract 4)")
def optimize_routes():
    """
    Runs OR-Tools VRP optimization solver.
    Outputs Contract 4 JSON shape.
    """
    # Stub response
    return {
        "route_id": "inspector_1",
        "stops": [
            {
                "source_id": "s7",
                "lat": 28.6,
                "lon": 77.2,
                "eta": "10:45",
                "action": "FULL_INSPECTION",
                "roi": 54.2
            }
        ]
    }
