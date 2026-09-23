# VayuBudhi 2.0: Complete Industry-Grade Platform Transformation Plan

> **Document Status**: Official Master Architecture & Engineering Roadmap  
> **Active Branch**: `feature/startup-scale-roadmap`  
> **Reference Document**: Based on the comprehensive system audit in `reference_implementation_plan.md`  
> **Target Standard**: Multi-Tenant Municipal Enterprise SaaS & CPCB Type Approval  

---

## 1. Executive Summary & Core Platform Vision

VayuBudhi is an environmental **decision and closed-loop enforcement intelligence platform**. While incumbent commercial solutions (IQAir, BreezoMeter, Plume Labs) operate as passive consumer air quality monitors, VayuBudhi is engineered specifically for municipal corporations and pollution control authorities (GHMC, TSPCB, DPCC, BBMP). It solves an operational optimization problem:

> *"Given a municipal authority's limited fleet of enforcement vans, field inspectors, and surveillance drones, where should they be dispatched right now, with what statistical certainty, and what is the measurable public health ROI of intervening?"*

To evolve from a hackathon prototype into a multi-tenant, high-concurrency, industry-grade platform, VayuBudhi must execute an end-to-end transformation across:
1. **Data Pipeline Reliability**: 24/7 unattended ingestion from official CPCB CAAQMS and OpenAQ v3 feeds with multi-tier failovers.
2. **High-Concurrency Multi-User Architecture**: Distributed Redis 7 caching, connection-pooled TimescaleDB hypertables, asynchronous worker decoupling, and sliding-window rate limiting.
3. **Machine Learning & Physics Refinement**: Hourly temporal models on 457k continuous rows, mathematically guaranteed MAPIE conformal prediction intervals, physics-grounded multi-signal receptor modeling, and real Pasquill-Gifford dispersion.
4. **Closed-Loop Enforcement Moat**: Field inspector outcome verification loop that generates proprietary ground-truth training data for source attribution and avoided-exposure ROI.

---

## 2. Competitive Analysis: Feature Comparison Matrix

The table below benchmarks VayuBudhi against leading global commercial air quality platforms:

| Capability / Feature | VayuBudhi (Target) | VayuBudhi (Today) | IQAir | BreezoMeter (Google) | Clarity Movement | OpenAQ | Plume Labs |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Real-time AQI Map** | ✅ Measured Stations | ⚠️ Hybrid / Modelled | ✅ Measured | ✅ Modelled | ✅ Own Fleet | ✅ Open Data | ✅ Hybrid |
| **Multi-City Indian Coverage** | ✅ 20+ Cities | ⚠️ 18 Cities | ✅ Global | ✅ Global | ⚠️ Sparse | ✅ Global | ✅ Global |
| **Dual AQI Standards (IN / US)** | ✅ Dynamic Switcher | 🟢 Built (`aqi_standards.py`) | ❌ Single | ❌ Single | ❌ Single | ⚠️ Raw Only | ❌ Plume AQI |
| **72h ML Forecasting** | ✅ Hourly Continuous | ⚠️ Daily Granular | ✅ | ✅ Deep Learning | ❌ | ❌ | ✅ |
| **Conformal Prediction Intervals** | ✅ True MAPIE (90%) | ⚠️ Threshold Shortcut | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None |
| **Source Attribution** | ✅ Multi-Signal Receptor | ⚠️ Heuristic Rules | ❌ None | ⚠️ Fire / Dust | ❌ None | ❌ None | ❌ None |
| **SHAP Driver Explainability** | ✅ Dynamic TreeSHAP | 🟢 Implemented | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None |
| **Physics Plume Dispersion** | ✅ Pasquill-Gifford | ⚠️ Mock Plume | ❌ None | ⚠️ Regional | ❌ None | ❌ None | ❌ None |
| **Enforcement VRP Routing** | ✅ OR-Tools + Exposure | ⚠️ Synthetic Inputs | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None |
| **Avoided Exposure ROI** | ✅ WorldPop Grid | ⚠️ Synthetic Multiplier | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None |
| **Multilingual LLM Advisories** | ✅ Cached Gemini Flash | ⚠️ Monolithic Template | ✅ | ❌ None | ❌ None | ❌ None | ⚠️ |
| **IoT Hardware Fleet Integration** | ✅ SPS30 + SGP41 + Cellular | ⚠️ Bench SDS011 | ✅ Own HW | ❌ None | ✅ Own HW | ❌ None | ✅ Flow |
| **High-Concurrency Caching** | ✅ Multi-Tier Redis 7 | ❌ In-Memory Dict | ✅ Redis | ✅ Cloud CDN | ✅ | ✅ | ✅ |
| **Production Time-Series DB** | ✅ TimescaleDB Hypertables | ⚠️ SQLite WAL | ✅ | ✅ BigQuery | ✅ Timescale | ✅ PostgreSQL | ✅ |
| **24/7 Automated Pipeline** | ✅ Async Scheduler | ⚠️ Lifespan Loop | ✅ 99.9% | ✅ 99.9% | ✅ 99.9% | ✅ 99.5% | ✅ 99.9% |
| **Security & RBAC (JWT)** | ✅ 4-Tier Role Auth | ❌ Unauthenticated | ✅ Enterprise | ✅ Enterprise | ✅ Enterprise | ⚠️ API Key | ✅ Consumer |
| **CI/CD & Containerization** | ✅ Docker + GH Actions | ❌ Local Scripts | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Regulatory Certification** | ✅ CPCB IS 5182 Target | ❌ Uncertified | ✅ Certified | ⚠️ Indicative | ✅ MCERTS/EPA | ❌ Data Only | ⚠️ Indicative |

