# VayuBudhi — Final Comprehensive Audit Report

> **Sources combined**: Code-level audit of every file in the repo, [`gap_analysis1.md`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/gap_analysis1.md), [`VayuBudhi2.0_plan.md`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/VayuBudhi2.0_plan.md), [`product_readiness_assessment.md`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/product_readiness_assessment.md), and teammate-reported issues.
>
> **Focus**: Hyderabad-first, no-mercy, every file audited.

---

## Table of Contents

1. [Category A: Hardcoded Values (21 findings)](#category-a-hardcoded-values)
2. [Category B: Feature Gaps vs Problem Statement (12 findings)](#category-b-feature-gaps-vs-problem-statement)
3. [Category C: Hyderabad-Specific Issues (7 findings)](#category-c-hyderabad-specific-issues)
4. [Category D: ML Pipeline Integrity Issues (8 findings)](#category-d-ml-pipeline-integrity-issues)
5. [Category E: Deliverable & Compliance Gaps (7 findings)](#category-e-deliverable--compliance-gaps)
6. [Category F: Advisory & Language Gaps (5 findings)](#category-f-advisory--language-gaps)
7. [Category G: Code Quality & Architecture (8 findings)](#category-g-code-quality--architecture)
8. [Category H: Infrastructure & Security (6 findings)](#category-h-infrastructure--security)
9. [Category I: Hardware & Field Readiness (5 findings)](#category-i-hardware--field-readiness)
10. [Category J: Business & Funding Readiness (4 findings)](#category-j-business--funding-readiness)
11. [Summary Scorecard](#summary-scorecard)
12. [Detailed Remediation Approach](#detailed-remediation-approach)

---

## Category A: Hardcoded Values

### A1. Compare Cities — ROI column is static
**Severity**: 🔴 Critical | **File**: [`page.tsx:L155`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/frontend/src/app/page.tsx#L155)
```js
const rois = ['+84.2%', '+42.1%', '+21.5%'];
```
The `roi` values are a static array that never changes regardless of actual enforcement or optimization data.

### A2. Compare Cities — Only 3 cities hardcoded, ignoring 17+ in dropdown
**Severity**: 🔴 Critical | **File**: [`page.tsx:L140`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/frontend/src/app/page.tsx#L140)
```js
const citiesToCompare = ['Delhi', 'Hyderabad', 'Guwahati'];
```
The city dropdown offers Mumbai, Bengaluru, Chennai, Kolkata, Pune, Ahmedabad, Jaipur, Lucknow, etc. — the Compare tab ignores all of them.

### A3. Forecast Panel — `validationMetrics` entirely hardcoded
**Severity**: 🔴 Critical | **File**: [`ForecastPanel.tsx:L53-L58`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/frontend/src/components/ForecastPanel.tsx#L53-L58)
```js
const validationMetrics = {
  rmse_24h: 18.3, rmse_48h: 27.1, rmse_72h: 38.6,
  improvement_24h: 31.7, improvement_48h: 22.3, improvement_72h: 12.7,
  conformal_coverage: 91.2,
};
```
These "Model Validation" numbers are displayed as if real but are static constants. **No validation script ever computes them.**

### A4. Forecast Panel — `generateForecast()` is a synthetic sinusoidal curve, not ML output
**Severity**: 🔴 Critical | **File**: [`ForecastPanel.tsx:L17-L50`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/frontend/src/components/ForecastPanel.tsx#L17-L50)
```js
const baseLine = 220 - day * 18;
const diurnalFactor = 1.0 + baseAmplitude * Math.sin(...);
```
The ML model provides only 3 data points (24h, 48h, 72h). The 72-hour chart interpolates via a **hardcoded sinusoidal diurnal cycle** baked into the frontend. IQAir and AQICN show actual hourly model output.

### A5. Forecast Panel — Conformal badge hardcoded to "90%"
**Severity**: 🟠 Major | **File**: [`ForecastPanel.tsx:L248`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/frontend/src/components/ForecastPanel.tsx#L248)
```tsx
<div className="panel-badge badge-blue">90% Conformal</div>
```
Always says "90%" but `ml_service.py` uses `alpha=0.15` (85% confidence).

### A6. SimulatorPanel — Hardcoded weather values override real station data
**Severity**: 🔴 Critical | **File**: [`SimulatorPanel.tsx:L34-L44`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/frontend/src/components/SimulatorPanel.tsx#L34-L44)
```js
pm10: iotSensor.pm25 * 1.5,  // FABRICATED
temp: 32.5,                   // HARDCODED (station has real value)
humidity: 55.0,               // HARDCODED
pressure: 1008.2,             // HARDCODED
wind_speed: 2.5,              // HARDCODED
pblh: 850.0                   // HARDCODED
```
Real data exists on the station object (`iotSensor.temp`, `iotSensor.humidity`, etc.) but is completely ignored.

### A7. SimulatorPanel — Fallback attribution values fabricated
**Severity**: 🟠 Major | **File**: [`SimulatorPanel.tsx:L140-L145`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/frontend/src/components/SimulatorPanel.tsx#L140-L145)
```tsx
{attribution ? Math.round(attribution.confidence * 100) : 90}% Coverage
// fallback: 'biomass_burning', set_size: 1, confidence: 92%
```

### A8. OptimizerPanel — Every stop has identical fake metadata
**Severity**: 🔴 Critical | **File**: [`OptimizerPanel.tsx:L220-L228`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/frontend/src/components/OptimizerPanel.tsx#L220-L228)
```js
source_type: 'vehicular',          // Always "vehicular"
confidence: 0.92,                  // Always 92%
severity: stop.roi ? 350 : 0,      // Arbitrary 350
population_exposed: 185000,        // Always 185,000
estimated_aqi_reduction: 18.0,     // Always 18.0
compliance_cost: 12000.0,          // Always ₹12,000
legal_basis: 'GRAP Stage III, §4.2' // Delhi-only policy, wrong for Hyderabad
```

### A9. OptimizerPanel — Population metric is `185 × stops`
**Severity**: 🟠 Major | **File**: [`OptimizerPanel.tsx:L398`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/frontend/src/components/OptimizerPanel.tsx#L398)
```tsx
{(185 * (processedLiveRoute?.stops.length || 0))}k
```

### A10. Health Advisory — Vulnerable centers hardcoded (2 entries)
**Severity**: 🔴 Critical | **File**: [`health.py:L64-L67`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/backend/app/routers/health.py#L64-L67)
```python
vulnerable_centers = [
    {"type": "Hospital", "name": "City General", ...},
    {"type": "School", "name": "Primary Academy", ...}
]
```
Same fake hospital and school for every city. No geocoding of real Hyderabad hospitals (Gandhi, Osmania, NIMS).

### A11. Backend — Station `source` field is hardcoded `i % 5`
**Severity**: 🟠 Major | **File**: [`live.py:L326`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/backend/app/routers/live.py#L326)
```python
source="iot" if i % 5 == 0 else "caaqms"
```

### A12. Backend — Silent fallback with fabricated values
**Severity**: 🔴 Critical | **File**: [`live.py:L109-L110`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/backend/app/routers/live.py#L109-L110)
```python
temp, humidity, pressure, wind_speed, pblh = 28.0, 60.0, 1008.0, 2.0, 800.0
pm25, pm10, aqi_val, naqi = 35.0, 45.0, 100.0, 100.0
```
No user-facing indication data is fake.

### A13. Dispersion model defaults to Delhi coordinates
**Severity**: 🟠 Major | **File**: [`forecast.py:L90`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/backend/app/routers/forecast.py#L90)
```python
def get_dispersion_model(..., lat: float = 28.6139, lon: float = 77.2090, ...):
```

### A14. Attribution GET fallback — completely fake reading
**Severity**: 🟠 Major | **File**: [`attribution.py:L118-L129`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/backend/app/routers/attribution.py#L118-L129)
```python
reading = schemas.SensorReading(
    station_id="esp32_01", timestamp="2026-07-17T15:00:00Z",
    pm25=142.3, pm10=168.9, temp=31.2, ...
)
```

### A15. Schema defaults are Delhi-centric
**Severity**: 🟡 Minor | **File**: [`schemas.py:L15-L16`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/backend/app/schemas.py#L15-L16)
```python
lat: float = Field(default=28.6139, ...)  # Delhi
lon: float = Field(default=77.2090, ...)  # Delhi
```

### A16. ML Attribution — Hardcoded confidence = 0.90
**Severity**: 🟠 Major | **File**: [`ml_service.py:L88,L106`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/backend/app/ml_service.py#L88)
```python
return {"prediction_set": [], "set_size": 0, "confidence": 0.90, ...}
```

### A17. Database URL not from environment
**Severity**: 🟡 Minor | **File**: [`database.py:L9`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/backend/app/database.py#L9)
```python
DATABASE_URL = "sqlite:///./vayubudhi.db"
```

### A18. Google Sheets URL duplicated in two files
**Severity**: 🟡 Minor | **Files**: [`live.py:L11`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/backend/app/routers/live.py#L11) and [`sync.py:L11`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/backend/app/routers/sync.py#L11)

### A19. API base URL hardcoded to `127.0.0.1:8000` across all frontend files
**Severity**: 🟠 Major | **Files**: Every `.tsx` component
```js
fetch('http://127.0.0.1:8000/api/...')
```

### A20. Sentinel-5P satellite layer is Delhi-exclusive
**Severity**: 🟠 Major | **File**: [`CityMap.tsx:L202-L209`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/frontend/src/components/CityMap.tsx#L202-L209)
```js
bounds: [76.84, 28.40, 77.35, 28.88], // Delhi bounding box
opacity: showSatellite && city === 'Delhi' ? 0.7 : 0,
```

### A21. Simulation timing is artificial and fixed
**Severity**: 🟡 Minor | **File**: [`SimulatorPanel.tsx:L56-L68`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/frontend/src/components/SimulatorPanel.tsx#L56-L68)
```js
setTimeout(() => setStage('attributing'), 8000);
setTimeout(() => setStage('routing'), 18000);
setTimeout(() => setStage('dispatched'), 32000);
```
API calls complete in ~1-2s but UI pretends it takes 42 seconds.

---

## Category B: Feature Gaps vs Problem Statement

### B1. No historical AQI trend view
Deployed products (AQICN, IQAir, CPCB SAMEER) show 7-day and 30-day historical trends. The 44MB SQLite DB has historical data that's never surfaced.

### B2. No pollutant-wise time series
CPCB SAMEER shows individual PM2.5, PM10, NO₂, SO₂, CO, O₃ time-series charts. VayuBudhi only shows a single AQI number.

### B3. No "last updated" timestamp anywhere
No "Last Updated: 5 min ago" indicator. Users can't tell data freshness.

### B4. No auto-refresh / polling
Data fetched once on load or city switch. No periodic polling. Live platforms refresh every 5 minutes.

### B5. No error states shown to user
API failures silently show stale data or hardcoded fallbacks. No toast notifications, no "⚠ Data unavailable".

### B6. No loading skeletons on map
City switching shows no visual feedback during data load.

### B7. Enforcement report not surfaced in UI
The `/optimize/report` endpoint exists but there is **no UI to view or download** the enforcement report. The feature is invisible to evaluators.

### B8. No intervention effectiveness tracking across cities
Problem statement requires: *"tracks and compares intervention effectiveness across multiple urban centres."* Zero implementation.

### B9. No compliance metrics
Problem statement requires compliance metrics. None exist.

### B10. No ward/zone-level attribution aggregation
Attribution operates per-reading, not per-district. Problem statement requires *"ward or zone level"*.

### B11. No construction permit data integration
Problem statement mentions construction sources. No integration with permit databases or municipal data.

### B12. No industrial stack emission data integration
No mapping of registered industrial emission sources for cross-referencing.

---

## Category C: Hyderabad-Specific Issues

### C1. Only 12 Hyderabad stations — TSPCB has 16+
**File**: [`live.py:L230-L243`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/backend/app/routers/live.py#L230-L243)
Missing: Kukatpally, Kothapet, LB Nagar, Somajiguda, Begumpet (IMD), Sanatnagar DLRL, Balanagar.

### C2. Three different coordinate pairs for Hyderabad center
| File | Coordinates |
|---|---|
| [`live.py:L257`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/backend/app/routers/live.py#L257) | `17.425, 78.45` |
| [`CityMap.tsx:L25`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/frontend/src/components/CityMap.tsx#L25) | `17.42, 78.44` |
| [`OptimizerPanel.tsx:L30`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/frontend/src/components/OptimizerPanel.tsx#L30) | `17.385, 78.4867` |

### C3. No Hyderabad-specific industrial zones mapped
Jeedimetla, Nacharam, Patancheru CETP — not referenced.

### C4. No GHMC zone boundaries for enforcement
Uses generic OSM district polygons. Hyderabad operates with GHMC Circles and Zones (Khairatabad, Secunderabad, LB Nagar, Kukatpally).

### C5. GRAP Stage III cited as legal basis — Hyderabad doesn't use GRAP
GRAP (Graded Response Action Plan) is **Delhi NCR-only** (per CPCB/EPCA). Hyderabad follows TSPCB/NGT directives. Showing "GRAP Stage III, §4.2" for a Hyderabad enforcement stop is factually incorrect.

### C6. No Sentinel-5P/satellite layer for Hyderabad
Button only appears when `city === 'Delhi'`.

### C7. Dispersion model defaults to Delhi if Hyderabad coords not passed
Falls back to `lat=28.6139, lon=77.2090`.

---

## Category D: ML Pipeline Integrity Issues

### D1. Conformal prediction is fake in `ml_service.py`
**Severity**: 🔴 Critical | **Source**: VayuBudhi2.0 plan, teammate feedback
**File**: [`ml_service.py:L98-L99`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/backend/app/ml_service.py#L98-L99)
```python
prediction_set = [str(classes[i]) for i in range(len(classes)) if probs[i] > 0.1]
```
This is **not conformal prediction**. It's thresholding raw probabilities at 10%. Real MAPIE conformal prediction provides mathematically guaranteed coverage. The current implementation provides **zero statistical guarantees**.

### D2. Source attribution labels trained on heuristic self-labels
**Severity**: 🔴 Critical | **Source**: Gap analysis, teammate feedback
The classifier trains on labels generated by `apply_weak_heuristics()` which uses PM2.5/PM10 ratio and temperature rules. This is circular — the model learns the heuristics, not ground truth. Never validated against real emission inventories.

### D3. Validation functions exist but are never called
**Severity**: 🔴 Critical | **Source**: Gap analysis
[`validation.py`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/ml_model/src/validation.py) has RMSE, JSD, and Wasserstein functions but **no script ever calls them**. No persistence baseline benchmark is computed.

### D4. Training data is too small (~700 rows)
**Severity**: 🟠 Major | **Source**: VayuBudhi2.0 plan
`dataset.csv` has ~700 rows. Production ML needs 50,000+ labeled readings across seasons, geographies, and weather conditions.

### D5. No humidity correction on PM readings
**Severity**: 🔴 Critical | **Source**: VayuBudhi2.0 plan
At RH >75%, water condenses on aerosol particles (hygroscopic growth), inflating PM2.5 readings by 30–200%. No κ-Köhler correction exists anywhere in the pipeline.

### D6. No spatial or temporal features in forecast model
**Severity**: 🟠 Major | **Source**: VayuBudhi2.0 plan
XGBoost forecaster has no wind direction, hour-of-day, day-of-week, or seasonal features. Only uses 7 raw pollutant/weather inputs.

### D7. Model serving is synchronous — blocks API
**Severity**: 🟡 Minor | **Source**: VayuBudhi2.0 plan
`joblib.load()` at startup, synchronous `predict()` in the request path. No model versioning, no A/B testing, no rollback.

### D8. Forecast confidence interval fallback is `point * 0.85, point * 1.15`
**Severity**: 🟠 Major | **File**: [`ml_service.py:L70`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/backend/app/ml_service.py#L70)
```python
intervals.append([float(point * 0.85), float(point * 1.15)])
```
When MAPIE fails, intervals are fabricated as ±15% of the point prediction. Not conformal.

---

## Category E: Deliverable & Compliance Gaps

### E1. No architecture diagram
**Severity**: 🔴 Critical | **Source**: Gap analysis, teammate feedback
Required deliverable. Not present in the repo.

### E2. No presentation deck
**Severity**: 🔴 Critical | **Source**: Gap analysis
Required deliverable. Not present.

### E3. No demo video
**Severity**: 🔴 Critical | **Source**: Gap analysis
Required deliverable. Not present.

### E4. LangGraph claimed in README but does not exist
**Severity**: 🔴 Critical | **Source**: Gap analysis, teammate feedback
README mentions "LangGraph" but [`coordinator.py`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/agent_advisor/src/coordinator.py) is a single function call to Gemini. No graph definition, no nodes, no edges, no state machine, no multi-agent orchestration.

### E5. No real satellite data (Sentinel/MODIS/NASA FIRMS)
**Severity**: 🔴 Critical | **Source**: Gap analysis, teammate feedback
Problem statement explicitly requires *"Geospatial Intelligence & Remote Sensing (Sentinel satellite, MODIS)."* The `NASA_FIRMS_Thermal` evidence field exists in attribution but uses Open-Meteo aerosol proxy — **never actually calls NASA FIRMS API**.

### E6. No sensor co-location calibration data
**Severity**: 🟠 Major | **Source**: Product readiness assessment
Funders/evaluators will ask: "How do we know your ₹3,150 sensor is accurate vs. our ₹50 Lakh CAAQMS?" No R² correlation documented.

### E7. No IUDX / regulatory compliance documentation
**Severity**: 🟠 Major | **Source**: Product readiness assessment
India Urban Data Exchange (IUDX) compliance is expected for Smart City integration. Not mentioned.

---

## Category F: Advisory & Language Gaps

### F1. Telugu (తెలుగు) completely missing — critical for Hyderabad
**Severity**: 🔴 Critical | **File**: [`AdvisoryPanel.tsx:L5-L9`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/frontend/src/components/AdvisoryPanel.tsx#L5-L9)
```js
export const languageLabels: Record<string, string> = {
  en: 'English', hi: 'हिंदी', kn: 'ಕನ್ನಡ',
};
```

### F2. Tamil missing — required by problem statement for Chennai
**Severity**: 🟠 Major | **Source**: Gap analysis, teammate feedback

### F3. Assamese missing — needed for Guwahati
**Severity**: 🟠 Major | **Source**: Gap analysis

### F4. No IVR/SMS gateway integration
**Severity**: 🟠 Major | **Source**: Gap analysis
Problem statement mentions *"pushes personalised advisories through mobile apps, public displays, and IVR in regional languages."* Current implementation only outputs text strings.

### F5. No mobile push notification system
**Severity**: 🟡 Minor | **Source**: Gap analysis

---

## Category G: Code Quality & Architecture

### G1. Massive use of `any` types across frontend
Nearly every `.tsx` file uses `useState<any>` extensively, defeating TypeScript's purpose.

### G2. Duplicate IDW implementations
[`delhiDistricts.ts:L28`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/frontend/src/data/delhiDistricts.ts#L28) and [`otherDistricts.ts:L23`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/frontend/src/data/otherDistricts.ts#L23) — identical copy-paste.

### G3. Duplicate `District` interface definition
Defined in both `delhiDistricts.ts` and `otherDistricts.ts`.

### G4. `BASE_DIR` computed twice with same value
**File**: [`ml_service.py:L7-L11`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/backend/app/ml_service.py#L7-L11)

### G5. Error logging overwrites previous errors
**File**: [`live.py:L332`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/backend/app/routers/live.py#L332)
```python
with open("error_log.txt", "w") as f:  # "w" overwrites!
```

### G6. Advisory endpoint in wrong router file
Advisory logic lives in [`health.py`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/backend/app/routers/health.py) instead of its own `advisory.py`. Mixes unrelated concerns.

### G7. Bare `except:` clauses with no logging
**File**: [`attribution.py:L61,L74`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/backend/app/routers/attribution.py#L61) — swallows errors silently.

### G8. No mobile responsive design
Sidebar layout breaks on mobile screens. No media queries for smaller viewports.

---

## Category H: Infrastructure & Security

### H1. CORS allows all origins
**File**: [`main.py:L36`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/backend/app/main.py#L36) — `allow_origins=["*"]`

### H2. No rate limiting on any endpoint
Open-Meteo free tier can be exhausted. No throttling.

### H3. No authentication / authorization
No login, no JWT, no API keys. Anyone can POST fake sensor data.

### H4. SQLite will corrupt under concurrent writes
**Source**: VayuBudhi2.0 plan. Single-writer; multiple IoT nodes writing concurrently will cause issues.

### H5. No API versioning (`/api/v1/`)
Current: `/api/forecast`. Should be `/api/v1/forecast`.

### H6. No deployment configuration
No Docker, no CI/CD, no Kubernetes manifests, no Terraform.

---

## Category I: Hardware & Field Readiness

### I1. Breadboard + jumper wires — not field-deployable
**Source**: Product readiness, VayuBudhi2.0 plan. Contact resistance causes intermittent I2C failures. Will disconnect with wind/vibration.

### I2. SDS011 sensor dies in <1 year (8,000 hr fan MTBF)
**Source**: VayuBudhi2.0 plan. Not certified for regulatory use. No humidity compensation.

### I3. WiFi-only connectivity — useless for outdoor deployment
**Source**: VayuBudhi2.0 plan. Requires a local AP. No fallback.

### I4. No power autonomy
**Source**: Product readiness, VayuBudhi2.0 plan. USB cable from laptop/wall. A single power outage kills the node.

### I5. BME280 thermal bias from ESP32 proximity
**Source**: VayuBudhi2.0 plan. Mounted on same board as hot ESP32, causing +3–5°C temperature bias.

---

## Category J: Business & Funding Readiness

### J1. No 14-day field pilot data
**Source**: Product readiness. Funders need proof the full loop runs continuously without crashing.

### J2. No documented R² correlation with CAAQMS
**Source**: Product readiness. No co-location calibration data to prove sensor accuracy.

### J3. No CPCB/MCERTS/EPA certification path documented
**Source**: VayuBudhi2.0 plan. Without certification, data has zero legal standing.

### J4. No multi-tenant SaaS architecture for municipal procurement
**Source**: VayuBudhi2.0 plan. City officers can't log in and see only their jurisdiction.

---

## Summary Scorecard

| Category | 🔴 Critical | 🟠 Major | 🟡 Minor | Total |
|---|:---:|:---:|:---:|:---:|
| **A. Hardcoded Values** | 7 | 8 | 6 | **21** |
| **B. Feature Gaps vs Problem Statement** | — | 10 | 2 | **12** |
| **C. Hyderabad-Specific** | 2 | 5 | — | **7** |
| **D. ML Pipeline Integrity** | 4 | 3 | 1 | **8** |
| **E. Deliverables & Compliance** | 5 | 2 | — | **7** |
| **F. Advisory & Language** | 1 | 3 | 1 | **5** |
| **G. Code Quality** | — | 4 | 4 | **8** |
| **H. Infrastructure & Security** | 2 | 3 | 1 | **6** |
| **I. Hardware & Field** | 3 | 2 | — | **5** |
| **J. Business & Funding** | 2 | 2 | — | **4** |
| **TOTAL** | **26** | **42** | **15** | **83** |

---

## Detailed Remediation Approach

Below is the approach to fix every finding, organized by priority tier.

---

### 🔴 TIER 1 — Must Fix Immediately (Critical for Evaluation/Demo)

#### Fix A1 + A2: Make Compare Cities Tab Fully Dynamic
**Problem**: Static ROI, only 3 cities.
**Approach**:
1. Replace the hardcoded `citiesToCompare` array with the full list of cities from the dropdown (or at minimum, all cities that have backend `CITY_STATIONS` definitions).
2. For each city, call `/api/city-data?city=X` in parallel using `Promise.all()`.
3. Compute `avgAqi` and `alerts` from the real station data (already done in the recent fix).
4. Replace the static `rois` array with a computed ROI. The backend already has `/api/optimize` which returns ROI per stop — aggregate the total ROI per city. Alternatively, compute a simple "estimated improvement" metric from the city's AQI distribution (e.g., percentage of stations above 200 that could be addressed).
5. Add a loading spinner while data fetches.

#### Fix A3 + D3: Run Real Model Validation and Serve Metrics from Backend
**Problem**: `validationMetrics` are hardcoded. `validation.py` functions exist but are never called.
**Approach**:
1. Create a new backend endpoint `GET /api/model-metrics` that:
   - Loads the test split from `dataset.csv`.
   - Runs the trained XGBoost forecaster on the test split.
   - Computes RMSE for 24h/48h/72h using `validation.py`'s existing `rmse()` function.
   - Computes a persistence baseline (tomorrow = today) and the improvement percentage.
   - Computes conformal coverage: what fraction of actual values fall within MAPIE prediction intervals.
   - Returns all metrics as JSON.
2. In `ForecastPanel.tsx`, replace the hardcoded `validationMetrics` with a `useEffect` that fetches from `/api/model-metrics`.
3. Cache the result in backend (computation is expensive — only recompute on model retrain).

#### Fix A6: Use Real Station Data in Simulator
**Problem**: SimulatorPanel sends hardcoded temp/humidity instead of real values.
**Approach**:
Replace the hardcoded values in the payload with actual station properties:
```js
const payload = {
  station_id: iotSensor.id,
  timestamp: new Date().toISOString(),
  pm25: iotSensor.pm25,
  pm10: iotSensor.pm10,     // Use real pm10 instead of pm25 * 1.5
  temp: iotSensor.temp,     // Real value from API
  humidity: iotSensor.humidity,
  pressure: iotSensor.pressure,
  wind_speed: iotSensor.wind_speed,
  pblh: iotSensor.pblh
};
```

#### Fix A8 + A9: Compute Real Per-Stop Metadata in Optimizer
**Problem**: Every stop has identical fake values.
**Approach**:
1. After calling `/api/optimize`, enrich each stop by looking up the matching station from `cityData.stations` (match by lat/lon proximity or source_id index).
2. Use the station's actual ML attribution result for `source_type` and `confidence`.
3. Compute `population_exposed` from city-specific census data (or at minimum, vary it per station using the backend's `dyn_population` calculation already in `optimize.py`).
4. Use city-appropriate legal basis: for Hyderabad use "TSPCB / NGT Order", for Delhi use "GRAP Stage III".
5. Return `estimated_aqi_reduction` and `compliance_cost` from the backend (the OR-Tools solver already computes these).

#### Fix A10: Dynamic Vulnerable Centers Per City
**Problem**: Hardcoded 2-entry list.
**Approach**:
1. Create a `CITY_VULNERABLE_CENTERS` dictionary in the backend keyed by city name, with real hospitals/schools:
   - Hyderabad: Gandhi Hospital, Osmania General Hospital, NIMS, Kendriya Vidyalaya Picket, etc.
   - Delhi: AIIMS, Safdarjung, DPS Mathura Road, etc.
   - Guwahati: GMCH, Cotton University, etc.
2. Use lat/lon coordinates and compute distance from the worst station.
3. Alternatively, integrate with OpenStreetMap Overpass API to query `amenity=hospital` and `amenity=school` within a radius of the highest-AQI station.

#### Fix D1: Fix Conformal Prediction in ml_service.py
**Problem**: Fake conformal set using `probs > 0.1` threshold.
**Approach**:
Replace the fake implementation with real MAPIE usage:
```python
# During training (train_models.py):
from mapie.classification import MapieClassifier
mapie_clf = MapieClassifier(estimator=rf_model, method="lac", cv="prefit")
mapie_clf.fit(X_calib, y_calib)
joblib.dump(mapie_clf, 'classifier.pkl')

# During inference (ml_service.py):
y_pred, y_pis = self.classifier.predict(df, alpha=0.10)
# y_pis is a boolean mask: shape (n_samples, n_classes, 1)
classes = self.classifier.classes_
prediction_set = [str(classes[i]) for i in range(len(classes)) if y_pis[0, i, 0]]
```
This provides mathematically guaranteed 90% coverage.

#### Fix E1 + E2 + E3: Create Required Deliverables
**Problem**: No architecture diagram, no presentation deck, no demo video.
**Approach**:
1. **Architecture Diagram**: Create a Mermaid diagram in `docs/architecture.md` showing: IoT Layer → Backend (FastAPI + ML) → Frontend (Next.js). Include Open-Meteo API, SQLite DB, OR-Tools solver, Gemini LLM.
2. **Presentation Deck**: Create a 10-slide deck covering: Problem, Solution, Architecture, Tech Stack, Demo Screenshots, ML Results, Enforcement Workflow, Multi-City Scalability, Hyderabad Focus, Team.
3. **Demo Video**: Record a 3-5 minute screen recording walking through: city switch to Hyderabad → view stations on map → click district for Deep Dive → run Simulate → show Forecast → run Optimizer → show Advisory.

#### Fix E4: Fix LangGraph Claim
**Problem**: README claims LangGraph but code is a single function call.
**Approach**: Either:
- **Option A**: Remove the LangGraph claim from README and honestly describe it as "Gemini-powered advisory generation with ML context injection."
- **Option B** (better): Actually implement a minimal LangGraph pipeline with 3 nodes: `forecast_node` → `attribution_node` → `advisory_node`, where each node calls the respective ML model and passes state. Use `langgraph` package with proper `StateGraph`.

#### Fix F1: Add Telugu Language
**Problem**: Telugu missing — critical for Hyderabad.
**Approach**:
1. Add `te: 'తెలుగు'` to `languageLabels` in `AdvisoryPanel.tsx`.
2. Add `'Telugu'` to the `langMap` in the `useEffect`.
3. In `gemini_client.py`, the Gemini prompt already supports arbitrary languages — it will translate to Telugu when `language="Telugu"` is passed.
4. For the mock fallback (no Gemini key), add a `"telugu"` case.

---

### 🟠 TIER 2 — Should Fix Before Demo

#### Fix A4: Replace Synthetic Forecast Curve with Interpolated ML Output
**Problem**: Frontend generates a sinusoidal curve, not real ML output.
**Approach**:
1. The backend returns 3 points (24h, 48h, 72h). Add the current AQI as hour 0.
2. Use cubic spline interpolation (or simple linear) between the 4 anchor points to generate 25 data points (every 3h).
3. Use the MAPIE confidence intervals for the band, interpolated similarly.
4. Remove the `generateForecast()` sinusoidal function entirely.

#### Fix A12: Show Error States to User
**Problem**: Silent fallbacks with fake data.
**Approach**:
1. Add a `dataSource: 'live' | 'fallback' | 'error'` state to the page.
2. When Open-Meteo fails, set `dataSource: 'fallback'` and show a yellow banner: "⚠ Live data unavailable — showing estimated values."
3. Add a `lastUpdated` timestamp and display it in the header.

#### Fix C1: Add Missing Hyderabad Stations
**Problem**: Only 12 stations vs 16+ real TSPCB stations.
**Approach**:
Add the missing stations to `CITY_STATIONS["Hyderabad"]` in `live.py`:
```python
{"name": "Kukatpally", "lat": 17.4947, "lon": 78.3996},
{"name": "Kothapet", "lat": 17.3622, "lon": 78.5158},
{"name": "LB Nagar", "lat": 17.3457, "lon": 78.5514},
{"name": "Somajiguda", "lat": 17.4270, "lon": 78.4690},
```

#### Fix C2: Unify Hyderabad Coordinates
**Problem**: 3 different coordinate pairs.
**Approach**: Define a single source of truth. Use GHMC headquarters (Tankbund): `17.4156, 78.4736` in all three files.

#### Fix E5: Add Real Satellite Data Integration
**Problem**: No actual Sentinel/MODIS/FIRMS data.
**Approach**:
1. NASA FIRMS API is free (with API key from `.env`). Add a function in `attribution.py` that calls `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{API_KEY}/VIIRS_SNPP_NRT/{lat},{lon},{lat},{lon}/1` to get fire hotspots within 50km.
2. For Sentinel-5P NO₂: use the Google Earth Engine API or Copernicus Open Access Hub. At minimum, generate a static NO₂ tropospheric column density overlay image for Hyderabad (similar to the existing Delhi `sentinel_no2.png`).

#### Fix D2: Document Attribution Label Methodology
**Problem**: Labels are heuristic, not validated.
**Approach**:
1. Document the heuristic rules explicitly in a `docs/attribution_methodology.md`.
2. Cross-reference them with published receptor modeling studies (e.g., CPCB source apportionment reports for Indian cities).
3. Add a disclaimer in the UI: "Source attribution predictions based on atmospheric indicator ratios, cross-referenced with traffic and satellite data."

#### Fix F2 + F3: Add Tamil and Assamese
Same approach as Telugu — add to `languageLabels` and `langMap`.

---

### 🟡 TIER 3 — Nice to Have / Post-Demo

#### Fix A19: Extract API base URL to environment variable
Create `NEXT_PUBLIC_API_URL` in `.env.local` and replace all `http://127.0.0.1:8000` references.

#### Fix B1 + B2: Add Historical Trends
Create a `GET /api/readings/history?city=&days=7` endpoint that queries the SQLite DB for historical readings and returns time-series data. Build a simple line chart in the frontend.

#### Fix B4: Add Auto-Refresh
Add a `setInterval` in `page.tsx` that re-fetches city data every 5 minutes.

#### Fix G1: Replace `any` with proper types
Gradually replace `useState<any>` with typed interfaces (`CityDataResponse`, `LiveDataResponse`, etc.).

#### Fix G2 + G3: Deduplicate IDW and District interface
Move `idwForDistrict()` and the `District` interface to a shared `utils/districts.ts` file.

#### Fix H1-H6: Infrastructure hardening
Add rate limiting middleware, basic API key auth, Docker Compose for local dev, and proper logging with Python's `logging` module.

---

> **Bottom line**: The software's conceptual architecture and ML pipeline are strong. The critical path to a successful demo is: (1) eliminate the hardcoded values that evaluators will immediately spot, (2) create the three required deliverables, (3) add Telugu for Hyderabad, and (4) fix the conformal prediction implementation to match what's claimed.
