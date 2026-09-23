# VayuBudhi 2.0: Master Step-by-Step Industry Transformation Plan

> **Document Status**: Official Engineering & Product Execution Blueprint  
> **Active Branch**: `feature/startup-scale-roadmap`  
> **Format**: Text-first, clean Markdown with interactive progress tracking checklists  
> **Target Standard**: Municipal Government Contract & Enterprise Cloud Deployment  
> **Date**: September 2026  

---

## 1. Executive Vision & Core Value Proposition

VayuBudhi is an environmental **decision and closed-loop enforcement intelligence platform**. Rather than functioning as another consumer AQI monitoring app, VayuBudhi equips municipal corporations (GHMC, TSPCB, DPCC, BBMP) to solve an operational optimization problem:

> *"Given a city's limited fleet of enforcement vans, field inspectors, and surveillance drones, where should they go right now, with what statistical certainty, and what is the measurable public health ROI of intervening?"*

### The Three Operational Layers

1. **Layer 1: Ground-Truth Ingestion Layer**
   - Consumes official CPCB CAAQMS government stations (via `data.gov.in`).
   - Uses OpenAQ v3 as a global sensor network mirror and fallback.
   - Ingests telemetry from calibrated municipal IoT nodes (SPS30 + SGP41).
2. **Layer 2: Scientific Core & Decision Engine**
   - Dual-standard AQI engine implementing official CPCB 2014 NAQI and US EPA 40 CFR formulas.
   - Conformal 24h/48h/72h forecasting with mathematically guaranteed 90% confidence intervals.
   - Physics-informed source attribution using multi-signal receptor modeling.
   - OR-Tools Vehicle Routing Problem (VRP) solver scaled by real population exposure.
3. **Layer 3: Production User Surfaces**
   - **Municipal Command Console**: 3D spatial map for city officers, dispatch routing, and CPCB compliance reports.
   - **Mobile Field App**: GPS turn-by-turn navigation for inspectors, photo evidence upload, and outcome verification logging.
   - **Public Citizen Widget**: Embeddable widget for municipal portals with multilingual health advisories.

---

## 2. Master Progress Dashboard

Use this section to track overall project readiness across all 7 phases:

| Phase | Gate Target | Focus Area | Status | Completion |
| :--- | :---: | :--- | :---: | :---: |
| **Phase 0** | **Gate G0** | Truth Reset, De-faking & Provenance | 🟡 In Progress | **80%** |
| **Phase 1** | **Gate G1** | Real-Time Ingestion & Time-Series Storage | 🟡 In Progress | **40%** |
| **Phase 2** | **Gate G2** | Platform Foundation, CI/CD & Security | ⚪ Not Started | **0%** |
| **Phase 3** | **Gate G3** | Conformal ML & Multi-Signal Receptor Modeling | ⚪ Not Started | **0%** |
| **Phase 4** | **Gate G4** | Hardware 2.0 Fleet & Field Calibration | ⚪ Not Started | **0%** |
| **Phase 5** | **Gate G5** | First Paid Municipal Pilot (Hyderabad GHMC) | ⚪ Not Started | **0%** |
| **Phase 6** | **Gate G6** | Multi-Tenant Scale & Regulatory Certification | ⚪ Not Started | **0%** |

---

## 3. Phase 0 Audit: Current Status of Codebase Cleanliness

We performed a deep code audit to verify whether hardcoded values, synthetic multipliers, and fabricated calculations have been purged:

