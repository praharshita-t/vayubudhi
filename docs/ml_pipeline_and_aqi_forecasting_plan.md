# VayuBudhi ML Pipeline, AQI Forecasting & PBLH Blueprint

> **System Audit & Technical Action Plan**  
> Focus: ML Pipeline Architecture, Hyderabad District Dataset Expansion (33 Districts), Atmospheric Physics (PBLH & Ventilation Index), Multi-Horizon Forecasting (24/48/72h), and MAPIE Conformal Uncertainty Calibration.

---

## 1. Audit Review: Current ML & Forecasting Limitations

Following a rigorous audit of the existing repository files (`VayuBudhi2.0_plan.md`, `gap_analysis1.md`, `ml_model/src/train_models.py`, `fetch_pblh.py`, and `dataset.csv`), the following critical deficiencies were identified in the current machine learning pipeline:

| Component | Current State | Audit Finding / Fatal Flaw | Proposed Upgrade |
|---|---|---|---|
| **Geospatial Resolution** | 4 Hyderabad stations (Kompally, HCU, Sanathnagar, Zoo Park) | Spatial coverage is too coarse. Cannot model district-level microclimates across Hyderabad's 33 districts / GHMC zones. | Expand dataset to cover all 33 Hyderabad districts / GHMC administrative zones using CPCB, Open-Meteo ERA5, and spatial interpolation. |
| **Dataset Size & Sampling** | ~700 rows in `dataset.csv` | Far too small for production ML across seasons, weather patterns, and diurnal cycles. | Build a 50,000+ row spatio-temporal dataset covering 2+ years of hourly data across all target districts. |
| **PBLH Integration** | Static daily average fetched via `fetch_pblh.py` | Ignores diurnal boundary layer expansion/collapse cycles (e.g. nocturnal inversion trapping vs daytime thermal mixing). | Implement dynamic hourly PBLH tracking from ERA5 reanalysis and derive the **Ventilation Index ($VI = \text{PBLH} \times \text{Wind Speed}$)**. |
| **Feature Engineering** | 7 raw instant features (`pm25`, `pm10`, `temp`, `humidity`, `pressure`, `wind_speed`, `pblh`) | No temporal lags ($t-1, t-6, t-24$), no spatial lags (neighboring districts), no cyclic time encodings (hour/month $\sin/\cos$). | Implement a robust Feature Store pipeline with temporal rolling windows, spatial KNN lags, and cyclic encodings. |
| **Model Validation** | Metrics in frontend are hardcoded constants; `validation.py` functions never executed | No automated script evaluates RMSE, MAE, or $R^2$ against a **Persistence Baseline** ($AQI_{t+h} = AQI_t$). | Implement an automated model evaluation engine comparing XGBoost/LightGBM/CatBoost against persistence baselines. |
| **Conformal Prediction** | Basic `SplitConformalRegressor` setup in training, but backend route uses fake probability thresholds (`probs > 0.1`) | The serving layer bypasses real conformal prediction intervals, breaking the 90% statistical coverage guarantee. | Standardize `MapieRegressor` and `MapieClassifier` end-to-end with real pre-calibrated prediction intervals $[AQI_{\text{lower}}, AQI_{\text{upper}}]$. |
| **Model Diversity** | Single XGBoost model | No hyperparameter tuning (Optuna), no model comparisons, no stacked ensembles. | Build a multi-model benchmark suite (XGBoost, LightGBM, CatBoost, Weighted Ensemble). |

---

## 2. Dataset Expansion Strategy: Hyderabad 33-District Engine

### 2.1 The Spatial Coverage Gap
The existing `dataset.csv` isolates Hyderabad into only **4 monitoring points** (Kompally, Hyderabad Central University, Sanathnagar, and Zoo Park). Hyderabad covers over $650 \ \text{km}^2$ across **33 administrative districts / GHMC zones** with vastly different pollution profiles (e.g., heavy industrial exhaust in Patancheru vs high vehicular traffic in Madhapur/Gachibowli vs commercial dust in Charminar).

### 2.2 Target Hyderabad Districts / Zones
The expanded dataset will cover all key districts and zones in the Greater Hyderabad region:

```
Hyderbad 33 District / Zone Matrix:
├── IT & Commercial Hubs:  Gachibowli, Madhapur, Hitec City, Jubilee Hills, Banjara Hills, Begumpet
├── Industrial Corridors: Patancheru, Jeedimetla, Balanagar, Kattedan, Uppal, Cherlapally
├── High-Density Urban:   Charminar, Khairatabad, Secunderabad, Kukatpally, Serilingampally, LB Nagar
├── Transit & Peripheral: Shamshabad (Airport), Rajendranagar, Mehdipatnam, Tarnaka, Alwal, Quthbullapur,
│                         Malkajgiri, Hayathnagar, Ghatkesar, Ibrahimpatnam, Medchal, Shamirpet,
│                         Maheshwaram, Kandukur, Shankarpally
```

