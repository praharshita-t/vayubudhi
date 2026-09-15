# 🏗️ VayuBudhi System Architecture

This document presents the detailed architectural design of **VayuBudhi**, mapping the flow of information from physical edge sensors and satellite feeds through atmospheric physics engines, machine learning forecasters, and operations research solvers down to real-time municipal dispatch and citizen advisories.

---

## 🌐 End-to-End System Architecture Diagram

```mermaid
flowchart TB
    %% ==========================================
    %% 1. INGESTION & DATA SOURCES
    %% ==========================================
    subgraph SENSORS ["📡 1. Physical IoT & Edge Network"]
        direction TB
        ESP32["ESP32 DevKit V1 (MCU)"]
        SDS011["Nova SDS011 (Laser PM2.5 / PM10)"]
        BME280["BME280 (Temp / Humidity / Pressure)"]
        OLED["SSD1306 OLED (Local Telemetry & Ratio)"]
        FIRMWARE["C++ Embedded Firmware (NTP + Queue Cache)"]

        SDS011 --> FIRMWARE
        BME280 --> FIRMWARE
        FIRMWARE --> OLED
        FIRMWARE --> ESP32
    end

    subgraph TELEMETRY ["🛰️ 2. External Atmospheric Feeds & Spatial Data"]
        direction TB
        OPENMETEO["Open-Meteo Air Quality & Weather API\n(Hourly PM, Wind Speed/Dir, Surface Pressure)"]
        ERA5["ERA5 Boundary Layer Reanalysis\n(PBLH - Boundary Layer Height)"]
        SENTINEL["Sentinel-5P Satellite Cache\n(Tropospheric NO2 Column Density)"]
        TOMTOM["TomTom Traffic API\n(Live Congestion Index)"]
        FIRMS["NASA FIRMS\n(Thermal Anomalies / Biomass Burning)"]
        OSM["OpenStreetMap / Nominatim\n(Municipal Boundaries GeoJSON)"]
    end

    %% ==========================================
    %% 2. BACKEND & ORCHESTRATION
    %% ==========================================
    subgraph BACKEND ["⚡ 3. FastAPI Core Services & Physics Engine"]
        direction TB
        ROUTER_INGEST["/api/ingest\n(Telemetry Receiver)"]
        ROUTER_LIVE["/api/live\n(NAQI Engine - 6 Pollutants)"]
        ROUTER_FORECAST["/api/forecast\n(Multi-Horizon Forecasting)"]
        ROUTER_ATTRIBUTION["/api/attribution\n(Source Fingerprinting)"]
        ROUTER_OPTIMIZE["/api/optimize\n(Dispatch Engine)"]
        ROUTER_ADVISORY["/api/advisory\n(Health Guidance)"]
        ROUTER_SATELLITE["/api/satellite\n(NO2 Plume Cache)"]

        PHYSICS["Atmospheric Physics Engine\n- Ventilation Index (VI = PBLH × Wind)\n- Thermal Inversion Detection\n- Gaussian Dispersion Plumes"]
        DB[(SQLite / PostgreSQL\nHistorical Readings & Telemetry)]
    end

    %% ==========================================
    %% 3. AI / ML & CONFORMAL UNCERTAINTY
    %% ==========================================
    subgraph ML_SUBSYSTEM ["🧠 4. Machine Learning & Uncertainty Engine"]
        direction TB
        XGBOOST["XGBoost Multi-Horizon Forecaster\n(24h, 48h, 72h Horizons)"]
        RF_CLASSIFIER["Random Forest Source Fingerprint\n(Vehicular, Industrial, Biomass, Dust)"]
        MAPIE["MAPIE Conformal Prediction\n(Calibrated 90% Confidence Bounds [AQI_lower, AQI_upper])"]
        SHAP["SHAP Feature Explainer\n(Feature Attribution Ranking)"]
    end

    %% ==========================================
    %% 4. OPERATIONS RESEARCH OPTIMIZER
    %% ==========================================
    subgraph OR_OPTIMIZER ["🎯 5. Operations Research & Multi-Agent Layer"]
        direction TB
        OR_TOOLS["Google OR-Tools (CVRPTW)\n- Heterogeneous Fleet Routing\n- Time Windows & Depots\n- Capacity Constraints"]
        FLEET["Fleet Management\n- Inspection Vans\n- Verification Drones\n- Rapid Motorcycle Teams"]
        ROI_CALC["Cost-Benefit ROI Engine\n(Severity × Confidence × Exposure)"]
        LANGGRAPH["LangGraph Agent Coordinator\n(Orchestrates Attribution, Enforcement & Advisory)"]
        GEMINI["Google Gemini 2.0 Flash\n(Multilingual Advisory Generation in EN, HI, KN)"]
    end

    %% ==========================================
    %% 5. FRONTEND DASHBOARD
    %% ==========================================
    subgraph FRONTEND ["🖥️ 6. Next.js 14 Geospatial Command Dashboard"]
        direction TB
        MAP["Mapbox GL JS + deck.gl\n- 3D Hexagon Extrusions\n- Dynamic Wind Layer Particles\n- Satellite NO2 Heatmap"]
        PANEL_FORECAST["Forecast Panel\n(Conformal Shaded Envelope + VI Gauge)"]
        PANEL_DEEPDIVE["Deep Dive Panel\n(Source Attribution + Scenario Simulator)"]
        PANEL_ENFORCE["Enforcement Panel\n(Fleet Routes + Dispatch Orders + Turn-by-Turn)"]
        PANEL_ADVISORY["Citizen Advisory Panel\n(Personalized Inhaled Dose μg/h)"]
        PANEL_COMPARE["Comparative Portal\n(Cross-City NAQI Benchmarks)"]
        MODAL_REPORT["Executive AI PDF Report Generator"]
    end

    %% ==========================================
    %% CONNECTIONS & FLOWS
    %% ==========================================
    ESP32 -- "HTTP REST Telemetry" --> ROUTER_INGEST
    ROUTER_INGEST --> DB

    OPENMETEO --> ROUTER_LIVE
    ERA5 --> PHYSICS
    SENTINEL --> ROUTER_SATELLITE
    TOMTOM --> ROUTER_ATTRIBUTION
    FIRMS --> ROUTER_ATTRIBUTION
    OSM --> FRONTEND

    ROUTER_LIVE --> PHYSICS
    PHYSICS --> ROUTER_FORECAST
    DB --> ROUTER_FORECAST

    ROUTER_FORECAST <--> XGBOOST
    XGBOOST <--> MAPIE
    ROUTER_ATTRIBUTION <--> RF_CLASSIFIER
    RF_CLASSIFIER <--> SHAP

    MAPIE -- "Calibrated Uncertainty" --> ROUTER_OPTIMIZE
    ROUTER_OPTIMIZE --> OR_TOOLS
    OR_TOOLS --> FLEET
    OR_TOOLS --> ROI_CALC

    ROUTER_ADVISORY --> LANGGRAPH
    LANGGRAPH <--> GEMINI

    BACKEND <--> FRONTEND
    ROUTER_LIVE --> MAP
    ROUTER_FORECAST --> PANEL_FORECAST
    ROUTER_ATTRIBUTION --> PANEL_DEEPDIVE
    ROUTER_OPTIMIZE --> PANEL_ENFORCE
    ROUTER_ADVISORY --> PANEL_ADVISORY
    ROUTER_LIVE --> PANEL_COMPARE
    PANEL_DEEPDIVE --> MODAL_REPORT
```

