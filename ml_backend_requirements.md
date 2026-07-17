# VayuBudhi ML Backend Integration Requirements

This document outlines exactly what the backend needs to implement to serve the Machine Learning models (Forecast and Source Attribution) to the Next.js frontend dashboard.

## 1. ML Model Artifacts

The trained ML models are serialized and saved in the following directory:
- **Location:** `ml_model/data/`
- **Files:**
  - `forecaster.pkl`: XGBoost Regressor (predicts AQI 24 hours out with conformal bounds).
  - `classifier.pkl`: Random Forest Classifier (predicts pollution source with conformal sets).
- **How to Load in Python:** Use `joblib.load('ml_model/data/forecaster.pkl')`

## 2. Model Input Features

To get a prediction from either model, the backend must construct a Pandas DataFrame with exactly these **7 columns in this specific order**:

1. `pm25` (float) - Current fine particulate matter
2. `pm10` (float) - Current coarse particulate matter
3. `temp` (float) - Temperature in Celsius
4. `humidity` (float) - Relative humidity percentage
5. `pressure` (float) - Atmospheric pressure in hPa
6. `wind_speed` (float) - Wind speed in m/s
7. `pblh` (float) - Planetary Boundary Layer Height in meters

*Note: The frontend expects the backend to calculate the **Ventilation Index** (`pblh * wind_speed`) to return in the API response, even though it is not passed directly into the model.*

---

## 3. Required API Endpoints & Schemas

The frontend dashboard specifically polls these schemas (defined in `backend/app/schemas.py`). 

### Endpoint A: POST `/api/forecast`
**Purpose:** Returns the predicted PM2.5 levels exactly 24 hours in the future, wrapped in a 90% confidence interval.
**Expected JSON Response:**
```json
{
  "horizon_h": 24,
  "point": 154.2,
  "interval": [130.0, 178.4],
  "ventilation_index": 1250.0
}
```

### Endpoint B: POST `/api/attribute`
**Purpose:** Returns a conformal prediction set of likely pollution sources.
**Expected JSON Response:**
```json
{
  "prediction_set": ["vehicular", "industrial"],
  "set_size": 2,
  "confidence": 0.90,
  "probabilities": {
    "vehicular": 0.60,
    "industrial": 0.35,
    "dust": 0.05
  }
}
```

## 4. Implementation Steps for Backend

1. Install `joblib`, `xgboost`, `scikit-learn`, and `mapie` in the backend environment.
2. In `app/main.py`, fix the current import bug (change `from database import engine` to `from app.database import engine`).
3. Create a service file (e.g., `ml_service.py`) that loads the `.pkl` files once on startup.
4. Wire the POST endpoints in FastAPI to accept telemetry JSON, convert it to a 1-row DataFrame, run `model.predict()`, and format it into the Pydantic schemas above.