### What Is Completed (Verified Done)
- [x] **Deleted Station Multipliers**: Completely removed `micro_factor = 1.20 if (i % 3 == 0)...` and `spatial_mult` in `live.py`. All physical stations now serve genuine measurements.
- [x] **Integrated Official Dual AQI Engine**: Built `backend/app/aqi_standards.py` with exact linear interpolation for all 8 pollutants (CPCB 2014 & US EPA 40 CFR). Unit tests pass 100% (4/4).
- [x] **Resolved CO Lethal Concentration Bug**: Normalized CO telemetry from $\mu\text{g/m}^3$ to $\text{mg/m}^3$ ($>5.0 \rightarrow / 1000$). Stations no longer force an inflated 500 "Severe" score.
- [x] **Enforced CPCB Particulate Requirement**: Enforced the official CPCB rule: an AQI requires at least one particulate measurement ($\text{PM}_{2.5}$ or $\text{PM}_{10}$). Single trace-gas readings no longer calculate false "Good" AQI scores.
- [x] **Authentic Station & Ward Geometry**: True CAAQMS stations mapped to exact physical GPS coordinates. Unmonitored wards are shaded neutral slate-grey (`#64748b`) with hover attribution to nearest active station.
- [x] **Database Schema Ready**: Added `Station` and `StationObservation` models to `backend/app/models.py`.

### What Remains to Be Cleaned (Sprint 1 Items)
- [ ] **Hex Grid Inverted PM2.5**: Line 343 in `live.py` still computes `pm25 = round(cell_aqi * 0.4)` (derives concentration from AQI instead of the reverse). Must be replaced with spatial IDW.
- [ ] **Report Formulas**: `backend/app/routers/report.py` still computes synthetic VOC index (`pm25 * 1.8 + so2 * 1.2`) and NOx index (`no2 / 20.0`). Must be removed or grounded in real sensors.
- [ ] **Attribution Heuristics**: `ml_model/src/source_labeling.py` still uses 4-rule hand-coded thresholds. Queued for replacement with multi-signal receptor modeling in Phase 3.
- [ ] **PINN Mock Label**: `backend/app/physics_engine.py` has an explicitly labeled `plume_inversion_pinn_mock`. Must document Gaussian plume as the active physical prior and PINN as research roadmap.

---

## 4. API Keys & Live Connectivity Status

All external API keys are active in `.env` and `backend/.env` (gitignored for security). Live connectivity was tested and confirmed:

- **CPCB / Data.gov.in API**:
  - Key: `DATAGOV_API_KEY` configured in `.env`
  - Resource ID: `3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69`
  - Status: **VERIFIED ACTIVE** (Successfully fetched live station records).
- **OpenAQ v3 API**:
  - Key: `OPENAQ_API_KEY` configured in `.env`
  - Base URL: `https://api.openaq.org/v3`
  - Status: **VERIFIED ACTIVE** (Successfully fetched active monitoring locations across India).
- **TomTom Traffic Flow API**:
  - Key: `TOMTOM_API_KEY` configured in `.env`
  - Status: **VERIFIED ACTIVE** (Used for real-time vehicular congestion scoring).
- **Open-Meteo Atmospheric APIs**:
  - Weather & Air Quality URLs configured
  - Status: **VERIFIED ACTIVE** (Used for meteorological PBLH, wind, humidity, and CAMS background).

---

## 5. Step-by-Step Industry Transformation Roadmap

---

### Phase 0: Complete the Truth Reset (Gate G0)
*Target Gate: G0 — "Nothing on screen is fabricated"*

- [ ] **Step 0.1: Clean Up Hex Grid Calculations**
  - **What**: Replace line 343 in `backend/app/routers/live.py` (`pm25 = cell_aqi * 0.4`).
  - **Why**: AQI is always derived from pollutant concentrations, never the reverse. Inverting it creates scientifically invalid values.
  - **Action**: Use Inverse Distance Weighting (IDW) from monitored stations or CAMS background concentration to populate grid cells.
- [ ] **Step 0.2: Remove Arbitrary Report Formulas**
  - **What**: Delete line 62–63 in `backend/app/routers/report.py` (`voc = pm25 * 1.8...` and `nox = no2 / 20.0`).
  - **Why**: VOC and NOx cannot be guessed from PM2.5; doing so misinforms municipal health officers.
  - **Action**: Return `--` (sensor offline / unequipped) when a station lacks physical VOC/NOx hardware.
- [ ] **Step 0.3: Clarify Physics Engine Status**
  - **What**: Update `backend/app/physics_engine.py` line 98–129.
  - **Why**: The code comments say "plume_inversion_pinn_mock". An enterprise platform must state capabilities honestly.
  - **Action**: Document Gaussian plume dispersion as the operational physical prior; label PINN inverse optimization as research roadmap.
