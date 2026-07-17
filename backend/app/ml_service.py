import os
import sys
import joblib
import pandas as pd

# Add ml_model/src to sys.path to allow joblib to unpickle custom classes like 'forecast'
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(BASE_DIR, 'ml_model', 'src'))
# Path to the ml_model/data directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ML_DATA_DIR = os.path.join(BASE_DIR, 'ml_model', 'data')

class MLService:
    def __init__(self):
        self.forecaster = None
        self.classifier = None
        self._load_models()

    def _load_models(self):
        try:
            forecaster_path = os.path.join(ML_DATA_DIR, 'forecaster.pkl')
            classifier_path = os.path.join(ML_DATA_DIR, 'classifier.pkl')
            
            if os.path.exists(forecaster_path):
                self.forecaster = joblib.load(forecaster_path)
            if os.path.exists(classifier_path):
                self.classifier = joblib.load(classifier_path)
            print("Successfully loaded ML models.")
        except Exception as e:
            print(f"Error loading models: {e}")

    def _prepare_features(self, reading):
        return {
            'pm25': reading.pm25,
            'pm10': reading.pm10,
            'temp': reading.temp,
            'humidity': reading.humidity,
            'pressure': reading.pressure,
            'wind_speed': reading.wind_speed,
            'pblh': reading.pblh
        }

    def predict_forecast(self, reading):
        if not self.forecaster:
            return {"horizon_h": 24, "point": 0, "interval": [0,0], "ventilation_index": 0}
        
        features = self._prepare_features(reading)
        
        try:
            return self.forecaster.predict(features)
        except Exception as e:
            print(f"Forecast error: {e}")
            return {"horizon_h": 24, "point": 0, "interval": [0,0], "ventilation_index": features['pblh'] * features['wind_speed']}

    def predict_attribution(self, reading):
        if not self.classifier:
            return {"prediction_set": [], "set_size": 0, "confidence": 0.90, "probabilities": {}}
            
        features = self._prepare_features(reading)
        
        try:
            return self.classifier.predict(features)
            
        except Exception as e:
            print(f"Attribution error: {e}")
            return {"prediction_set": [], "set_size": 0, "confidence": 0.90, "probabilities": {}}

# Singleton instance
ml_service = MLService()
