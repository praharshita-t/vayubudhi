# 📚 VayuBudhi Documentation

Welcome to the technical documentation repository for **VayuBudhi (वायुबुद्धि)** — the calibrated decision layer for urban air quality management.

This directory houses all engineering blueprints, machine learning architectures, and atmospheric physics guides for the platform.

---

## 📑 Document Directory

| Document | Description | Key Modules Covered |
| :--- | :--- | :--- |
| [**Detailed System Architecture & Diagram**](./system_architecture.md) | Complete end-to-end Mermaid architecture diagram mapping sensors, telemetry, physics engine, ML forecasters, OR-Tools optimizer, and frontend. | End-to-end Platform |
| [**System Architecture & Comprehensive Analysis**](./vayubudhi_comprehensive_analysis.md) | High-level technical analysis covering IoT hardware, geospatial telemetry engine, ML forecasting, and dispatch optimization. | End-to-end Platform |
| [**ML Architecture & Blueprint**](./finalized_ml_architecture.md) | Blueprint for data sources (Open-Meteo, CPCB CAAQMS, OpenAQ), model stack (XGBoost, Random Forest), and dashboard structure. | `ml_model/`, `backend/app/routers/` |
| [**ML Pipeline, Forecasting & PBLH Blueprint**](./ml_pipeline_and_aqi_forecasting_plan.md) | 33 Hyderabad districts dataset strategy, Planetary Boundary Layer Height (PBLH), Ventilation Index ($VI$), and MAPIE conformal calibration. | `ml_model/`, `backend/app/physics_engine.py` |
| [**AQI Forecaster & Deep Dive Guide**](./aqi_forecaster_and_deepdive_guide.md) | Technical guide on multi-horizon forecasting, MAPIE uncertainty envelopes, source attribution formulas, and UI integration. | `frontend/src/components/ForecastPanel.tsx`, `frontend/src/components/DeepDivePanel.tsx` |
| [**ML Predictions & Evaluation Report**](./vayu_budhi_ml_predictions_report.pdf) | Generated atmospheric analytics and model evaluation report (65.9% error reduction over persistence baselines). | Generated via `scripts/generate_report.py` |

---

## 🛠️ Related Module Guides

For component-specific setup and hardware build details, refer to:
- [Hardware Build Guide](../hardware_demo_code/hardware_build_guide.md) — Bill of Materials and wiring for the ESP32 + Nova SDS011 sensor node.
- [IoT Firmware](../iot_firmware/README.md) — PlatformIO setup and C++ firmware architecture.
- [Backend Service](../backend/README.md) — FastAPI API documentation and routing structure.
- [Frontend Dashboard](../frontend/README.md) — Next.js 14, deck.gl, and Mapbox visualizer instructions.
- [Data Contracts](../contracts/README.md) — JSON schema contracts between edge, backend, and frontend.
