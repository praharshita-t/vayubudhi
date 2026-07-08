from pydantic import BaseModel, Field
from typing import List, Dict

# Contract 1: Sensor -> Backend
class SensorReading(BaseModel):
    station_id: str = Field(..., example="esp32_01")
    timestamp: str = Field(..., example="2026-07-07T10:15:00Z")
    pm25: float = Field(..., example=142.3)
    pm10: float = Field(..., example=168.9)
    temp: float = Field(..., example=31.2)
    humidity: float = Field(..., example=58.4)
    pressure: float = Field(..., example=1008.1)

# Contract 2: ML -> Backend (Attribution)
class AttributionOutput(BaseModel):
    prediction_set: List[str] = Field(..., example=["biomass_burning"])
    set_size: int = Field(..., example=1)
    confidence: float = Field(..., example=0.90)
    probabilities: Dict[str, float] = Field(..., example={"biomass_burning": 0.82, "vehicular": 0.11})

# Contract 3: ML -> Backend/Frontend (Forecast)
class ForecastOutput(BaseModel):
    horizon_h: int = Field(..., example=24)
    point: float = Field(..., example=210.0)
    interval: List[float] = Field(..., example=[180.0, 245.0])
    ventilation_index: float = Field(..., example=850.0)

# Contract 4: Backend -> Frontend (Optimizer)
class RouteStop(BaseModel):
    source_id: str = Field(..., example="s7")
    lat: float = Field(..., example=28.6)
    lon: float = Field(..., example=77.2)
    eta: str = Field(..., example="10:45")
    action: str = Field(..., example="FULL_INSPECTION")
    roi: float = Field(..., example=54.2)

class RoutePlan(BaseModel):
    route_id: str = Field(..., example="inspector_1")
    stops: List[RouteStop]
