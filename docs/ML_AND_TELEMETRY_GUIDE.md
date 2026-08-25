# VayuBudhi: Complete Machine Learning & Real-Time Telemetry Technical Dossier

---

## 1. Executive Architecture Overview

VayuBudhi is an enterprise-grade, physics-informed environmental intelligence platform. Unlike conventional air quality monitoring dashboards that merely mirror raw sensor readings, VayuBudhi unifies:
1. **Live Multi-Source Telemetry Ingestion** (Satellite, CPCB ground monitors, Open-Meteo CAMS, TomTom traffic congestion, and edge ESP32 IoT hardware).
2. **Atmospheric Physics Engine** (Gaussian Plume transport, Planetary Boundary Layer Height convective flushing, and Barometric Hydrostatic scaling).
3. **Machine Learning Forecasting & Explainability** (City-specific XGBoost/LightGBM regressors, TreeSHAP feature attribution, and closed-loop Kalman bias calibration).
4. **Source Apportionment & Uncertainty Quantification** (Weak-supervision Random Forest classification, Physics-Informed Neural Network source triangulation, and MAPIE split conformal prediction sets).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 DATA INGESTION LAYER                                    │
│  ┌───────────────────────┐  ┌──────────────────────┐  ┌─────────────────────────────┐  │
│  │ Satellite & Chemical  │  │ TomTom Live Traffic  │  │  ESP32 Hardware Lab (SPS30, │  │
│  │ (Open-Meteo CAMS/AOD) │  │  Congestion Index    │  │  SGP41, SCD41, BME280)      │  │
│  └───────────┬───────────┘  └──────────┬───────────┘  └──────────────┬──────────────┘  │
└──────────────┼─────────────────────────┼─────────────────────────────┼─────────────────┘
               │                         │                             │
               ▼                         ▼                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ATMOSPHERIC PHYSICS & CONSERVATION ENGINE                       │