> **VayuBudhi's Core Moat**: No competitor combines **conformal prediction intervals + physics-informed source attribution + OR-Tools enforcement vehicle routing + closed-loop field outcome verification**. Incumbents sell passive dashboards; VayuBudhi sells municipal enforcement optimization.

---

## 3. High-Concurrency & Multi-User Architecture

To handle thousands of concurrent citizens querying ambient AQI while municipal officers monitor patrol routes and hundreds of IoT nodes transmit telemetry, the platform must transition from local in-memory dictionaries to an enterprise distributed architecture.

```
[ Client Layer: Web Dashboard | Mobile Inspector App | Public Embed Widgets ]
                              │
                              ▼
    [ Reverse Proxy & Load Balancer: Nginx / Cloudflare CDN ]
                              │
                              ▼
             [ API Gateway: FastAPI Cluster (ASGI / Uvicorn) ]
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
   [ Rate Limiter ]    [ JWT Auth (RS256) ] [ Circuit Breakers ]
   (Redis Sliding Win) (RBAC: 4 Roles)     (Tenacity / Respx)
            │                 │                 │
            └─────────────────┼─────────────────┘
                              │
    ┌─────────────────────────┴─────────────────────────┐
    │                                                   │
    ▼                                                   ▼
[ L1 Cache: Redis 7 Cluster ]            [ L2 Storage: TimescaleDB / Postgres 16 ]
• Latest station readings (30s TTL)      • Partitioned observations (7d chunks)
• City rollup aggregates (15m TTL)       • Raw unmanipulated API payloads
• Multilingual advisories (3h TTL)       • Keyed forecasts & conformal bounds
• Session tokens & rate limit counters   • Enforcement routes & field outcomes
    │                                                   │
    └─────────────────────────┬─────────────────────────┘
                              │
                              ▼
        [ Asynchronous Worker Tier: APScheduler / Celery ]
        • Worker 1: CPCB CAAQMS ingestion (every 15 min)
        • Worker 2: OpenAQ v3 mirror & fallback (every 60 min)
        • Worker 3: TomTom traffic congestion pull (every 5 min)
        • Worker 4: Weekly ML retraining & drift evaluation
```

### Detailed Concurrency & Caching Specifications

