from pydantic import BaseModel, Field
from typing import List, Dict, Optional

# Contract 1: Sensor -> Backend
class SensorReading(BaseModel):
    station_id: Optional[str] = Field(default=None, examples=["esp32_01", "vayubudhi-s3-01"])
    device_id: Optional[str] = Field(default=None, examples=["vayubudhi-s3-01"])
    timestamp: Optional[str] = Field(default=None, examples=["2026-07-07T10:15:00Z"])
    pm25: float = Field(..., examples=[14.8])
    pm10: float = Field(..., examples=[26.3])
    temp: Optional[float] = Field(default=None, examples=[28.5])
    temperature: Optional[float] = Field(default=None, examples=[28.5])
    humidity: float = Field(..., examples=[62.0])
    pressure: float = Field(..., examples=[1008.4])
    voc_index: Optional[float] = Field(default=100.0, examples=[105.0])
    nox_index: Optional[float] = Field(default=1.0, examples=[1.0])
    wind_speed: float = Field(default=3.0, examples=[2.5])
    pblh: float = Field(default=1000.0, examples=[800.0])
    lat: float = Field(default=28.6139, examples=[28.6139])
    lon: float = Field(default=77.2090, examples=[77.2090])
    no2: float = Field(default=25.0, examples=[25.0])
    so2: float = Field(default=10.0, examples=[10.0])
    co: float = Field(default=1.0, examples=[1.0])
    o3: float = Field(default=35.0, examples=[35.0])

# Contract 2: ML -> Backend (Attribution)
class AttributionOutput(BaseModel):
    prediction_set: List[str] = Field(..., examples=[["biomass_burning"]])
    set_size: int = Field(..., examples=[1])
    confidence: float = Field(..., examples=[0.90])
    probabilities: Dict[str, float] = Field(..., examples=[{"biomass_burning": 0.82, "vehicular": 0.11}])
    geospatial_evidence: Optional[Dict[str, str]] = Field(default=None, description="Correlated geospatial data from TomTom, NASA FIRMS, etc.")
    gemini_summary: Optional[str] = Field(default=None, description="2-3 sentence AI summary of calculated evidence.")

class EvidenceSummaryRequest(BaseModel):
    station_name: str
    priority_rank: int = 1
    priority_score: int = 80
    aqi: int = 200
    pm25: float = 0.0
    pm10: float = 0.0
    pblh: float = 850.0
    wind_speed: float = 2.4
    ventilation_index: int = 2000
    dispersion_regime: str = "Restricted Dispersion"
    dominant_source: str = "Vehicular Traffic"
    confidence: int = 90
    traffic_pct: int = 45
    industry_pct: int = 30
    dust_pct: int = 25
    geospatial_summary: str = ""
    exposed_pop: int = 120000
    action: str = "FULL_INSPECTION"

class EvidenceSummaryResponse(BaseModel):
    summary: Optional[str] = None

# Contract 3: ML -> Backend/Frontend (Forecast)
class ForecastOutput(BaseModel):
    horizon_h: int = Field(..., examples=[72])
    points: List[float] = Field(..., examples=[[210.0, 215.0, 190.0]])
    intervals: List[List[float]] = Field(..., examples=[[[180.0, 245.0], [185.0, 250.0], [170.0, 210.0]]])
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

# New Contract: SHAP Explainability
class SHAPFeature(BaseModel):
    feature: str
    value: float

class SHAPOutput(BaseModel):
    horizon_h: int
    base_value: float
    features: List[SHAPFeature]

# New Contract: Intervention Simulation
class SimulationOutput(BaseModel):
    baseline_forecast: List[float]
    simulated_forecast: List[float]
    delta: List[float]

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
