# 📘 VayuBudhi: AQI Forecaster & Deep Dive Technical Guide

> **Comprehensive Architecture Breakdown & Interactive Upgrade Roadmap**  
> Modules Covered: `ForecastPanel.tsx` (AQI Forecaster) & `DeepDivePanel.tsx` (Source Attribution & Deep Dive)

---

## 1. Executive Summary

This guide explains in simple, non-jargon technical terms how the **AQI Forecaster** and **Deep Dive (Cause of Pollution)** tabs work in VayuBudhi, covering physics formulas, Machine Learning algorithms, backend API endpoints, and frontend state management. It also outlines an interactive UI/UX upgrade plan to transform both tabs into a feature-rich, dynamic experience.

---

## 2. Tab 1: AQI Forecaster (`ForecastPanel.tsx`)

### 2.1 The Core Atmospheric Physics (Ventilation Index)
Pollutant concentration on the ground is not dictated by emission rates alone; it is governed by how effectively the lower atmosphere disperses those emissions. We quantify this using the **Ventilation Index ($VI$)**:

$$\text{Ventilation Index (VI)} = \text{Planetary Boundary Layer Height (PBLH)} \times \text{Surface Wind Speed } (U_{10})$$

* **Units:** $m^2/s$
* **High $VI$ ($> 6,000 \ m^2/s$):** Deep atmospheric mixing layer + strong winds $\to$ Rapid vertical & horizontal dispersion $\to$ **Clean Ground AQI**.
* **Low $VI$ ($< 1,000 \ m^2/s$):** Shallow nocturnal inversion layer ($100m-300m$) + stagnant winds ($< 1 \ m/s$) $\to$ Smog is trapped in a tiny volume $\to$ **Severe AQI Spikes**.

### 2.2 Machine Learning & Conformal Prediction Mechanics
1. **Multi-Horizon Forecasting:**
   * Uses 3 distinct **XGBoost Regressors** for **24-hour**, **48-hour**, and **72-hour** horizons.
   * Input Features (7 parameters): `PM2.5`, `PM10`, `Temperature`, `Relative Humidity`, `Barometric Pressure`, `Wind Speed`, `PBLH`.

2. **MAPIE 90% Conformal Uncertainty Interval:**
   * Instead of outputting a single point prediction (e.g. $AQI = 185$), the system uses **MAPIE (Machine Learning Adaptation for Estimating Uncertainty)** to produce mathematically calibrated lower and upper bounds:
     $$[AQI_{\text{lower}}, \ AQI_{\text{upper}}]$$
   * Rendered on the chart as a **shaded blue confidence envelope** behind the main forecast line.