1. **Redis Multi-Tier Cache Layer**:
   - **Endpoint Caching**: `/api/city-data` cached with a 15-minute TTL keyed by `city_name` and `aqi_standard`. Prevents database pounding when hundreds of users open the dashboard.
   - **Latest Station Telemetry**: Hot key `latest:station:{id}` refreshed on every ingestion cycle. Reads complete in sub-millisecond time.
   - **LLM Advisory Caching**: Cache generated health advisories in Redis under `advisory:{city}:{aqi_bucket}:{language}` with a 3-hour TTL. Protects against Gemini rate limits and cuts token costs by 95%.
   - **Cache Invalidation**: Explicit invalidation trigger whenever a scheduled ingestion worker writes fresh telemetry to TimescaleDB.

2. **Database Scalability & Connection Pooling**:
   - **TimescaleDB Hypertables**: Partition `station_observations` and `sensor_readings` by `timestamp` in 7-day chunks with automated zstd compression on data older than 7 days (achieving 90% storage reduction).
   - **Connection Pooling**: SQLAlchemy async engine with `pool_size=20`, `max_overflow=40`, `pool_pre_ping=True`, and `pool_recycle=300`. Prevents thread starvation and PostgreSQL connection exhaustion under high traffic.
   - **Read/Write Splitting**: Route heavy analytical map aggregation queries to PostgreSQL read replicas while ingestion workers write to the primary instance.

3. **Rate Limiting & Traffic Management**:
   - **Sliding-Window Rate Limiter**: Redis-backed rate limiting per IP and API key:
     - Public citizens: 120 requests/minute.
     - Municipal officers: 1,000 requests/minute.
     - IoT Hardware Ingestion: 10,000 requests/minute with device token authentication.
   - **Circuit Breakers**: Wrap external network calls (Open-Meteo, TomTom, NASA FIRMS) in circuit breakers. If an upstream fails 3 consecutive times, fail fast and serve cached data flagged with `is_stale: true` rather than blocking the event loop.

4. **Async Non-Blocking Architecture**:
   - Replace blocking synchronous `requests.get` with shared `httpx.AsyncClient` connection pools across all backend services.
   - Complete decoupling of telemetry ingestion from the API request path. Endpoints only read from Redis and TimescaleDB; they never wait for external government APIs to respond.

---

## 4. Machine Learning & Scientific Physics Refinement

To move beyond prototype heuristics, the modeling pipeline must be upgraded to rigorous, publishable atmospheric science standards:

### 4.1 Temporal Hourly Forecasting on Continuous Historical Data
- **Problem**: Models currently train on daily aggregated data (2,178 rows) with shuffled splits, which causes data leakage and obscures diurnal atmospheric cycles.
- **Solution**:
  - Train CatBoost and XGBoost models on the 457,000-row continuous hourly CAAQMS dataset.
  - Implement **blocked / chronological time-series cross-validation** (e.g. train on months 1–9, validate on months 10–12) to evaluate real forward-looking generalization.
  - Engineer physics-informed lag features: diurnal boundary layer convective collapse (PBLH $\times$ Wind Speed = Ventilation Index), 1h/3h/6h/24h concentration deltas, barometric pressure ratios, and relative humidity aerosol interaction terms.

### 4.2 True Inductive Conformal Prediction (MAPIE)
- **Problem**: Current serving code uses an ad-hoc probability threshold shortcut (`probs > 0.10`) that provides zero statistical coverage guarantees.
- **Solution**:
  - Integrate `MapieClassifier(method="lac", cv="prefit")` for source attribution and `MapieRegressor(method="plus", cv="prefit")` for 24h/48h/72h forecasting.
  - Compute non-conformity scores on a dedicated calibration dataset.
  - Guarantee an exact 90% empirical coverage rate ($\alpha = 0.10$).
  - When the prediction set contains multiple sources (e.g. `["vehicular", "biomass"]`), the system formally signals operational uncertainty, dispatching an aerial drone for reconnaissance instead of issuing an automated legal fine.

