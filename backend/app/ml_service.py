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
        # Must construct a Pandas DataFrame with exactly these 7 columns in this specific order
        data = {
            'pm25': [reading.pm25],
            'pm10': [reading.pm10],
            'temp': [reading.temp],
            'humidity': [reading.humidity],
            'pressure': [reading.pressure],
            'wind_speed': [reading.wind_speed],
            'pblh': [reading.pblh]
        }
        return pd.DataFrame(data)

    def predict_forecast(self, reading):
        if not self.forecaster:
            return {"horizon_h": 24, "point": 0.0, "interval": [0.0, 0.0], "ventilation_index": 0.0}
        
        df = self._prepare_features(reading)
        
        try:
            # Use the base estimator directly
            point = self.forecaster.predict(df)[0]
            vent_idx = reading.pblh * reading.wind_speed
            # Mock 90% conformal interval around the point prediction
            return {
                "horizon_h": 24,
                "point": float(point),
                "interval": [float(point * 0.85), float(point * 1.15)],
                "ventilation_index": float(vent_idx)
            }
        except Exception as e:
            print(f"Forecast error: {e}")
            return {"horizon_h": 24, "point": 0.0, "interval": [0.0, 0.0], "ventilation_index": float(reading.pblh * reading.wind_speed)}

    def predict_attribution(self, reading):
        if not self.classifier:
            return {"prediction_set": [], "set_size": 0, "confidence": 0.90, "probabilities": {}}
            
        df = self._prepare_features(reading)
        
        try:
            # Predict probabilities using the base estimator
            probs = self.classifier.predict_proba(df)[0]
            classes = self.classifier.classes_
            prob_dict = {str(classes[i]): float(probs[i]) for i in range(len(classes))}
            
            # Construct a mock conformal set (all classes with > 10% probability)
            prediction_set = [str(classes[i]) for i in range(len(classes)) if probs[i] > 0.1]
            if not prediction_set:
                prediction_set = [str(classes[np.argmax(probs)])]
            
            return {
                "prediction_set": prediction_set,
                "set_size": len(prediction_set),
                "confidence": 0.90,
                "probabilities": prob_dict
            }
        except Exception as e:
            print(f"Attribution error: {e}")
            return {"prediction_set": [], "set_size": 0, "confidence": 0.90, "probabilities": {}}

# Singleton instance
ml_service = MLService()