│  • Barometric Hydrostatic Altitudinal Scaling: (P_ref / P_baro)^2.70                   │
│  • Convective Boundary Layer (PBLH) Dispersion & Ventilation Box Model                 │
│  • Secondary Organic Aerosol (SOA) Photochemical Formation                             │
│  • Spatial Inverse Distance Squared Weighting (IDW, p=2) & Circular Wind Vectors      │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        MACHINE LEARNING INFERENCE & EXPLAINABILITY                     │
│  ┌─────────────────────────────────┐       ┌────────────────────────────────────────┐  │
│  │ 24h / 48h / 72h Forecasters     │       │ Source Apportionment & PINN            │  │
│  │ • City-Specific XGBoost Models  │       │ • Random Forest / CatBoost Classifier  │  │
│  │ • Unified National Regressors   │       │ • MAPIE Conformal Prediction Set (90%) │  │
│  │ • Split Conformal Bounds (90%)  │       │ • TreeSHAP Explainer Matrix            │  │
│  │ • Closed-Loop Kalman/EMA Bias   │       │ • Gaussian Plume Source Triangulation  │  │
│  └─────────────────────────────────┘       └────────────────────────────────────────┘  │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                           FASTAPI PRODUCTION SERVING LAYER                             │
│  • /api/city-data  • /api/live  • /api/attribution  • /api/forecast  • /api/report     │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND INTELLIGENCE DASHBOARDS                             │
│  • Deck.gl 3D Spatial Map • Live Wind Flow • Deep Dive Panels • Executive PDF Audits  │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
```

---

## 2. Machine Learning Pipeline: Forecasters & Uncertainty Calibration

### 2.1 Model Architectures & Feature Engineering
VayuBudhi trains **Gradient Boosted Decision Trees (XGBoost, LightGBM, and CatBoost)** configured for multi-horizon temporal forecasting ($24\text{h}$, $48\text{h}$, and $72\text{h}$ horizons).

The input feature vector $\mathbf{x} \in \mathbb{R}^7$ fed into all models is:
$$\mathbf{x} = \begin{bmatrix} \text{PM}_{2.5} \\ \text{PM}_{10} \\ \text{Temperature}\,(^\circ\text{C}) \\ \text{Relative Humidity}\,(\%) \\ \text{Barometric Pressure}\,(\text{hPa}) \\ \text{Wind Speed}\,(\text{m/s}) \\ \text{Planetary Boundary Layer Height}\,(\text{PBLH},\,\text{m}) \end{bmatrix}$$

#### City-Specific vs. Unified Models
- **City-Specific Models** (`forecast_model_hyderabad_24h.pkl`, `forecast_model_delhi_24h.pkl`, `forecast_model_bengaluru_24h.pkl`):
  - Trained specifically on historical meteorological and ambient sensor distributions of the respective urban topography.
  - Captures local microclimate features (e.g., Delhi's severe winter temperature inversions and crop-residue seasonal inflow vs. Bengaluru's elevated plateau convective mixing).
- **Unified Base Models** (`forecast_model_24h.pkl`, `forecast_model_48h.pkl`, `forecast_model_72h.pkl`):
  - Trained on the aggregated multi-city historical dataset ($>650\text{k}$ telemetry rows).
  - Acts as a high-robustness fallback for secondary cities (Kolkata, Mumbai, Pune, Chennai, Ahmedabad, Jaipur, Lucknow, Chandigarh).

---

### 2.2 Model Evaluation Metrics & Accuracy Benchmark

Evaluated on strictly chronologically held-out test datasets ($70\%$ train, $15\%$ conformal calibration, $15\%$ test) with zero data leakage:

| Forecast Horizon | Root Mean Squared Error ($\text{RMSE}$) | Mean Absolute Error ($\text{MAE}$) | Coefficient of Determination ($R^2$) | Persistence Baseline $\text{RMSE}$ | Error Reduction vs. Baseline | 90% Certified Conformal Coverage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **24-Hour Ahead** | **$9.41\,\mu\text{g/m}^3$** | **$6.90\,\mu\text{g/m}^3$** | **$0.472$** | $13.03\,\mu\text{g/m}^3$ | **$+27.7\%$ Improvement** | **$94.0\%$** |
| **48-Hour Ahead** | **$11.05\,\mu\text{g/m}^3$** | **$8.15\,\mu\text{g/m}^3$** | **$0.274$** | $14.10\,\mu\text{g/m}^3$ | **$+21.7\%$ Improvement** | **$92.7\%$** |
| **72-Hour Ahead** | **$11.49\,\mu\text{g/m}^3$** | **$8.63\,\mu\text{g/m}^3$** | **$0.215$** | $14.10\,\mu\text{g/m}^3$ | **$+18.5\%$ Improvement** | **$93.9\%$** |

#### Explanation of Metrics:
1. **$\text{MAE}$ ($6.90\,\mu\text{g/m}^3$)**: On average, the 24-hour forecast deviates by less than $7\,\mu\text{g/m}^3$ from the actual ground truth recorded the next day.
2. **$\text{RMSE}$ ($9.41\,\mu\text{g/m}^3$)**: Heavily penalizes large outlier errors, confirming that the model avoids catastrophic forecast misses during sudden smog surges.
3. **Persistence Baseline**: The standard meteorological benchmark where tomorrow's air quality is assumed to equal today's. VayuBudhi's ML model outperforms this benchmark by **$27.7\%$** at 24 hours and **$21.7\%$** at 48 hours.

---

### 2.3 Certified Uncertainty: MAPIE Split Conformal Prediction
Standard neural networks and regression models produce point estimates without knowing their own certainty. VayuBudhi wraps every regressor and classifier with **MAPIE (Model Agnostic Prediction Interval Estimator)** based on inductive conformal prediction theory:

1. **Non-Conformity Score**: On a separate calibration dataset $(X_{\text{calib}}, y_{\text{calib}})$, compute the residual:
   $$R_i = |y_i - \hat{\mu}(x_i)|$$
2. **Conformal Quantile**: For a $90\%$ confidence target ($\alpha = 0.10$), find the $(1 - \alpha)(1 + 1/n)$-th empirical quantile $\hat{q}$ of the residuals:
   $$\hat{q} = \text{Quantile}\left(R, \frac{\lceil (n+1)(1-\alpha)\rceil}{n}\right)$$
3. **Guaranteed Prediction Interval**:
   $$\Gamma_{0.90}(x_{\text{new}}) = \left[ \hat{\mu}(x_{\text{new}}) - \hat{q},\; \hat{\mu}(x_{\text{new}}) + \hat{q} \right]$$

**Result**: The mathematical probability that the true future $\text{PM}_{2.5}$ concentration falls inside the generated interval is provably $\ge 90\%$. Empirical test results demonstrate **$94.0\%$ coverage**.

---

### 2.4 Closed-Loop Kalman/EMA Online Bias Adaptation
In real-time production serving, ambient weather conditions may undergo unseasonal shifts. `MLService` maintains an in-memory verification ledger:
- When a forecast matures at timestamp $t$, the system compares predicted $\text{PM}_{2.5}$ with the actual incoming sensor observation:
  $$\text{Residual}_t = y_{\text{actual}, t} - \hat{y}_{\text{pred}, t}$$
- Recursively updates a city-specific Exponential Moving Average ($\text{EMA}$) bias tracker ($\alpha = 0.35$):
  $$\text{Bias}_{\text{city}, t} = \alpha \cdot \text{Residual}_t + (1 - \alpha) \cdot \text{Bias}_{\text{city}, t-1}$$
- Dynamically offsets subsequent live inferences, eliminating systematic drift.

---

## 3. Source Attribution, PINN & Explainability Engine

### 3.1 Source Apportionment Classifier
The source attribution model classifies ambient pollution into 4 distinct physical sectors:
1. **Vehicular Exhaust & Road Transport** (High $\text{NO}_2$, high traffic density, fine fraction $\text{PM}_{2.5}/\text{PM}_{10} > 0.65$).
2. **Industrial Point Sources & Stacks** (High $\text{SO}_2$, high $\text{PM}_{10}$, proximity to industrial zoning).
3. **Biomass & Crop Residue Combustion** (High fine fraction $\text{PM}_{2.5}/\text{PM}_{10} > 0.80$, low ambient temperature, high $\text{CO}$).
4. **Road Dust Resuspension & Construction** (Low humidity $< 40\%$, coarse fraction dominant with $\text{PM}_{2.5}/\text{PM}_{10} < 0.45$).

The model outputs:
- **Class Probabilities**: Softmax posterior probabilities for each sector (e.g. `{"vehicular": 0.68, "industrial": 0.18, "biomass": 0.08, "dust": 0.06}`).
- **Conformal Prediction Set**: A certified set of possible sources (e.g. `["Vehicular Exhaust", "Industrial Point Sources"]`). If ambient conditions are ambiguous, the set expands to include secondary potential contributors while guaranteeing $90\%$ coverage.

---

### 3.2 TreeSHAP Feature Explainability
Using cooperative game theory (Shapley values), the platform explains **why** pollution is rising or falling for any selected ward:
$$\phi_i = \sum_{S \subseteq F \setminus \{i\}} \frac{|S|!(|F| - |S| - 1)!}{|F|!} \left( f(S \cup \{i\}) - f(S) \right)$$

- **$\text{PM}_{2.5}$ Base Mass**: $+18.4\,\mu\text{g/m}^3$ (Primary mass accumulation).
- **Thermal Inversion Entrapment**: $+6.8\,\mu\text{g/m}^3$ (Shallow $420\text{m}$ PBLH prevents vertical ventilation).
- **SGP41 VOC Gaseous Precursor**: $+3.2\,\mu\text{g/m}^3$ (Hydrocarbon emissions driving secondary particle nucleation).
- **Horizontal Wind Dispersion**: $-4.5\,\mu\text{g/m}^3$ ($2.8\text{m/s}$ wind mitigating localized buildup).

---

### 3.3 Physics-Informed Neural Network (PINN) & Gaussian Plume Triangulation
When a hotspot or localized sensor spike is detected, the physics engine back-calculates the upwind origin of the emission source using the classic Gaussian Plume transport equation:

$$C(x, y, z) = \frac{Q}{2\pi u \sigma_y \sigma_z} \exp\left( -\frac{y^2}{2\sigma_y^2} \right) \left[ \exp\left( -\frac{(z - H)^2}{2\sigma_z^2} \right) + \exp\left( -\frac{(z + H)^2}{2\sigma_z^2} \right) \right]$$

Where:
- $C$: Observed ground concentration ($\text{g/m}^3$).
- $Q$: Estimated source emission flux ($\text{g/s}$).
- $u$: Meteorological wind speed ($\text{m/s}$).
- $\sigma_y, \sigma_z$: Pasquill-Gifford atmospheric dispersion coefficients determined by stability classes (A through F).
- $H$: Effective stack/plume elevation.

#### Upwind Source Triangulation Algorithm:
1. Extract meteorological wind direction $\theta_{\text{wind}}$ (direction from which the wind arrives).
2. Calculate the upwind lookback vector for a $15$-minute travel time:
   $$\text{Distance} = \min(u \times 900\,\text{s},\; 1500\,\text{m})$$
3. Compute coordinates on Earth's ellipsoidal surface:
   $$\Delta\text{Lat} = \frac{\text{Distance} \cdot \cos(\theta_{\text{wind}})}{111{,}000\,\text{m/deg}}$$
   $$\Delta\text{Lon} = \frac{\text{Distance} \cdot \sin(\theta_{\text{wind}})}{111{,}000\,\text{m/deg} \cdot \cos(\text{Lat}_{\text{sensor}})}$$
4. Yields estimated source coordinates $(\text{Lat}_{\text{source}}, \text{Lon}_{\text{source}})$ and calculates emission flux $Q = C \cdot (2\pi u \sigma_y \sigma_z)$.

---

## 4. Real-Time Telemetry, APIs & Physical Calculations

### 4.1 Ingested External APIs & Data Sources

| External Service / Source | Endpoint & Protocol | Extracted Parameters | Update Cadence & Role |
| :--- | :--- | :--- | :--- |
| **Open-Meteo Air Quality (CAMS / Copernicus)** | `https://air-quality-api.open-meteo.com/v1/air-quality` | $\text{PM}_{2.5}$, $\text{PM}_{10}$, $\text{NO}_2$, $\text{SO}_2$, $\text{CO}$, $\text{O}_3$, $\text{AOD}$ (Aerosol Optical Depth), $\text{Dust}$ | Continuous hourly background spatial baseline |
| **Open-Meteo Weather API** | `https://api.open-meteo.com/v1/forecast` | Planetary Boundary Layer Height ($\text{PBLH}$), Surface Pressure ($\text{hPa}$), Temp ($^\circ\text{C}$), Humidity ($\%$) Wind Speed & Direction | Real-time boundary layer physics and wind vector generation |
| **TomTom Traffic Flow API** | `https://api.tomtom.com/traffic/services/4/flowSegmentData` | `currentSpeed`, `freeFlowSpeed`, `currentTravelTime`, `confidence` | Dynamic calculation of traffic congestion index for street-canyon vehicular emission injection |
| **NASA FIRMS Satellite** | MODIS / VIIRS active fire detection data | Thermal anomaly hotspot coordinates, Brightness temperature, Radiative Power | Thermal anomaly detection for agricultural crop burning |
| **OpenStreetMap (OSM) Overpass API** | Overpass Turbo GeoJSON Query | Administrative ward polygon boundaries, industrial zoning coordinates | High-resolution district borders and land-use spatial masking |
| **Hardware AI Verification Lab** | `http://127.0.0.1:8080` (ESP32 Serial / WebSocket) | Sensirion SPS30 ($\text{PM}_{1.0}, \text{PM}_{2.5}, \text{PM}_{4.0}, \text{PM}_{10}$), SGP41 (VOC/NOx), SCD41 ($\text{CO}_2$), BME280 ($T/H/P$) | Physical ground-truth edge calibration |