### 4.3 Multi-Signal Receptor Modeling (Replacing Heuristics)
- **Problem**: Current labeling uses arbitrary rules (`if pm25/pm10 > 0.8: "vehicular"`).
- **Solution**: Implement multi-signal physics-grounded weak supervision:
  - **Vehicular**: High TomTom congestion index ($> 0.6$) + elevated $\text{NO}_2/\text{PM}_{2.5}$ ratio during morning (08:00–10:30) and evening (17:30–20:30) traffic peaks.
  - **Industrial**: Elevated $\text{SO}_2$ concentrations + geographic downwind alignment with OpenStreetMap industrial zone polygons.
  - **Biomass / Open Waste**: High fine particulate ratio ($\text{PM}_{2.5}/\text{PM}_{10} > 0.75$) + NASA FIRMS MODIS/VIIRS thermal fire pixels within 15 km upwind + night/early morning hours.
  - **Dust / Construction**: Low fine particulate ratio ($\text{PM}_{2.5}/\text{PM}_{10} < 0.35$) + high ambient wind speed ($> 5\,\text{m/s}$) + daytime working hours.

### 4.4 Analytical Pasquill-Gifford Plume Dispersion
- **Problem**: `physics_engine.py` currently uses an arbitrary exponential cone labeled `_mock`.
- **Solution**: Implement analytical steady-state Gaussian plume dispersion:
  $$C(x, y, z) = \frac{Q}{2\pi u \sigma_y \sigma_z} \exp\left(-\frac{y^2}{2\sigma_y^2}\right) \left[ \exp\left(-\frac{(z - H)^2}{2\sigma_z^2}\right) + \exp\left(-\frac{(z + H)^2}{2\sigma_z^2}\right) \right]$$
  where dispersion coefficients $\sigma_y(x)$ and $\sigma_z(x)$ are dynamically parameterized from Briggs formulas based on Pasquill-Gifford atmospheric stability classes (A through F) derived from solar radiation, wind speed, and nocturnal cloud cover.

---

## 5. Detailed Step-by-Step Implementation Roadmap

The transformation is structured across 8 gated engineering phases:

```
[ Phase 1: Pipeline Reliability & Ground Truth ]
                       │
                       ▼
[ Phase 2: Production Time-Series Database ]
                       │
                       ▼
[ Phase 3: Cloud Infrastructure & Security ]
                       │
                       ▼
[ Phase 4: Machine Learning Refinement & MLOps ]
                       │
                       ▼
[ Phase 5: Automated Testing, CI/CD & Observability ]
                       │
                       ▼
[ Phase 6: Hardware 2.0 Fleet & Calibration ]
                       │
                       ▼
[ Phase 7: Municipal Pilot & Decision Loop (GHMC) ]
                       │
                       ▼
[ Phase 8: Multi-Tenant Scale & Regulatory Certification ]
```

---

### Phase 1: Pipeline Reliability & Ground-Truth Provenance
> **Primary Goal**: Eliminate all synthetic multipliers, de-fake all calculations, and establish 24/7 unattended ingestion.

- **Step 1.1: Complete Truth Reset in Routing Code**
  - Delete `micro_factor = 1.20 if (i % 3 == 0)...` and `spatial_mult` from `live.py`.
  - Replace line 343 in `live.py` (`pm25 = round(cell_aqi * 0.4)`) with Inverse Distance Weighting from monitored physical stations.
  - Remove arbitrary formulas from `report.py` (`voc = pm25 * 1.8...` and `nox = no2 / 20.0`); return unmonitored status (`--`) when sensors are absent.
- **Step 1.2: Standardize Dual AQI Engine**
  - Ensure all endpoints query `backend/app/aqi_standards.py` for both India NAQI (CPCB 2014) and US EPA (40 CFR Part 58).
  - Enforce CPCB particulate requirement rule and automatic CO normalization ($>5.0 \rightarrow / 1000$).
