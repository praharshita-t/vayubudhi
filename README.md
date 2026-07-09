# 🏆 VayuBudhi (वायुबुद्धि)

> **The Calibrated Decision Layer for Urban Air Quality**

VayuBudhi is an intelligent, mathematically optimal decision layer built on top of urban air quality monitoring networks. Instead of just forecasting AQI or detecting pollution hotspots, VayuBudhi solves the harder operational problem: **Given a city's actual limited resources (inspectors, drones, and enforcement vans), what is the mathematically optimal way to deploy them?**

Crucially, the system quantifies its own uncertainty through conformal prediction, ensuring that valuable physical resources are never wasted on shaky evidence.

---

## 🌟 Key Features

VayuBudhi is built around 5 core modules designed to turn raw pollution signals into actionable, cost-effective interventions:

1. **Source Attribution with Calibrated Confidence**
   * Uses weak-supervision labeling and Random Forest classification to identify dominant pollution sources (vehicular, industrial, biomass, dust).
   * Wraps predictions in **MAPIE conformal prediction sets** to output mathematically calibrated confidence bounds (e.g., 90% certainty), feeding directly into the optimizer.
2. **Physics-Informed Hyperlocal Forecasting**
   * Forecasts AQI at 24/48/72-hour horizons using XGBoost.
   * Incorporates a custom engineered **Ventilation Index** (Boundary Layer Height × Wind Speed) to predict atmospheric stagnation events before pollution accumulates.
3. **Uncertainty-Aware Enforcement Optimizer**
   * Uses **Google OR-Tools (CVRPTW)** to calculate provably optimal routing for a heterogeneous fleet (drones, vans, inspectors).
   * Evaluates deployment based on Severity × Confidence × Population Exposure. Low-confidence signals are routed to cheap verification (drones) before committing full inspection teams.
4. **Multilingual Exposure-Dose Citizen Advisory**
   * Translates generic AQI numbers into personalized inhaled dose estimates ($\mu g/h$) based on user activity.
   * Leverages **Google Gemini API** to generate actionable, hyper-local health advisories in multiple languages (Hindi, English, Kannada).
5. **Real-Time IoT Sensor Network**
   * Low-cost (~₹3,150) custom ESP32 + SDS011 nodes capable of real-time PM2.5/PM10 monitoring and edge classification.
   * Demonstrates a sub-60-second response loop from physical particle detection to optimized inspector dispatch.

---

## 🏗️ System Architecture

VayuBudhi leverages a modern, async stack orchestrated by a LangGraph multi-agent pipeline:

* **Hardware Layer:** ESP32 + Nova SDS011 (PM) + BME280 (Temp/Humidity) + OLED Display.
* **Data Ingestion:** OpenAQ (CAAQMS), Open-Meteo (ERA5 winds/PBLH), NASA FIRMS (Thermal), TomTom (Traffic), OpenStreetMap.
* **AI/ML Engine:** XGBoost (Forecaster), Random Forest (Fingerprint), MAPIE (Uncertainty).
* **Optimization:** Google OR-Tools (CVRPTW), Cost-Benefit ROI Calculator.
* **Agentic Coordinator:** LangGraph (Coordinator $\to$ Attribution, Enforcement, and Advisory Agents).
* **Frontend:** Next.js + React + Mapbox GL JS + deck.gl (3D geospatial visualization).

---

## 💻 Tech Stack

| Category | Technologies |
| :--- | :--- |
| **Backend API** | Python 3.11, FastAPI |
| **Database** | SQLite (Dev) / PostgreSQL (Prod) |
| **Machine Learning** | scikit-learn, XGBoost, MAPIE |
| **Operations Research** | Google OR-Tools |
| **Frontend & GIS** | Next.js 14, React, deck.gl, Mapbox GL JS |
| **LLM & Agents** | Google Gemini (gemini-2.0-flash), LangGraph |
| **IoT Hardware** | C++ (ESP32 Arduino Core), HTTPClient |

---

## 🛠️ Hardware Setup (Sensor Node)

To build the physical VayuBudhi IoT node, you will need the following components (Total cost ~₹3,150):

* 1x ESP32 DevKit V1
* 1x Nova SDS011 PM Sensor
* 1x BME280 Temperature/Humidity Sensor
* 1x 0.96" SSD1306 OLED Display
* Breadboard, jumper wires, and a 3D-printed enclosure.

The ESP32 reads real-time PM and weather data, displays the PM2.5/PM10 ratio locally on the OLED, and POSTs the JSON payload to the FastAPI backend over a local Wi-Fi hotspot.

---

## 🚀 Getting Started (Local Development)

*(Note: Ensure you have Python 3.11+ and Node.js 18+ installed on your system.)*

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/vayubudhi.git
cd vayubudhi
```

### 2. Backend Setup (FastAPI & ML)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 3. Frontend Setup (Next.js)
```bash
cd frontend
npm install
npm run dev
```

### 4. Environment Variables
Create a `.env` file in both the `backend` and `frontend` directories and add your API keys:
* `GEMINI_API_KEY`
* `MAPBOX_ACCESS_TOKEN`
* `TOMTOM_API_KEY`

---

## 🤝 Contributing
Since VayuBudhi is a tightly scoped project developed under a strict 1.5-week sprint timeline, please ensure any pull requests adhere directly to the core 5 modules outlined above. No scope creep.

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