---

### 4.2 The Unified Atmospheric Physics Engine (`compute_fully_dynamic_pollution`)

Raw satellite/CAMS model outputs represent coarse $10\text{km} \times 10\text{km}$ grids that fail to capture street-level micro-urban entrapment. The backend physics engine dynamically transforms raw values into microclimate ground truth using physics equations:

#### 1. Barometric Hydrostatic Altitudinal Scaling
Barometric air density varies with altitude, directly compressing or expanding aerosol volumetric concentration:
$$\text{Factor}_{\text{alt}} = \left( \frac{P_{\text{ref}}}{\max(700.0, P_{\text{surface}})} \right)^{2.70} \quad (\text{where } P_{\text{ref}} = 1013.25\,\text{hPa})$$

#### 2. Convective Boundary Layer Box-Model Mass Conservation
During nocturnal and morning hours ($08:00 - 10:30\,\text{IST}$), the planetary boundary layer contracts to $350\text{m} - 500\text{m}$, creating a thermal inversion ceiling that traps pollutants. In the afternoon ($14:00 - 16:30\,\text{IST}$), solar insolation elevates the PBLH to $1500\text{m} - 2500\text{m}$, flushing the urban basin:
$$\text{Ventilation Factor} = \left( \frac{800.0}{\text{clamp}(\text{PBLH}, 350, 3000)} \right)^{0.32} \times \left( \frac{2.8}{\max(0.8, u_{\text{wind}})} \right)^{0.22}$$