---

## ⚙️ Core Subsystem Details

### 1. Physical Sensing Layer (`iot_firmware/`, `hardware_demo_code/`)
* **Hardware Profile:** Custom node built on an **ESP32 DevKit V1**, paired with a **Nova SDS011** laser scattering sensor and a **BME280** environmental sensor.
* **Firmware Intelligence:** Written in C++ (Arduino Core) with non-blocking tasks. Computes the real-time particulate ratio ($\text{Ratio} = \text{PM2.5} / \text{PM10}$):
  * **Ratio > 0.50:** Strong indication of secondary aerosol formation and fine combustion (vehicular / industrial).
  * **Ratio < 0.35:** Predominance of coarse mechanical particulate (road dust / construction).
* **Failsafe Offline Queue:** Telemetry is buffered in memory during network disconnections and flushed upon reconnection to ensure zero data loss.

### 2. Atmospheric Physics Subsystem (`backend/app/physics_engine.py`)
* **Ventilation Index ($VI$):** Quantifies the lower atmosphere's dilution capacity:
  $$VI = \text{Planetary Boundary Layer Height (PBLH)} \times \text{Surface Wind Speed } (U_{10})$$
  * **High $VI$ ($> 6,000 \ m^2/s$):** Rapid vertical mixing and advection $\to$ Low ground-level risk.
  * **Low $VI$ ($< 1,000 \ m^2/s$):** Atmospheric stagnation with thermal inversion $\to$ Trapped ground-level pollutants.
* **Gaussian Plume Dispersion:** Calculates forward downwind pollutant spread using Pasquill-Gifford atmospheric stability classes.

### 3. Machine Learning & Conformal Prediction (`ml_model/`)
* **Multi-Horizon Regressors:** Three XGBoost regressors trained on multi-year spatio-temporal datasets for **24h, 48h, and 72h** horizons.
* **MAPIE Conformal Uncertainty:** Wraps point estimates with distribution-free prediction intervals $[AQI_{\text{lower}}, AQI_{\text{upper}}]$ at a guaranteed **90% confidence level**.
* **Weak-Supervision Source Attribution:** Random Forest classifier attributing pollution to one of four classes: *Vehicular, Industrial, Biomass Burning, or Mechanical Dust*. Cross-referenced with live TomTom congestion data and NASA FIRMS satellite fire hotspots.

### 4. Operations Research & Enforcement Routing (`backend/app/optimization/`)
* **Google OR-Tools (CVRPTW):** Solves the Capacitated Vehicle Routing Problem with Time Windows across heterogeneous vehicles:
  * **Inspection Vans:** Heavy regulatory enforcement and sample collection.
  * **Verification Drones:** Fast, low-cost aerial confirmation of low-confidence hotspots before deploying heavy squads.
  * **Rapid Motorbikes:** Quick response in dense, congested urban alleyways.
* **Uncertainty-Aware Objective:**
  $$\text{Priority Score} = \text{Severity} \times \text{Conformal Confidence} \times \text{Population Exposure}$$

### 5. Multi-Agent Advisory & Multilingual LLM (`agent_advisor/`)
* **LangGraph Pipeline:** Orchestrates coordination between attribution data, city demographics, and health recommendations.
* **Gemini 2.0 Flash:** Generates localized, context-aware citizen advisories translated into **English, Hindi, and Kannada**, computing personalized inhaled dose estimates ($\mu g/h$) for runners, children, and outdoor workers.

### 6. Geospatial Command Dashboard (`frontend/`)
* **Rendering Engine:** Built with Next.js 14, Mapbox GL JS, and deck.gl for 3D volumetric extrusion of district boundaries.
* **Wind Layer:** Real-time particle stream animation (`WindLayer.ts`) visualizing wind vectors from Open-Meteo across urban terrain.