### 2.3 Multi-Source Data Acquisition Pipeline (`fetch_hyderabad_district_data.py`)
To build an enterprise-grade dataset without physical hardware constraints:
1. **Official CPCB / TSPCB Open Data**: Pull real-time and historical hourly CAAQMS readings for official stations (Sanathnagar, Zoo Park, IDA Pashamylaram, ICRISAT Patancheru, BHEL Ramachandrapuram, HCU, University of Hyderabad, Central University, Kompally).
2. **Open-Meteo Air Quality & ERA5 Reanalysis API**: Fetch historical hourly pollutant concentrations ($PM_{2.5}, PM_{10}, NO_2, SO_2, CO, O_3$) and meteorological variables for lat/lon centroids of all 33 districts.
3. **Spatial Kriging & Inverse Distance Weighting (IDW)**: Apply spatial interpolation to estimate baseline pollutant concentrations for unmonitored peripheral districts using known station vectors and satellite Aerosol Optical Depth (AOD) proxies.

### 2.4 Expanded Dataset Schema Specification
Every row in `dataset_hyderabad_expanded.csv` will follow this strict structure:

| Field Name | Type | Description | Unit / Format |
|---|---|---|---|
| `timestamp` | ISO8601 | Hourly timestamp | `YYYY-MM-DDTHH:MM:SSZ` |
| `district_id` | String | District identifier | e.g., `HYD_GACHIBOWLI` |
| `district_name` | String | Human readable district name | e.g., `Gachibowli` |
| `latitude` | Float | Centroid latitude | e.g., `17.4401` |
| `longitude` | Float | Centroid longitude | e.g., `78.3489` |
| `pm25` | Float | $PM_{2.5}$ concentration | $\mu g/m^3$ |
| `pm10` | Float | $PM_{10}$ concentration | $\mu g/m^3$ |
| `no2` | Float | Nitrogen Dioxide | $\mu g/m^3$ |
| `so2` | Float | Sulfur Dioxide | $\mu g/m^3$ |
| `co` | Float | Carbon Monoxide | $mg/m^3$ |
| `o3` | Float | Ozone | $\mu g/m^3$ |
| `temp_c` | Float | Ambient Temperature | $^\circ C$ |
| `humidity` | Float | Relative Humidity | $\%$ |
| `pressure_mb` | Float | Atmospheric Pressure | $hPa$ |
| `wind_speed_ms` | Float | Wind Speed at 10m | $m/s$ |
| `wind_direction_deg`| Float | Wind Direction | Degrees ($0-360^\circ$) |
| `pblh` | Float | Planetary Boundary Layer Height | Meters ($m$) |
| `ventilation_index`| Float | $VI = \text{PBLH} \times \text{wind\_speed}$ | $m^2/s$ |
| `aqi_in` | Integer | Calculated Indian NAQI | Index ($0-500$) |
| `dominant_pollutant`| String | Pollutant triggering max NAQI | e.g., `PM2.5` |

---

## 3. Atmospheric Physics: PBLH & Ventilation Index Mechanics

### 3.1 Role of Planetary Boundary Layer Height (PBLH)
The Planetary Boundary Layer (PBL) is the lowest part of the atmosphere directly influenced by the Earth's surface. 
- **Nighttime / Winter Thermal Inversion**: Radiation cooling causes the PBLH to collapse down to **100m – 300m**. Pollutants emitted by morning traffic and industrial stacks are trapped in a tiny atmospheric volume, causing sudden AQI spikes even when emission rates remain constant.
- **Daytime Convective Mixing**: Solar heating expands the PBLH up to **1500m – 2500m**, dispersing pollutants vertically and dramatically lowering ground-level $PM_{2.5}$ concentrations.

```
Atmospheric Boundary Layer Dynamics:

     Daytime (High Mixing)                 Nighttime / Winter Inversion (Trapping)
     ┌────────────────────────┐ ~2000m     
     │                        │            ┌────────────────────────┐ ~250m  (PBL Top)
     │   Vertical Dispersion  │            │     TRAPPED SMOG       │  HIGH GROUND AQI!
     │        (PBLH)          │            ├────────────────────────┤
     └────────────────────────┘ 0m (Ground)└────────────────────────┘ 0m (Ground)
```