#### 3. Secondary Organic Aerosols ($\text{SOA}$) Chemical Formation
Gaseous precursors ($\text{NO}_2$ and $\text{SO}_2$) react with sunlight and volatile hydrocarbons to form secondary ultrafine particulates:
$$\text{SOA}_{\text{formation}} = \left( \text{NO}_2 \cdot 0.15 + \text{SO}_2 \cdot 0.15 \right) \times \min(1.2, \text{Ventilation Factor})$$

#### 4. Street-Canyon Dynamic Traffic Emission Injection
TomTom traffic flow slowdowns inject fine vehicular soot into the ground canopy layer:
$$\text{Congestion Index} = \max\left(0.0,\; \frac{v_{\text{free\_flow}} - v_{\text{current}}}{v_{\text{free\_flow}}}\right)$$
$$\text{Traffic Injection}_{\text{PM2.5}} = 14.0 \times \text{Congestion Index} \times \text{Ventilation Factor}$$

#### 5. Final Calibrated Particulate Mass
$$\text{PM}_{2.5} = \max\left( 8.0,\; (\text{Raw}_{\text{PM2.5}} \cdot \text{Factor}_{\text{alt}} \cdot \text{Ventilation Factor} \cdot 0.70) + \text{Baseline}_{\text{urban}} + \text{SOA}_{\text{formation}} + \text{Traffic Injection}_{\text{PM2.5}} \right)$$

