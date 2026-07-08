# VayuBudhi Project — 4-Member Team Roles and Build Schedule (1.5-Week Sprint)

This document outlines the accelerated division of work for a **four-member team** to build and present the **VayuBudhi** project over a **1.5-week (10-day) timeline**.

---

## 👥 Core Roles and Responsibilities

### Member 1: ML Engineer & Atmospheric Modeler (The Model Scientist)
* **Focus:** ML modeling, physics-based feature engineering, and calibration.
* **Key Tasks:**
  * Engineer physics-based features (e.g., Ventilation Index using PBLH × wind speed).
  * Train and optimize the **XGBoost** model for 24h/48h/72h AQI forecasting.
  * Train the **Random Forest** source classifier using weak-supervision labeling.
  * Implement **MAPIE** to wrap forecasting and classification models in conformal prediction intervals.
  * Build the validation suite (RMSE vs. persistence baseline, and JSD/Wasserstein comparisons).

### Member 2: Backend Developer & Operations Optimizer (The Core Engineer)
* **Focus:** Database schemas, FastAPI REST endpoints, and optimization solvers.
* **Key Tasks:**
  * Build the **FastAPI** backend framework, database schemas (SQLite), and server endpoints.
  * Implement the **Google OR-Tools** solver for vehicle routing with time windows (CVRPTW).
  * Code the uncertainty-routing dispatch logic (drone vs. inspector dispatch based on confidence).
  * Develop the cost-benefit ROI calculator (estimating compliance costs and population exposure).
  * Pre-compute scenario databases to serve as a high-fidelity fallback for the live demo.

### Member 3: Frontend & GIS Developer (The Visualizer)
* **Focus:** Responsive React dashboard UI and 3D geographic map layers.
* **Key Tasks:**
  * Scaffold the **Next.js + React** app with a dark theme and responsive layout.
  * Integrate **Mapbox GL JS** and **deck.gl** for 3D mapping (hexagons, wind vectors, and Sentinel-5P layers).
  * Build the Commander Dashboard and Mobile Enforcement routing views.
  * Bind frontend components to FastAPI endpoints for live data visualization.

### Member 4: IoT Hardware & GenAI Integrator (The Demo & Integration Specialist)
* **Focus:** Microcontrollers, hardware assembly, LangGraph agent workflows, and Gemini LLM.
* **Key Tasks:**
  * Assemble and wire the **ESP32** microcontroller, **SDS011** (PM sensor), **BME280** (weather sensor), and **SSD1306 OLED** screen.
  * Write the ESP32 C++ firmware (reading sensors, printing to OLED, posting JSON to backend).
  * Build the **LangGraph** multi-agent coordinator (coordinating attribution, optimization, and advisory).
  * Integrate the **Google Gemini API** to generate citizen advisories in Hindi, English, and Kannada.

---

## 📅 1.5-Week Build Schedule (10-Day Sprint)

### Days 1–3: Scaffolding, Data Pipelines, & Base Models

| Day | Member 1 (ML) | Member 2 (Backend) | Member 3 (Frontend) | Member 4 (Hardware/AI) |
|:---|:---|:---|:---|:---|
| **1** | Process historical AQI data; compute Ventilation Index. | Initialize FastAPI project structure & SQLite schema. | Initialize Next.js project; design main dark UI layout. | Setup ESP32 toolchain; test BME280 & SDS011 on breadboard. |
| **2** | Train **XGBoost forecast** model; compute RMSE vs persistence. | Build OpenAQ historical data loader and DB scripts. | Integrate Mapbox GL JS map canvas with station markers. | Write basic ESP32 firmware to read sensors & print to OLED. |
| **3** | Define weak-supervision heuristics for source labeling. | Build API endpoints for live sensor & forecast data. | Build 3D hexagon visualization layer on deck.gl. | Configure Gemini API prompt templates and test advisor outputs. |

### Days 4–6: Optimization, Conformal Predictions, & Hardware Integration

| Day | Member 1 (ML) | Member 2 (Backend) | Member 3 (Frontend) | Member 4 (Hardware/AI) |
|:---|:---|:---|:---|:---|
| **4** | Train **Random Forest classifier** on labeled subset. | Configure **Google OR-Tools** solver with travel time matrix. | Build wind vector/back-trajectory visual line layer. | Write ESP32 REST client to post sensor JSON via Wi-Fi. |
| **5** | Wrap forecast & classification models in **MAPIE** conformal bands. | Code the uncertainty-aware routing logic (Drone vs Inspector). | Build the Optimizer route visualization & team cards. | Set up mobile hotspot; run E2E data transmission test (ESP32 $\to$ DB). |
| **6** | Calculate validation metrics (conformal coverage, JSD vs studies). | Implement ROI calculation engine; prepare scenario datasets. | Design GRAP simulator control panels and comparison tables. | Build basic LangGraph coordinator and link sub-agent modules. |

### Days 7–10: System Integration, Testing, & Demo Preparation

| Day | Member 1 (ML) & Member 2 (Backend) | Member 3 (Frontend) | Member 4 (Hardware/AI) |
|:---|:---|:---|:---|
| **7** | Integrate ML model inference and OR-Tools optimization endpoints into the main FastAPI server. | Build the Citizen Advisory UI; design exposure-dose information panels. | Connect LangGraph coordinator to Gemini API for multilingual advisories. |
| **8** | Load pre-cached comparison datasets (Delhi vs Bengaluru) and test comparison panel. | Connect frontend visual components to live backend endpoints. | Assemble physical sensor case (3D print/box) and secure hardware connections. |
| **9** | Cache 3 mock scenario responses for backend fallback demo safety. | Create visual signal-to-intervention timer; style final UI states. | Conduct E2E demo run #1 & #2; record backup screen capture. |
| **10** | Perform final database and API performance audits under load. | Polish UI loading indicators and transition animations. | Conduct demo run #3; finalize presentation deck (10 slides). |