- [ ] **Step 0.4: Enforce Provenance Metadata**
  - **What**: Tag every telemetry reading in API responses with explicit provenance:
    `source: "measured_cpcb" | "calibrated_iot" | "modelled_cams"`
  - **Why**: City officers need to know which numbers come from certified government analyzers vs low-cost sensors vs atmospheric models.

**Gate G0 Exit Criteria**:
- `git grep -E "micro_factor|i % 3|random\.uniform" backend/ ml_model/` returns zero matches.
- All unit tests pass: `pytest backend/app/test_endpoints.py backend/app/test_aqi_standards.py`.

---

### Phase 1: Real-Time Ingestion & Time-Series Storage (Gate G1)
*Target Gate: G1 — "72 hours unattended operation, zero telemetry gaps"*

- [ ] **Step 1.1: FastAPI Background Ingestion Lifecycle**
  - **What**: Wire `backend/app/ingestion/scheduler.py` into FastAPI's startup lifecycle (`lifespan` in `backend/app/main.py`).
  - **Why**: Currently, ingestion workers must be triggered manually from the command line. In production, telemetry must sync automatically.
  - **Action**: Start a background task on server startup that executes `run_cpcb_ingestion()` every 15 minutes and `run_openaq_ingestion()` every 60 minutes.
- [ ] **Step 1.2: Persistent Time-Series Storage (TimescaleDB)**
  - **What**: Deploy PostgreSQL 16 with the TimescaleDB extension using `backend/app/scripts/setup_timescaledb.sql`.
  - **Why**: SQLite is single-writer and will lock under concurrent writes from multiple IoT nodes and workers. TimescaleDB partitions time-series observations automatically into 7-day chunks with 90% compression.
  - **Action**: Create hypertables for `station_observations` and `sensor_readings`. Ensure local development continues to work seamlessly on SQLite WAL mode.
- [ ] **Step 1.3: HTTP Client Pooling & Circuit Breakers**
  - **What**: Create `backend/app/http_client.py` using `httpx.AsyncClient` with connection pooling and retry backoff.
  - **Why**: Raw `requests.get` calls suffer from Windows socket exhaustion and unhandled timeouts.
  - **Action**: Configure connection pools (max 20 connections) and circuit breakers for external APIs (Open-Meteo, TomTom, Data.gov.in) that trip after 3 consecutive failures and serve cached data with an `is_stale: true` badge.
- [ ] **Step 1.4: Modular Backend Service Restructuring**
  - **What**: Split the 970-line `backend/app/routers/live.py` into dedicated service modules:
    - `app/services/observations.py`: Station queries and database access.
    - `app/services/meteorology.py`: Atmospheric boundary layer, wind vectors, and dispersion.
    - `app/services/traffic.py`: TomTom corridor flow and congestion scoring.
    - `app/routers/live.py`: Clean endpoint routing only.

**Gate G1 Exit Criteria**:
- 72-hour unattended soak test with continuous 15-minute ingestion ticks.
- Average `/api/city-data` response time < 500 ms warm.

---

### Phase 2: Platform Foundation, CI/CD & Enterprise Security (Gate G2)
*Target Gate: G2 — "Deployable, containerized, securely authenticated platform"*

- [ ] **Step 2.1: Multi-Stage Containerization**
  - **What**: Create production Docker configurations:
    - `backend/Dockerfile`: Multi-stage Python 3.11-slim build running as non-root user.
    - `frontend/Dockerfile`: Standalone Next.js production build.
    - `docker-compose.yml`: Local production stack linking API, Ingestion Worker, PostgreSQL/TimescaleDB, and Redis.
- [ ] **Step 2.2: Continuous Integration Pipeline (GitHub Actions)**
  - **What**: Create `.github/workflows/ci.yml` running on every pull request:
    - Python linting (`ruff`) and static type checks (`mypy backend/`).
    - Frontend linting and type checks (`tsc --noEmit`).
    - Automated unit tests (`pytest`).
    - Secret scanning (`gitleaks`) to prevent credential leaks.
