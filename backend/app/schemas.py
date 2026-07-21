from pydantic import BaseModel, Field
from typing import List, Dict

# Contract 1: Sensor -> Backend
class SensorReading(BaseModel):
    station_id: str = Field(..., examples=["esp32_01"])
    timestamp: str = Field(..., examples=["2026-07-07T10:15:00Z"])
    pm25: float = Field(..., examples=[142.3])
    pm10: float = Field(..., examples=[168.9])
    temp: float = Field(..., examples=[31.2])
    humidity: float = Field(..., examples=[58.4])
    pressure: float = Field(..., examples=[1008.1])
    wind_speed: float = Field(default=3.0, examples=[2.5])
    pblh: float = Field(default=1000.0, examples=[800.0])

# Contract 2: ML -> Backend (Attribution)
class AttributionOutput(BaseModel):
    prediction_set: List[str] = Field(..., examples=[["biomass_burning"]])
    set_size: int = Field(..., examples=[1])
    confidence: float = Field(..., examples=[0.90])
    probabilities: Dict[str, float] = Field(..., examples=[{"biomass_burning": 0.82, "vehicular": 0.11}])
    geospatial_evidence: Dict[str, str] = Field(default=None, description="Correlated geospatial data from TomTom, NASA FIRMS, etc.")

# Contract 3: ML -> Backend/Frontend (Forecast)
class ForecastOutput(BaseModel):
    horizon_h: int = Field(..., examples=[24])
    point: float = Field(..., examples=[210.0])
    interval: List[float] = Field(..., examples=[[180.0, 245.0]])
    ventilation_index: float = Field(..., examples=[850.0])

# Contract 4: Dispersion Model
class DispersionPoint(BaseModel):
    lat: float
    lon: float
    aqi: float

class DispersionOutput(BaseModel):
    center_lat: float
    center_lon: float
    grid: List[DispersionPoint]

# Contract 5: Backend -> Frontend (Optimizer)
class RouteStop(BaseModel):
    source_id: str = Field(..., examples=["s7"])
    lat: float = Field(..., examples=[28.6])
    lon: float = Field(..., examples=[77.2])
    eta: str = Field(..., examples=["10:45"])
    action: str = Field(..., examples=["FULL_INSPECTION"])
    roi: float = Field(..., examples=[54.2])

class RoutePlan(BaseModel):
    route_id: str = Field(..., examples=["inspector_1"])
    stops: List[RouteStop]

# Ingest Response
class IngestResponse(BaseModel):
    status: str = Field(..., examples=["received"])

# Health Endpoint Response
class HealthStatus(BaseModel):
    status: str = Field(..., examples=["healthy"])
    database: str = Field(..., examples=["connected"])
