import os
import sys
import pickle
from typing import Dict, Any

# Add directory of this file to path to ensure relative imports of forecast/classifier work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Global cache for lazy loading of models
_forecaster = None
_classifier = None

def _load_models():
    global _forecaster, _classifier
    if _forecaster is None or _classifier is None:
        src_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(os.path.dirname(src_dir), "data")
        
        forecaster_path = os.path.join(data_dir, "forecaster.pkl")
        classifier_path = os.path.join(data_dir, "classifier.pkl")
        
        if not os.path.exists(forecaster_path) or not os.path.exists(classifier_path):
            raise FileNotFoundError(
                "Serialized model checkpoints not found. "
                "Please run `train.py` first to train and serialize the models."
            )
            
        with open(forecaster_path, "rb") as f:
            _forecaster = pickle.load(f)
        with open(classifier_path, "rb") as f:
            _classifier = pickle.load(f)

def get_forecast_inference(telemetry: Dict[str, Any]) -> Dict[str, Any]:
    """
    Accepts: Dict matching SensorReading (Contract 1) + environmental variables (wind_speed, pblh).
    Returns: Dict matching ForecastOutput (Contract 3) shape.
    """
    _load_models()
    
    # Extract keys with fallback defaults for robustness
    input_data = {
        "pm25": float(telemetry.get("pm25", 0.0)),
        "pm10": float(telemetry.get("pm10", 0.0)),
        "temp": float(telemetry.get("temp", 25.0)),
        "humidity": float(telemetry.get("humidity", 50.0)),
        "pressure": float(telemetry.get("pressure", 1013.0)),
        "wind_speed": float(telemetry.get("wind_speed", 3.0)),
        "pblh": float(telemetry.get("pblh", 1000.0))
    }
    
    return _forecaster.predict(input_data)

def get_attribution_inference(telemetry: Dict[str, Any]) -> Dict[str, Any]:
    """
    Accepts: Dict matching SensorReading (Contract 1) + environmental variables (wind_speed, pblh).
    Returns: Dict matching AttributionOutput (Contract 2) shape.
    """
    _load_models()
    
    # Extract keys with fallback defaults for robustness
    input_data = {
        "pm25": float(telemetry.get("pm25", 0.0)),
        "pm10": float(telemetry.get("pm10", 0.0)),
        "temp": float(telemetry.get("temp", 25.0)),
        "humidity": float(telemetry.get("humidity", 50.0)),
        "pressure": float(telemetry.get("pressure", 1013.0)),
        "wind_speed": float(telemetry.get("wind_speed", 3.0)),
        "pblh": float(telemetry.get("pblh", 1000.0))
    }
    
    return _classifier.predict(input_data)