### 3.2 Formulation of the Atmospheric Ventilation Index ($VI$)
Raw PBLH alone does not dictate dispersion—horizontal transport (wind speed) must be factored in. We define the **Ventilation Index ($VI$)** as:

$$VI = \text{PBLH} \ (\text{meters}) \times U_{10} \ (\text{m/s})$$

Where $U_{10}$ is the 10-meter horizontal wind speed.

**Dispersion Potential Thresholds:**
- **Critical Trapped Hazard ($VI < 2000 \ \text{m}^2/\text{s}$)**: High probability of hazardous AQI buildup. Triggers high priority alerts in the forecasting pipeline.
- **Moderate Dispersion ($2000 \le VI \le 6000 \ \text{m}^2/\text{s}$)**: Normal dispersion dynamics.
- **High Dispersion Cleansing ($VI > 6000 \ \text{m}^2/\text{s}$)**: Rapid atmospheric cleansing; ground-level AQI drops sharply.

### 3.3 Gaussian Plume Dispersion Integration
In the 1km grid spatial forecasting module (`backend/app/routers/forecast.py`), the concentration $C(x,y,z)$ downwind from an emission source at height $H$ incorporates reflection at the ground ($z=0$) and top boundary reflection at the mixing height $z = \text{PBLH}$:

$$C(x,y,z) = \frac{Q}{2\pi u \sigma_y \sigma_z} \exp\left(-\frac{y^2}{2\sigma_y^2}\right) \sum_{n=-\infty}^{\infty} \left[ \exp\left(-\frac{(z - H + 2n \cdot \text{PBLH})^2}{2\sigma_z^2}\right) + \exp\left(-\frac{(z + H + 2n \cdot \text{PBLH})^2}{2\sigma_z^2}\right) \right]$$

This mathematical formulation prevents unrealistic infinite vertical dispersion during low-PBLH inversion events.

---

## 4. ML Pipeline Redesign & Feature Engineering

### 4.1 Feature Engineering Matrix
To enable accurate 24h, 48h, and 72h forecasts, raw features will be transformed into high-dimensional spatio-temporal representations:

```
Raw Telemetry Data
  │
  ├── 1. Temporal Lags:          AQI(t-1), AQI(t-2), AQI(t-3), AQI(t-6), AQI(t-12), AQI(t-24)
  ├── 2. Rolling Statistics:     24h Rolling Mean, 24h Rolling Std, 6h Rolling Max, 12h Delta
  ├── 3. Cyclic Time Features:   sin(2π * hour / 24), cos(2π * hour / 24)
  │                              sin(2π * day / 365), cos(2π * day / 365)
  ├── 4. Atmospheric Physics:    PBLH, Wind Speed, Ventilation Index (VI), Humidity Ratio
  └── 5. Spatial Lags:           Distance-Weighted Mean AQI of 3 Nearest Neighbor Districts
```

### 4.2 Time-Series Split Strategy (Zero Data Leakage)
Standard `train_test_split(shuffle=True)` creates severe data leakage in time-series forecasting. The upgraded pipeline will enforce a strict **GroupTimeSeriesSplit** based on chronological cutoff lines across all 33 districts:

```
Dataset Chronology (e.g. 24 Months):
[================== Train Set (70%) ==================][== Calib Set (15%) ==][== Test Set (15%) ==]
 2024-01-01 to 2025-05-31                             2025-06-01 to 09-30    2025-10-01 to 12-31
 Fits Base XGBoost / LightGBM Models                   Calibrates MAPIE       Final Evaluation vs
                                                      Conformal Intervals    Persistence Baseline
```

---

## 5. Model Building & Conformal Uncertainty Architecture

### 5.1 Model Benchmark Suite
Rather than relying solely on XGBoost, the pipeline will train and compare three distinct algorithms for each horizon (24h, 48h, 72h):

1. **XGBoost Regressor**: Optimized gradient boosted decision trees (`max_depth=6`, `learning_rate=0.03`, `n_estimators=300`, `subsample=0.8`).
2. **LightGBM Regressor**: Fast leaf-wise gradient boosting tailored for high-dimensional tabular lag features (`num_leaves=31`, `learning_rate=0.03`).
3. **CatBoost Regressor**: Symmetric decision trees robust against categorical district ID variance (`depth=6`, `l2_leaf_reg=3`).
4. **Stacked Ensemble**: A weighted average meta-model ($0.40 \times \text{XGBoost} + 0.40 \times \text{LightGBM} + 0.20 \times \text{CatBoost}$).