- **Step 1.3: Asynchronous Ingestion Scheduler Lifecycle**
  - Hook `backend/app/ingestion/scheduler.py` into FastAPI's `lifespan` handler in `backend/app/main.py`.
  - Ingestion worker queries `data.gov.in` every 15 minutes and OpenAQ v3 every 60 minutes in an independent non-blocking background thread.
- **Step 1.4: Explicit Provenance Metadata**
  - Every API response must tag readings with `provenance: "measured_cpcb" | "calibrated_iot" | "modelled_cams"`, `observed_at`, and `data_age_seconds`.

---

### Phase 2: Production Time-Series Database Architecture
> **Primary Goal**: Transition from single-writer SQLite to an enterprise TimescaleDB hypertable tier.

- **Step 2.1: TimescaleDB Cloud Provisioning**
  - Deploy PostgreSQL 16 with the TimescaleDB extension on managed cloud instances (Cloud SQL or AWS RDS).
  - Execute `backend/app/scripts/setup_timescaledb.sql` to establish `station_observations` and `sensor_readings` hypertables partitioned into 7-day intervals.
- **Step 2.2: Compression & Retention Policies**
  - Enable native TimescaleDB chunk compression on observations older than 7 days using zstd compression.
  - Establish a 1-year retention policy for raw high-frequency telemetry and a continuous aggregate policy for hourly/daily rollups.
- **Step 2.3: Connection Pooling & Async Engine**
  - Configure SQLAlchemy async engine with connection pooling (`pool_size=20`, `max_overflow=40`) in `backend/app/database.py`.
  - Maintain SQLite WAL mode fallback for zero-dependency local developer setups.
- **Step 2.4: Alembic Migration Pipeline**
  - Initialize Alembic version-controlled schema migrations for all future model adjustments.

---

### Phase 3: Cloud Infrastructure, Multi-Tenancy & Enterprise Security
> **Primary Goal**: Secure the platform, implement multi-tenant role access, and deploy multi-tier Redis caching.

- **Step 3.1: Multi-Stage Production Containerization**
  - Author `backend/Dockerfile` (multi-stage Python 3.11-slim, non-root user).
  - Author `frontend/Dockerfile` (Next.js standalone production output).
  - Create `docker-compose.yml` orchestrating API, Ingestion Worker, TimescaleDB, and Redis.
- **Step 3.2: Distributed Redis 7 Caching Layer**
  - Deploy managed Redis (Memorystore / ElastiCache).
  - Cache `/api/city-data` (15-min TTL) and LLM health advisories (3-hour TTL).
  - Implement Redis-backed sliding-window rate limiting.
- **Step 3.3: JWT Authentication & 4-Tier RBAC**
  - Implement RS256 asymmetric JWT verification supporting four distinct user roles:
    - `super_admin`: Full infrastructure control, OTA firmware updates, global telemetry.
    - `city_officer`: Municipal dispatch approval, threshold configuration, legal report generation.
    - `field_inspector`: Mobile route view, photo evidence upload, outcome logging.
    - `public_viewer`: Read-only city ambient AQI map.
- **Step 3.4: Security Hardening & Data Sovereignty**
  - Replace `allow_origins=["*"]` with verified tenant domain allowlists.
  - Deploy exclusively in Indian cloud data centers (AWS Mumbai `ap-south-1` or GCP Mumbai `asia-south1`) to satisfy MeitY and DPDP Act 2023 regulations.

---

### Phase 4: Machine Learning Refinement & MLOps Hardening
> **Primary Goal**: Replace prototype models with continuous hourly training, true conformal MAPIE sets, and weak-supervision receptor modeling.

- **Step 4.1: Hourly Temporal Training Pipeline**
  - Ingest the 457k-row continuous hourly CAAQMS dataset.
  - Train CatBoost and XGBoost models on true 24h, 48h, and 72h targets using blocked chronological cross-validation.
- **Step 4.2: End-to-End MAPIE Conformal Prediction Serving**
  - Wrap classification and regression models in MAPIE estimators.
  - Serve mathematically guaranteed 90% confidence prediction sets in `ml_service.py`.