- [ ] **Step 2.3: Enterprise Authentication & Role-Based Access Control (RBAC)**
  - **What**: Implement JWT authentication (RS256) with 4 distinct roles:
    - `super_admin`: Full system diagnostics, OTA firmware management, global telemetry.
    - `city_officer`: Municipal dispatch approval, threshold configuration, legal report generation.
    - `field_inspector`: Mobile route view, photo evidence upload, outcome logging.
    - `public_viewer`: Read-only city ambient AQI map.
  - **Action**: Replace `allow_origins=["*"]` with verified tenant domain allow-lists.
- [ ] **Step 2.4: Data Sovereignty & DPDP Act 2023 Compliance**
  - **What**: Deploy cloud infrastructure in an Indian cloud region (AWS Mumbai `ap-south-1` or GCP Mumbai `asia-south1`).
  - **Why**: Indian government environmental data must remain within national borders per MeitY and DPDP Act guidelines.

**Gate G2 Exit Criteria**:
- CI pipeline green on 100% of pull requests.
- Staging URL protected by JWT login with zero critical vulnerabilities on security scans.

---

### Phase 3: Conformal ML & Multi-Signal Receptor Modeling (Gate G3)
*Target Gate: G3 — "Scientific credibility: metrics we would defend in front of a professor"*

- [ ] **Step 3.1: High-Density Hourly Temporal Training**
  - **What**: Transition ML training from the daily 2,178-row CSV to the 457,000-row hourly historical CAAQMS dataset.
  - **Why**: 24/48/72h forecasting on daily data is statistically underpowered. Hourly training captures the diurnal convective boundary layer cycle.
  - **Action**: Train CatBoost and XGBoost regressors on true 24h, 48h, and 72h targets using chronological / blocked time-series cross-validation (no random shuffling).
- [ ] **Step 3.2: True MAPIE Conformal Prediction Inference**
  - **What**: Replace the threshold approximation (`probs > 0.10`) in `ml_service.py` with genuine `MapieClassifier.predict()` and `MapieRegressor.predict()`.
  - **Why**: Thresholding probabilities provides zero statistical guarantees. MAPIE conformal prediction guarantees 90% empirical coverage ($\alpha = 0.10$).
  - **Action**: Serve true prediction sets (e.g. `["vehicular", "industrial"]`). When the set size is > 2, flag high uncertainty to trigger drone reconnaissance rather than enforcement dispatch.
- [ ] **Step 3.3: Multi-Signal Weak Supervision (Receptor Modeling)**
  - **What**: Replace 4-rule hand-coded labeling in `source_labeling.py` with multi-signal evidence:
    - **Vehicular**: High TomTom congestion + high $\text{NO}_2/\text{PM}_{2.5}$ ratio during morning and evening rush hours.
    - **Industrial**: High $\text{SO}_2$ + geographic containment within OpenStreetMap industrial land-use polygons.
    - **Biomass / Open Waste**: High $\text{PM}_{2.5}/\text{PM}_{10}$ ratio (>0.75) + NASA FIRMS MODIS/VIIRS thermal fire pixels within 15 km upwind.
    - **Dust**: High wind speed (>5 m/s) + low $\text{PM}_{2.5}/\text{PM}_{10}$ ratio (<0.35).
- [ ] **Step 3.4: Analytical Pasquill-Gifford Gaussian Dispersion**
  - **What**: Replace the mock plume inversion in `physics_engine.py` with an analytical Pasquill-Gifford dispersion parameterization based on atmospheric stability classes (A through F).
- [ ] **Step 3.5: OR-Tools Solver Hardening with Real Exposure Data**
  - **What**: Replace synthetic solver inputs (`population = aqi * 150`) with real population density grids (WorldPop / Census GIS data).
  - **Why**: Enforcement ROI must measure real avoided population exposure ($ROI = \frac{\Delta \text{Exposure} \times \text{Health Cost}}{\text{Patrol Operating Cost}}$).

**Gate G3 Exit Criteria**:
- 24h forecast achieves $R^2 \ge 0.65$ on chronological test split.
- Conformal prediction sets maintain $\ge 88\%$ empirical coverage over 10,000 evaluation samples.
- Label provenance document published cross-referencing published receptor modeling studies.