### 5.2 MAPIE Conformal Prediction Integration
To provide mathematically guaranteed confidence intervals:

```python
from mapie.regression import SplitConformalRegressor

# Split calibration data
X_train, X_calib, y_train, y_calib = train_test_split(X_train_full, y_train_full, test_size=0.2, shuffle=False)

# Train base ensemble model
ensemble_model.fit(X_train, y_train)

# Conformalize MAPIE regressor
conformal_forecaster = SplitConformalRegressor(estimator=ensemble_model, confidence_level=0.90)
conformal_forecaster.conformalize(X_calib, y_calib)

# Inference produces point forecast + bounds:
# y_pred, y_pis = conformal_forecaster.predict(X_new)
# y_pis contains [AQI_lower_90, AQI_upper_90]
```

---

## 6. Ground-Truth Validation Framework

### 6.1 Baseline Benchmarking
To demonstrate real scientific value, the model forecasts MUST outperform a naive **Persistence Baseline** ($AQI_{t+h} = AQI_t$).

The evaluation script (`ml_model/src/evaluate_models.py`) will compute the following metrics across all 33 districts:

$$\text{RMSE} = \sqrt{\frac{1}{N}\sum_{i=1}^N (y_i - \hat{y}_i)^2}$$

$$\text{MAE} = \frac{1}{N}\sum_{i=1}^N |y_i - \hat{y}_i|$$

$$R^2 = 1 - \frac{\sum (y_i - \hat{y}_i)^2}{\sum (y_i - \bar{y})^2}$$

### 6.2 Evaluation Target Goals

| Horizon | Persistence Baseline RMSE (Target) | VayuBudhi ML Model RMSE Goal | Target $R^2$ Score | Conformal Coverage Target |
|---|---|---|---|---|
| **24-Hour Forecast** | ~35.0 AQI points | **< 16.5 AQI points** | $\ge 0.88$ | $\ge 90.0\%$ |
| **48-Hour Forecast** | ~52.0 AQI points | **< 24.0 AQI points** | $\ge 0.81$ | $\ge 90.0\%$ |
| **72-Hour Forecast** | ~68.0 AQI points | **< 31.5 AQI points** | $\ge 0.75$ | $\ge 90.0\%$ |

---

## 7. Implementation Roadmap & Execution Steps

### Phase A: Dataset Acquisition & Expansion (Immediate)
1. Create `scripts/fetch_hyderabad_district_data.py`:
   - Queries Open-Meteo historical air quality & ERA5 reanalysis APIs for lat/lon centroids of all 33 Hyderabad districts.
   - Merges CPCB station data for Hyderabad.
   - Calculates dynamic hourly $PBLH$ and $Ventilation\_Index$.
   - Saves clean merged dataset to `data/dataset_hyderabad_expanded.csv`.

### Phase B: Advanced Feature Pipeline & Atmospheric Engine
2. Create `ml_model/src/pblh_engine.py`:
   - Computes Ventilation Index, boundary layer stagnation index, and Gaussian plume reflection heights.
3. Create `ml_model/src/feature_engineering.py`:
   - Builds 1h, 3h, 6h, 12h, 24h lag features, rolling statistics, spatial KNN distance weights, and cyclic hour/month transformations.

### Phase C: Model Retraining & Conformal Calibration
4. Refactor `ml_model/src/train_models_v2.py`:
   - Loads `dataset_hyderabad_expanded.csv`.
   - Runs `GroupTimeSeriesSplit` for Train / Calibration / Test sets.
   - Trains 24h, 48h, and 72h XGBoost, LightGBM, and CatBoost models.
   - Calibrates `SplitConformalRegressor` with 90% confidence guarantees.
   - Saves serialized artifacts (`forecaster_24h.pkl`, `forecaster_48h.pkl`, `forecaster_72h.pkl`, `scaler.pkl`) to `ml_model/data/`.

### Phase D: Automated Model Validation & Persistence Comparison
5. Create `ml_model/src/evaluate_models.py`:
   - Evaluates trained models against the test set and calculates RMSE, MAE, $R^2$, and Conformal Coverage.
   - Compares performance directly against the Persistence Baseline.
   - Generates evaluation report and JSON metrics for the backend.

### Phase E: Backend Asynchronous Integration
6. Update FastAPI routes in `backend/app/routers/forecast.py` and `ml_service.py`:
   - Hot-reloads new models and exposes real conformal interval bounds (`aqi_lower`, `aqi_upper`, `ventilation_index`) for any selected Hyderabad district.

---
*Document created following audit review of VayuBudhi ML & AQI Forecasting architecture.*