- **Step 4.3: Multi-Signal Receptor Modeling (Attribution v2)**
  - Integrate dynamic feature inputs: TomTom traffic congestion, OSM industrial land-use polygons, and NASA FIRMS active fire pixels.
  - Correlate with wind direction sectors to replace heuristic attribution rules.
- **Step 4.4: MLOps Registry & Evaluation Gates**
  - Deploy MLflow model registry tracking artifact hashes, hyperparameters, and evaluation metrics.
  - Establish automated deployment gates: block candidate models if RMSE or 90% coverage regresses.

---

### Phase 5: Automated Testing, CI/CD & Observability
> **Primary Goal**: Achieve >80% automated test coverage, continuous integration, and real-time APM monitoring.

- **Step 5.1: Comprehensive Pytest Suite**
  - Unit tests for all AQI formulas, Pasquill-Gifford dispersion functions, and feature engineering.
  - Contract integration tests for all 22 FastAPI endpoints using `respx` mocked external APIs.
- **Step 5.2: Frontend E2E & Type Safety**
  - Playwright end-to-end smoke tests covering the 5 main user pages.
  - Enforce zero TypeScript errors (`tsc --noEmit`) and strict ESLint compliance.
- **Step 5.3: Automated CI Pipeline (GitHub Actions)**
  - Setup `.github/workflows/ci.yml` running linting, type checks, unit tests, and Gitleaks secret scanning on every pull request.
- **Step 5.4: Observability & Alerting**
  - Sentry integration for real-time error tracking (backend + frontend).
  - Prometheus metrics (`/metrics`) tracking API latency, cache hit ratios, and model inference duration.
  - Grafana dashboard with alert escalation policies for stale ingestion ticks (>60 min).

---

### Phase 6: Hardware 2.0 Fleet Architecture & Field Calibration
> **Primary Goal**: Build and deploy 10 industrial-grade IoT nodes and publish an empirical calibration curve.

- **Step 6.1: Enterprise Hardware Bill of Materials (~$105/node)**
  - Sensirion SPS30 (laser optical particulate monitor with built-in auto-cleaning fan, MCERTS-certified).
  - Sensirion SGP41 (metal-oxide VOC and $\text{NO}_x$ indexes).
  - ESP32-S3-WROOM-1 (hardware crypto coprocessor for TLS 1.2).
  - SIMCom SIM7000G (cellular NB-IoT / LTE Cat-M1 + GNSS).
  - TI BQ25185 MPPT solar charger + 3500mAh 18650 Li-ion battery + 6V/2W solar panel.
  - IP65 UV-stabilized ABS enclosure with breathable PTFE vent membrane.
- **Step 6.2: Industrial FreeRTOS Firmware**
  - Dedicated tasks for sensor sampling, edge $\kappa$-Köhler Relative Humidity compensation, encrypted MQTT/TLS telemetry, and power management.
  - Non-volatile SPIFFS flash queue buffering up to 2,000 readings during cellular downtime.
- **Step 6.3: 30-Day CAAQMS Reference Co-Location Study**
  - Co-locate 3–5 pilot nodes alongside a reference government analyzer in Hyderabad (e.g. Sanjeevaiah Park) for 30 consecutive days.
  - Publish empirical calibration curves: target $R^2 \ge 0.85$, slope $0.80$–$1.20$, bias $< \pm 5\,\mu\text{g/m}^3$.

---

### Phase 7: Municipal Pilot Deployment & Closed-Loop Enforcement Loop
> **Primary Goal**: Deploy 25–50 nodes in Hyderabad (GHMC), operationalize dispatch routing, and log 200+ verified field outcomes.

- **Step 7.1: Hyderabad Municipal Pilot Deployment**
  - Deploy 25–50 calibrated nodes across priority zones: Jeedimetla industrial corridor and Charminar commercial area.