### 2.3 API Integration & Data Flow
* **Backend Endpoint:** `POST /api/forecast` ([`backend/app/routers/endpoints.py`](file:///c:/Users/Sai%20Koushik/Desktop/ET_Hackathon/vayubudhi/backend/app/routers/endpoints.py))
* **Request Payload:**
  ```json
  {
    "station_id": "HYD_GACHIBOWLI",
    "timestamp": "2026-08-14T21:00:00Z",
    "pm25": 92.0,
    "pm10": 115.0,
    "temp": 24.0,
    "humidity": 65.0,
    "pressure": 1010.0,
    "wind_speed": 2.1,
    "pblh": 800.0
  }
  ```
* **Response Payload:**
  ```json
  {
    "horizon_h": 72,
    "points": [123.99, 135.50, 142.10],
    "intervals": [[103.99, 143.99], [112.10, 158.90], [118.00, 166.20]],
    "ventilation_index": 1680.0
  }
  ```

---

## 3. Tab 2: Deep Dive & Cause of Pollution (`DeepDivePanel.tsx`)

### 3.1 Source Attribution Classifier (Random Forest)
The Deep Dive module answers the operational question: **"What is the primary source driving pollution in this specific district?"**

It uses a **Random Forest Classifier** trained on particle physics and weather characteristics across 4 distinct pollution sources:

| Pollution Source | Particle Ratio ($\frac{\text{PM2.5}}{\text{PM10}}$) | Weather & Chemical Signals | Typical Scenario |
|---|---|---|---|
| 🚗 **Vehicular** | High ($\ge 0.70$) | Spikes during 08:00 & 20:00 rush hours; elevated $NO_2$ proxies. | Heavy traffic corridors (e.g. Madhapur, Gachibowli). |
| 🏭 **Industrial** | Medium-High ($0.50 - 0.70$) | Steady 24/7 emission profile; elevated $SO_2$ proxies. | Industrial zones (Patancheru, Jeedimetla). |
| 🏗️ **Dust (Crustal)** | Low ($\le 0.40$) | High coarse particle $PM_{10}$; high temp ($>35^\circ C$), dry humidity ($<25\%$). | Construction & dry unpaved roads (Charminar, Kukatpally). |
| 🔥 **Biomass / Trash** | Very High ($\ge 0.85$) | Low temp ($<15^\circ C$), high humidity, extreme nocturnal PBLH collapse ($<150m$). | Winter night trash burning & stubble plumes. |

### 3.2 Conformal Prediction Sets
* Rather than making a rigid single-class guess, the model outputs a **Prediction Set** (e.g., `["vehicular", "industrial"]`).
* Guarantees with **90% statistical coverage** that the true ground-truth source lies within the returned set.

### 3.3 What-If Intervention Policy Simulator
* **Interactive Action:** Clicking **"Initiate Traffic Diversion"** simulates an operational enforcement policy by reducing vehicular inputs (`PM2.5` & `PM10` reduced by $40\%$).
* **Re-Inference Loop:** Sends the modified payload to `POST /api/forecast` and calculates the projected AQI reduction (e.g., AQI drops from 280 to 185, saving 95 AQI points).

---

## 4. Active Localhost Environments

The local stack is active and ready for visual testing:
* **Frontend App (Next.js 14):** [http://localhost:3000](http://localhost:3000)
* **Backend API (FastAPI + Uvicorn):** [http://127.0.0.1:8000](http://127.0.0.1:8000)
* **Interactive API Documentation:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 5. UI/UX Interactive Upgrade Plan

To transform both tabs into interactive experience with rich visual graphs and real-time sliders:

### 🎨 AQI Forecaster Upgrades
1. **Interactive Physics Sliders (Real-time What-If):**
   * Add real-time sliders for **Wind Speed ($0 - 15 \ m/s$)**, **Temperature ($10 - 45^\circ C$)**, and **PBLH ($100 - 2500m$)**.
   * Dragging any slider dynamically re-computes the Ventilation Index and flexes the 72-hour forecast curve and confidence envelope in real time.
2. **Multi-Model Benchmark Comparison Chart:**
   * Add toggle buttons to display **XGBoost**, **LightGBM**, and **CatBoost** curves simultaneously on the same Recharts Area chart.
3. **Diurnal Hourly Peak Smog Heatmap:**
   * A 24-hour x 3-day matrix grid highlighting peak smog windows in bright neon red (e.g., 07:00 morning rush & 22:00 nocturnal inversion).
4. **Conformal Coverage Selector:**
   * Toggle between **80%**, **90%**, and **95%** confidence bounds to visually illustrate how uncertainty bands widen as statistical certainty requirements increase.

### 🎨 Deep Dive & Source Attribution Upgrades
1. **Interactive Fingerprint Radar / Spider Chart:**
   * A 6-axis Radar Chart comparing the active district's fingerprint (PM2.5/10 ratio, NO2, SO2, Temp, Wind, PBLH) against standard reference profiles.
2. **Explainable AI (SHAP Waterfall Chart):**
   * A visual breakdown showing feature contribution scores (e.g., $+42$ AQI from Low PBLH, $+35$ from Traffic PM2.5, $-12$ from Wind Speed).
3. **Multi-Policy Intervention Slider Matrix:**
   * Replace the single simulation button with 3 interactive sliders:
     * 🚗 **Traffic Reduction:** $0\% - 100\%$
     * 🏗️ **Construction Dust Suppression:** $0\% - 100\%$
     * 🏭 **Industrial Emission Cap:** $0\% - 100\%$
   * Instantly re-calculates the target AQI drop and displays estimated enforcement cost vs health ROI.