---

### Phase 4: Hardware 2.0 Fleet Architecture & Field Calibration (Gate G4)
*Target Gate: G4 — "10 nodes reporting for 30 days, empirical calibration curve published"*

- [ ] **Step 4.1: Industrial Firmware Architecture (PlatformIO C++)**
  - **What**: Unify firmware into a modular PlatformIO FreeRTOS project (`iot_firmware/`):
    - Task 1: Sensor acquisition (SPS30 via I2C every 30s, SGP41 every 10s, BME280 every 60s).
    - Task 2: Edge $\kappa$-Köhler Relative Humidity compensation:
      $$\text{PM}_{2.5\text{ corrected}} = \frac{\text{PM}_{2.5\text{ raw}}}{1 + \kappa \cdot \left(\frac{\text{RH}}{100 - \text{RH}}\right)}$$
    - Task 3: Telemetry via MQTT over TLS 1.2 with device identity certificates.
    - Task 4: Power manager with deep sleep during battery depletion.
    - Flash queue (SPIFFS/NVS) to buffer up to 2,000 readings during cellular outages.
- [ ] **Step 4.2: Hardware 2.0 Bill of Materials (BOM ~$105/node)**
  - **Sensors**: Sensirion SPS30 (laser optical particulate with auto-cleaning fan, MCERTS-certified) + Sensirion SGP41 (VOC and $\text{NO}_x$ indexes).
  - **MCU**: ESP32-S3-WROOM-1 (hardware crypto acceleration for TLS).
  - **Cellular**: SIMCom SIM7000G (NB-IoT / LTE Cat-M1 + GNSS).
  - **Power**: TI BQ25185 MPPT solar charger + 3500mAh 18650 Li-ion battery + 6V/2W solar panel.
  - **Enclosure**: IP65 UV-stabilized ABS enclosure with PTFE breathable vent membrane.
- [ ] **Step 4.3: 30-Day CAAQMS Co-Location Calibration Study**
  - **What**: Co-locate 3–5 pilot nodes alongside an active government CAAQMS reference monitor (e.g. Sanjeevaiah Park, Hyderabad) for 30 consecutive days.
  - **Why**: Low-cost optical sensors suffer from humidity swelling and aerosol variation. Regulatory credibility requires an empirical calibration curve.
  - **Action**: Calculate and publish per-node metrics: slope, intercept, RMSE, and $R^2$.

**Gate G4 Exit Criteria**:
- 10 hardware nodes operating for 30 days with $>95\%$ network uptime.
- Calibration regression yields $R^2 \ge 0.85$ and slope between $0.80$ and $1.20$ against reference analyzers.

---

### Phase 5: First Paid Municipal Pilot & Enforcement Moat (Gate G5)
*Target Gate: G5 — "A municipal corporation pays and logs 200+ field outcomes"*

- [ ] **Step 5.1: Target City Focus: Hyderabad**
  - **What**: Partner with Greater Hyderabad Municipal Corporation (GHMC) and TSPCB.
  - **Why**: Hyderabad has the highest density of historical CAAQMS telemetry, pre-mapped municipal ward boundaries, and local operational access.
  - **Scope**: Deploy 25–50 nodes across 2 priority zones (Jeedimetla industrial corridor & Charminar commercial area).
- [ ] **Step 5.2: Municipal Command Console & Dispatch Integration**
  - **What**: Deploy the dedicated official surface:
    - High-density Deck.gl map featuring real-time station vectors, hotspot clusters, and OR-Tools optimized patrol routes.
    - Automated CPCB legal compliance violation reports (PDF) containing sensor calibration status, weather conditions, AI attribution confidence, and applicable environmental laws (Air Act 1981 Section 21).
- [ ] **Step 5.3: Closed-Loop Field Outcome Logging (The Proprietary Moat)**
  - **What**: Build a mobile check-in interface for field inspectors to verify dispatch stops:
    - Inspector arrives at AI-flagged hotspot.
    - Inspector logs field finding: *Source Confirmed (Biomass / Industrial / Vehicular)*, *False Alarm*, or *Action Taken*.
    - Uploads geo-tagged photo evidence.
  - **Why**: This feedback loop creates a proprietary ground-truth dataset that no competitor can buy. It is used to iteratively retrain the attribution models.

