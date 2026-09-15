# 📚 VayuBudhi Documentation

Welcome to the technical documentation repository for **VayuBudhi (वायुबुद्धि)** — the calibrated decision layer for urban air quality management.

This directory houses all engineering blueprints, machine learning architectures, and atmospheric physics guides for the platform.

---

## 📑 Document Directory

| Document | Description | Key Modules Covered |
| :--- | :--- | :--- |
| [**System Architecture & Comprehensive Analysis**](file:///d:/Puru_VNR/3rd%20Year/Hackathons%20&%20Competitions/Vayubudhi/vayubudhi/docs/vayubudhi_comprehensive_analysis.md) | High-level technical analysis covering IoT hardware, geospatial telemetry engine, ML forecasting, and dispatch optimization. | End-to-end Platform |
| [**ML Architecture & Blueprint**](file:///d:/Puru_VNR/3rd%20Year/Hackathons%20&%20Competitions/Vayubudhi/vayubudhi/docs/finalized_ml_architecture.md) | Blueprint for data sources (Open-Meteo, CPCB CAAQMS, OpenAQ), model stack (XGBoost, Random Forest), and dashboard structure. | `ml_model/`, `backend/app/routers/` |
| [**ML Pipeline, Forecasting & PBLH Blueprint**](file:///d:/Puru_VNR/3rd%20Year/Hackathons%20&%20Competitions/Vayubudhi/vayubudhi/docs/ml_pipeline_and_aqi_forecasting_plan.md) | 33 Hyderabad districts dataset strategy, Planetary Boundary Layer Height (PBLH), Ventilation Index ($VI$), and MAPIE conformal calibration. | `ml_model/`, `backend/app/physics_engine.py` |
| [**AQI Forecaster & Deep Dive Guide**](file:///d:/Puru_VNR/3rd%20Year/Hackathons%20&%20Competitions/Vayubudhi/vayubudhi/docs/aqi_forecaster_and_deepdive_guide.md) | Technical guide on multi-horizon forecasting, MAPIE uncertainty envelopes, source attribution formulas, and UI integration. | `frontend/src/components/ForecastPanel.tsx`, `frontend/src/components/DeepDivePanel.tsx` |
| [**ML Predictions & Evaluation Report**](file:///d:/Puru_VNR/3rd%20Year/Hackathons%20&%20Competitions/Vayubudhi/vayubudhi/docs/vayu_budhi_ml_predictions_report.pdf) | Generated atmospheric analytics and model evaluation report (65.9% error reduction over persistence baselines). | Generated via `scripts/generate_report.py` |

---

## 🛠️ Related Module Guides

For component-specific setup and hardware build details, refer to:
- [Hardware Build Guide](file:///d:/Puru_VNR/3rd%20Year/Hackathons%20&%20Competitions/Vayubudhi/vayubudhi/hardware_demo_code/hardware_build_guide.md) — Bill of Materials and wiring for the ESP32 + Nova SDS011 sensor node.
- [IoT Firmware](file:///d:/Puru_VNR/3rd%20Year/Hackathons%20&%20Competitions/Vayubudhi/vayubudhi/iot_firmware/README.md) — PlatformIO setup and C++ firmware architecture.
- [Backend Service](file:///d:/Puru_VNR/3rd%20Year/Hackathons%20&%20Competitions/Vayubudhi/vayubudhi/backend/README.md) — FastAPI API documentation and routing structure.
- [Frontend Dashboard](file:///d:/Puru_VNR/3rd%20Year/Hackathons%20&%20Competitions/Vayubudhi/vayubudhi/frontend/README.md) — Next.js 14, deck.gl, and Mapbox visualizer instructions.
- [Data Contracts](file:///d:/Puru_VNR/3rd%20Year/Hackathons%20&%20Competitions/Vayubudhi/vayubudhi/contracts/README.md) — JSON schema contracts between edge, backend, and frontend.