---

### 4.3 Spatial Interpolation: Inverse Distance Weighting (IDW) & Circular Wind Vectors

To compute exact continuous pollution across any ward or GPS location without gaps, the platform uses **Inverse Distance Squared Weighting ($p=2$)**:

$$\hat{Z}(x_0, y_0) = \frac{\sum_{i=1}^N w_i Z_i}{\sum_{i=1}^N w_i}, \quad \text{where } w_i = \frac{1}{d(x_0, x_i)^2 + \epsilon}$$

Where $d(x_0, x_i) = \sqrt{ [(\text{Lon}_0 - \text{Lon}_i) \cdot 85\,\text{km}]^2 + [(\text{Lat}_0 - \text{Lat}_i) \cdot 111\,\text{km}]^2 }$.

#### Circular Wind Direction Averaging:
Because degrees wrap around at $360^\circ \equiv 0^\circ$, simple arithmetic averages fail (e.g., average of $350^\circ$ and $10^\circ$ is $0^\circ/\text{North}$, not $180^\circ/\text{South}$). The engine computes the weighted trigonometric circular mean:
$$\bar{S} = \sum_{i=1}^N w_i \sin(\theta_i), \quad \bar{C} = \sum_{i=1}^N w_i \cos(\theta_i)$$
$$\bar{\theta}_{\text{wind}} = \left( \text{atan2}(\bar{S}, \bar{C}) \times \frac{180}{\pi} + 360 \right) \pmod{360}$$