**Gate G5 Exit Criteria**:
- Signed municipal pilot agreement with commercial terms.
- 90 days continuous operation in 1–2 municipal zones.
- Over 200 logged field inspection outcomes validating AI source attribution.

---

### Phase 6: Multi-Tenant Scale & Regulatory Certification (Gate G6)
*Target Gate: G6 — "Repeatable enterprise SaaS across 3–5 cities"*

- [ ] **Step 6.1: Official Regulatory Certification**
  - **What**: Submit 90-day co-location data for official CPCB Type Approval under Indian Standard IS 5182.
  - **Why**: Without regulatory certification, municipal fines issued based on sensor data can be challenged in court.
- [ ] **Step 6.2: Multi-Tenant SaaS Architecture**
  - **What**: Organization and city isolation at database schema level.
  - **Action**: Automated onboarding workflow: bootstrap new cities via OpenStreetMap ward boundary import and CPCB station registration.
- [ ] **Step 6.3: Commercial Data Licensing APIs**
  - **What**: High-availability REST and WebSocket APIs providing hyperlocal air quality metrics to smart city integrators, real estate platforms, and health tech providers.

**Gate G6 Exit Criteria**:
- 3 to 5 paying municipal or corporate enterprise tenants.
- 99.5% API availability SLA.
- CPCB Type Approval application submitted or certified.

---

## 6. Immediate Action Checklist (Sprint 1)

Execute these tasks immediately to finalize Phase 0 and establish Phase 1:

- [ ] **Task 1: Fix Hex Grid Inverted PM2.5 (`backend/app/routers/live.py`)**
  - Replace line 343 (`pm25 = round(cell_aqi * 0.4)`) with Inverse Distance Weighting from monitored stations.
- [ ] **Task 2: Clean Up Report Formulas (`backend/app/routers/report.py`)**
  - Remove arbitrary formulas (`pm25 * 1.8 + so2 * 1.2` for VOC and `no2 / 20.0` for NOx); mark as `--` when physical sensors are absent.
- [ ] **Task 3: Wire Background Scheduler into FastAPI Lifespan (`backend/app/main.py`)**
  - Connect `scheduler.py` into FastAPI startup so `run_cpcb_ingestion()` runs every 15 minutes in the background.
- [ ] **Task 4: Run Initial CPCB Database Seed**
  - Execute `python -m app.ingestion.cpcb_worker` to populate `vayubudhi.db` with active stations and observations for Hyderabad, Delhi, and Bengaluru.
- [ ] **Task 5: Verify Frontend Standard Switcher & Slate-Grey Districts**
  - Test `[ 🇮🇳 India NAQI | 🇺🇸 US EPA ]` toggle on `http://localhost:3000` and confirm unmonitored districts display slate-grey with nearest center hover card.

---

## 7. Master Verification Command Suite

Run these commands in terminal to verify platform integrity at each milestone:

```bash
# 1. Verify Dual-Standard AQI Breakpoint Calculations
python -m pytest backend/app/test_aqi_standards.py -v

# 2. Verify FastAPI Route Contracts
python -m pytest backend/app/test_endpoints.py -v

# 3. Test Live CPCB / Data.gov.in Ingestion Feed
python -c "from app.ingestion.cpcb_worker import fetch_cpcb_records; print('CPCB records fetched:', len(fetch_cpcb_records(limit=10)))"

# 4. Test Live OpenAQ v3 Mirror Feed
python -c "from app.ingestion.openaq_worker import fetch_openaq_locations; print('OpenAQ locations fetched:', len(fetch_openaq_locations(limit=10)))"

# 5. Codebase Fabrication Audit (Must return clean 0 matches)
git grep -E "micro_factor|i % 3" backend/ ml_model/

# 6. Verify Frontend Strict TypeScript Compilation
cd frontend && npx tsc --noEmit
```