- **Step 7.2: Municipal Command Console & Dispatch Surface**
  - Interactive Deck.gl 3D map featuring real-time station vectors, hotspot clusters, and OR-Tools optimized patrol routes.
  - Generate automated, CPCB-compliant violation PDF dossiers containing calibration records, AI conformal confidence, and Air Act (1981) Section 21 citations.
- **Step 7.3: Field Inspector Outcome Verification Loop (The Proprietary Moat)**
  - Field inspectors log findings on-site: *Source Confirmed (Biomass / Industrial / Vehicular)*, *False Alarm*, or *Action Taken*, uploading geo-tagged photo evidence.
  - Accumulate 200+ verified ground-truth records to retrain and fine-tune attribution models.

---

### Phase 8: Multi-Tenant Scale & Regulatory Certification
> **Primary Goal**: Scale the platform across 3–5 cities and achieve official regulatory type approval.

- **Step 8.1: Official Regulatory Certification (CPCB Type Approval)**
  - Submit 90-day co-location data for official CPCB Type Approval under Indian Standard IS 5182.
- **Step 8.2: Multi-Tenant SaaS Architecture**
  - Multi-tenant organization isolation at database schema level.
  - Automated city onboarding via OpenStreetMap municipal ward boundary imports.
- **Step 8.3: Commercial Data Licensing APIs**
  - High-availability REST and WebSocket API gateway with cryptographic keys and metered quotas for smart city integrators, real estate platforms, and health tech providers.

---

## 6. Immediate Action Checklist (Sprint 1)

Execute these high-priority engineering tasks immediately:

- [ ] **Task 1: Fix Hex Grid Inverted PM2.5 (`backend/app/routers/live.py`)**
  - Replace line 343 (`pm25 = round(cell_aqi * 0.4)`) with Inverse Distance Weighting from monitored physical stations.
- [ ] **Task 2: Clean Up Report Formulas (`backend/app/routers/report.py`)**
  - Remove arbitrary formulas (`pm25 * 1.8 + so2 * 1.2` for VOC and `no2 / 20.0` for NOx); mark as `--` when physical sensors are absent.
- [ ] **Task 3: Attach Background Scheduler to FastAPI Lifespan (`backend/app/main.py`)**
  - Wire `scheduler.py` into startup lifecycle so CPCB and OpenAQ sync automatically every 15 minutes.
- [ ] **Task 4: Run Initial Database Seed**
  - Run `python -m app.ingestion.cpcb_worker` to populate `vayubudhi.db` with active CPCB stations for Hyderabad, Delhi, and Bengaluru.
- [ ] **Task 5: Wire True MAPIE Conformal Sets into Attribution (`backend/app/ml_service.py`)**
  - Replace the probability threshold shortcut (`probs > 0.10`) with genuine `MapieClassifier.predict()` sets.
- [ ] **Task 6: Set Up Local Redis Caching (`backend/app/redis_client.py`)**
  - Implement Redis connection with fallback to in-memory cache when Redis is offline.

---

## 7. Master Verification Suite

Run these commands in terminal to verify platform integrity at each milestone:

```bash
# 1. Verify Dual-Standard AQI Calculations
python -m pytest backend/app/test_aqi_standards.py -v

# 2. Verify FastAPI Route Contracts
python -m pytest backend/app/test_endpoints.py -v

# 3. Test Live CPCB Ingestion Feed
python -c "from app.ingestion.cpcb_worker import fetch_cpcb_records; print('CPCB records fetched:', len(fetch_cpcb_records(limit=10)))"

# 4. Test Live OpenAQ v3 Mirror Feed
python -c "from app.ingestion.openaq_worker import fetch_openaq_locations; print('OpenAQ locations fetched:', len(fetch_openaq_locations(limit=10)))"

# 5. Verify Zero Legacy Fabrication Shortcuts
git grep -E "micro_factor|i % 3" backend/ ml_model/

# 6. Verify Frontend TypeScript Compilation
cd frontend && npx tsc --noEmit
```