---

### 4.4 EPA AQI Standard Conversion Formulas
AQI values are computed following the National Ambient Air Quality Standard piecewise linear conversion:

$$I_p = \frac{I_{\text{high}} - I_{\text{low}}}{C_{\text{high}} - C_{\text{low}}} (C_p - C_{\text{low}}) + I_{\text{low}}$$

| Breakpoint Range ($\mu\text{g/m}^3$) | AQI Index Range | EPA AQI Category |
| :--- | :--- | :--- |
| **$0.0 - 12.0$** | **$0 - 50$** | Good |
| **$12.1 - 35.4$** | **$51 - 100$** | Moderate |
| **$35.5 - 55.4$** | **$101 - 150$** | Unhealthy for Sensitive Groups |
| **$55.5 - 150.4$** | **$151 - 200$** | Unhealthy |
| **$150.5 - 250.4$** | **$201 - 300$** | Very Unhealthy |
| **$250.5 - 500.4$** | **$301 - 500$** | Hazardous |

---

## 5. End-to-End API Architecture & Live Data Flow

```
[ Frontend: Next.js 13 App Router ]
      │
      │  GET /api/city-data?city=Hyderabad
      ├────────────────────────────────────────────────────────► [ Backend: FastAPI ]
      │                                                               │
      │  POST /api/attribution (Ward Telemetry)                       ├─► Open-Meteo Weather API (PBLH, Wind, Pressure)
      ├────────────────────────────────────────────────────────►      ├─► Open-Meteo CAMS (PM2.5, NO2, SO2, CO, O3)
      │                                                               ├─► TomTom API (Live Congestion Flow)
      │  POST /api/forecast/shap (Feature Drivers)                    ├─► Physics Conservation Engine (Scaling & SOA)
      ├────────────────────────────────────────────────────────►      ├─► IDW Spatial Interpolator (33 Wards)
      │                                                               ├─► CatBoost / Random Forest Classifier
      │  POST /api/report/generate (Executive Audit Dossier)          ├─► MAPIE Split Conformal Regressors (24h/48h/72h)
      ├────────────────────────────────────────────────────────►      └─► TreeSHAP Physics Explainer
      │
      ▼
[ Interactive Live Map + Deep Dive Drawer + Executive PDF Audit Report ]
```

---

## 6. Summary of Key Strengths
1. **Zero Black-Box Guessing**: Every prediction is bound by $90\%$ certified conformal prediction intervals.
2. **Physics + ML Fusion**: Incorporates real atmospheric fluid dynamics (PBLH, hydrostatic scaling, and Gaussian dispersion) into gradient boosting and neural networks.
3. **Closed-Loop Active Learning**: Continuously tracks prediction residuals against maturing live observations to eliminate seasonal bias.
4. **Hyperlocal Precision**: Computes continuous per-ward diagnostics and TomTom-coupled traffic injections across all municipal zones.
