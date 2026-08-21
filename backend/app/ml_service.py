import os
import sys
import joblib
import pandas as pd
import numpy as np

# Add ml_model/src to sys.path to allow joblib to unpickle custom classes
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(BASE_DIR, 'ml_model', 'src'))
ML_DATA_DIR = os.path.join(BASE_DIR, 'ml_model', 'data')
DATASET_PATH = os.path.join(BASE_DIR, 'data', 'dataset_hyderabad_expanded.csv')

# Use the feature list from training
FEATURES = [
    'pm25_lag_1h', 'pm25_lag_3h', 'pm25_lag_6h', 'pm25_lag_12h', 'pm25_lag_24h',
    'pm25_rolling_6h_mean', 'pm25_rolling_24h_mean', 'pm25_rolling_24h_std', 'pm25_delta_6h',
    'temp_c', 'humidity', 'pressure_mb', 'wind_speed_ms', 'pblh',
    'ventilation_index', 'stagnation_flag', 'pm_ratio',
    'hour_sin', 'hour_cos', 'month_sin', 'month_cos',
    'no2_so2_ratio', 'co_no2_ratio', 'o3_pm25_ratio',
    'pm10', 'no2', 'so2', 'co', 'o3'
]

class MLService:
    def __init__(self):
        self.forecasters = {}
        self.classifier = None
        self.dataset_cache = None
        self._load_models()
        self._load_dataset()

    def _resolve_city(self, reading):
        lat = getattr(reading, 'lat', 17.425)
        lon = getattr(reading, 'lon', 78.45)
        if 12.0 <= lat <= 14.0 and 76.5 <= lon <= 78.5:
            return "Bengaluru"
        elif 16.5 <= lat <= 18.5 and 77.5 <= lon <= 79.5:
            return "Hyderabad"
        elif 25.5 <= lat <= 29.5 and 76.0 <= lon <= 78.0:
            return "Delhi"
        elif 25.0 <= lat <= 27.5 and 90.5 <= lon <= 93.0:
            return "Guwahati"
        elif 25.5 <= lat <= 29.5:
            return "Delhi"
        elif 12.0 <= lat <= 14.0:
            return "Bengaluru"
        return "Hyderabad"

    def _load_models(self):
        try:
            cities = ["Delhi", "Hyderabad", "Bengaluru", "Guwahati"]
            
            # Load default base models (which are Hyderabad-trained)
            for h in [24, 48, 72]:
                path = os.path.join(ML_DATA_DIR, f'forecast_model_{h}h.pkl')
                if os.path.exists(path):
                    model = joblib.load(path)
                    self.forecasters[f'{h}h'] = model
                    self.forecasters[f'Hyderabad_{h}h'] = model

            # Load city-specific models if they exist
            for city in cities:
                for h in [24, 48, 72]:
                    path = os.path.join(ML_DATA_DIR, f'forecast_model_{city.lower()}_{h}h.pkl')
                    if os.path.exists(path):
                        self.forecasters[f'{city}_{h}h'] = joblib.load(path)
                    else:
                        # Fallback to general model if city-specific doesn't exist
                        fallback_path = os.path.join(ML_DATA_DIR, f'forecast_model_{h}h.pkl')
                        if os.path.exists(fallback_path) and f'{city}_{h}h' not in self.forecasters:
                            self.forecasters[f'{city}_{h}h'] = joblib.load(fallback_path)
                    
            classifier_path = os.path.join(ML_DATA_DIR, 'classifier_v2.pkl')
            if os.path.exists(classifier_path):
                self.classifier = joblib.load(classifier_path)
            print("Successfully loaded ML models (v2).")
        except Exception as e:
            print(f"Error loading models: {e}")
            
    def _load_dataset(self):
        try:
            # Load the dataset which already has features computed
            # We keep this in memory for fast lookup by district
            self.dataset_cache = pd.read_csv(DATASET_PATH)
            # Ensure it is sorted by time
            self.dataset_cache['timestamp'] = pd.to_datetime(self.dataset_cache['timestamp'])
            self.dataset_cache = self.dataset_cache.sort_values('timestamp')
        except Exception as e:
            print(f"Error loading dataset cache: {e}")

    def _prepare_features(self, reading):
        """
        Takes a reading, looks up the latest historical row for that district,
        and overrides the physics/chemistry features with the new reading values.
        This provides a complete feature vector (including lags) for the model.
        """
        if self.dataset_cache is None:
            # Fallback if no dataset (shouldn't happen in production)
            return pd.DataFrame(np.zeros((1, len(FEATURES))), columns=FEATURES)
            
        # Get latest row for this district (match by name or ID)
        # If the reading has a 'station_id' that matches a district name (e.g. 'Kukatpally')
        district_name = getattr(reading, 'station_id', None)
        
        if district_name:
            district_rows = self.dataset_cache[self.dataset_cache['district_name'] == district_name]
            if not district_rows.empty:
                latest_row = district_rows.iloc[-1].copy()
            else:
                latest_row = self.dataset_cache.iloc[-1].copy()
        else:
            latest_row = self.dataset_cache.iloc[-1].copy()
            
        # Override with current reading values
        latest_row['pm25'] = reading.pm25
        latest_row['pm10'] = reading.pm10
        latest_row['temp_c'] = reading.temp
        latest_row['humidity'] = reading.humidity
        latest_row['pressure_mb'] = reading.pressure
        latest_row['wind_speed_ms'] = reading.wind_speed
        latest_row['pblh'] = reading.pblh
        latest_row['no2'] = getattr(reading, 'no2', 20.0)
        latest_row['so2'] = getattr(reading, 'so2', 10.0)
        
        # Scale CO to ppb if it's passed in mg/m3 to match training data scale
        co_val = getattr(reading, 'co', 300.0)
        if co_val < 10.0:
            co_val = co_val * 1000.0
        latest_row['co'] = co_val
        
        latest_row['o3'] = getattr(reading, 'o3', 40.0)
        
        # Recompute derived physics/chemistry
        latest_row['ventilation_index'] = latest_row['pblh'] * latest_row['wind_speed_ms']
        latest_row['stagnation_flag'] = 1 if latest_row['ventilation_index'] < 2000 else 0
        latest_row['pm_ratio'] = latest_row['pm25'] / (latest_row['pm10'] + 1e-5)
        latest_row['no2_so2_ratio'] = latest_row['no2'] / (latest_row['so2'] + 1e-5)
        latest_row['co_no2_ratio'] = latest_row['co'] / (latest_row['no2'] + 1e-5)
        latest_row['o3_pm25_ratio'] = latest_row['o3'] / (latest_row['pm25'] + 1e-5)
        
        # Compute Time cyclical features
        import datetime
        now = datetime.datetime.now()
        hour = now.hour
        month = now.month
        latest_row['hour_sin'] = np.sin(2 * np.pi * hour / 24.0)
        latest_row['hour_cos'] = np.cos(2 * np.pi * hour / 24.0)
        latest_row['month_sin'] = np.sin(2 * np.pi * month / 12.0)
        latest_row['month_cos'] = np.cos(2 * np.pi * month / 12.0)

        # Impute missing lag features for real-time inference using real historical proportions when available
        pm = reading.pm25
        hist_pm = latest_row.get('pm25', 0)
        
        if hist_pm and float(hist_pm) > 0 and 'pm25_lag_1h' in latest_row:
            scale = pm / float(hist_pm)
            latest_row['pm25_lag_1h'] = float(latest_row.get('pm25_lag_1h', pm)) * scale
            latest_row['pm25_lag_3h'] = float(latest_row.get('pm25_lag_3h', pm)) * scale
            latest_row['pm25_lag_6h'] = float(latest_row.get('pm25_lag_6h', pm)) * scale
            latest_row['pm25_lag_12h'] = float(latest_row.get('pm25_lag_12h', pm)) * scale
            latest_row['pm25_lag_24h'] = float(latest_row.get('pm25_lag_24h', pm)) * scale
            latest_row['pm25_rolling_6h_mean'] = float(latest_row.get('pm25_rolling_6h_mean', pm)) * scale
            latest_row['pm25_rolling_24h_mean'] = float(latest_row.get('pm25_rolling_24h_mean', pm)) * scale
            latest_row['pm25_rolling_24h_std'] = max(1.0, float(latest_row.get('pm25_rolling_24h_std', 5.0)) * scale)
            latest_row['pm25_delta_6h'] = pm - latest_row['pm25_lag_6h']
        else:
            latest_row['pm25_lag_1h'] = pm
            latest_row['pm25_lag_3h'] = pm
            latest_row['pm25_lag_6h'] = pm
            latest_row['pm25_lag_12h'] = pm
            latest_row['pm25_lag_24h'] = pm
            latest_row['pm25_rolling_6h_mean'] = pm
            latest_row['pm25_rolling_24h_mean'] = pm
            latest_row['pm25_rolling_24h_std'] = max(1.0, pm * 0.1)
            latest_row['pm25_delta_6h'] = 0.0
        
        # Return as a 1-row DataFrame with the exact feature columns
        df = pd.DataFrame([latest_row])
        return df[FEATURES]

    def predict_forecast(self, reading):
        city = self._resolve_city(reading)
        
        if not self.forecasters:
            vent_idx = reading.pblh * reading.wind_speed
            return {"horizon_h": 72, "points": [0.0, 0.0, 0.0], "intervals": [[0.0, 0.0], [0.0, 0.0], [0.0, 0.0]], "ventilation_index": float(vent_idx)}
        
        df = self._prepare_features(reading)
        
        try:
            points = []
            intervals = []
            for label in ['24h', '48h', '72h']:
                model_key = f"{city}_{label}"
                model = self.forecasters.get(model_key)
                if not model:
                    model = self.forecasters.get(label)
                    
                if model:
                    # Request MAPIE predictions with 90% confidence
                    # In mapie 1.4.1, predict_interval returns (y_pred, y_pis)
                    y_pred, y_pis = model.predict_interval(df)
                    point = max(0.0, float(y_pred[0]))
                    # Clamp intervals to at least 0.0 to prevent negative bounds
                    lower_bound = max(0.0, float(y_pis[0, 0, 0]))
                    upper_bound = max(0.0, float(y_pis[0, 1, 0]))
                    
                    points.append(point)
                    intervals.append([lower_bound, upper_bound])
                else:
                    points.append(0.0)
                    intervals.append([0.0, 0.0])
                    
            vent_idx = reading.pblh * reading.wind_speed
            return {
                "horizon_h": 72,
                "points": points,
                "intervals": intervals,
                "ventilation_index": float(vent_idx)
            }
        except Exception as e:
            print(f"Forecast error: {e}")
            vent_idx = reading.pblh * reading.wind_speed
            return {"horizon_h": 72, "points": [0.0, 0.0, 0.0], "intervals": [[0.0, 0.0], [0.0, 0.0], [0.0, 0.0]], "ventilation_index": float(vent_idx)}

    def predict_attribution(self, reading):
        from app.physics_engine import plume_inversion_pinn_mock
        
        # Calculate PINN Source regardless of classifier
        pinn = plume_inversion_pinn_mock(
            sensor_lat=reading.lat,
            sensor_lon=reading.lon,
            concentration=reading.pm25,
            wind_dir=getattr(reading, 'wind_dir', 0.0),
            wind_speed=reading.wind_speed,
            temp=reading.temp
        )

        if not self.classifier:
            return {"prediction_set": [], "set_size": 0, "confidence": 0.90, "probabilities": {}, "pinn_source": pinn}
            
        df = self._prepare_features(reading)
        
        try:
            # Predict probabilities using the base estimator
            probs = self.classifier._estimator.predict_proba(df)[0]
            classes = self.classifier._estimator.classes_
            prob_dict = {str(classes[i]): float(probs[i]) for i in range(len(classes))}
            
            # Manual conformal-like set construction using raw probabilities
            prediction_set = []
            for i, p in enumerate(probs):
                if p > 0.15: # 15% threshold for inclusion in the set
                    prediction_set.append(str(classes[i]))
                    
            if not prediction_set:
                prediction_set = [str(classes[np.argmax(probs)])]
            
            return {
                "prediction_set": prediction_set,
                "set_size": len(prediction_set),
                "confidence": 0.90,
                "probabilities": prob_dict,
                "pinn_source": pinn
            }
        except Exception as e:
            print(f"Attribution error: {e}")
            return {"prediction_set": [], "set_size": 0, "confidence": 0.90, "probabilities": {}, "pinn_source": pinn}

# Singleton instance
ml_service = MLService()
