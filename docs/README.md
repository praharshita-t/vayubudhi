# 📚 VayuBudhi (वायुबुद्धि) — Master Documentation & Architecture Hub

Welcome to the centralized documentation, engineering blueprint, and audit repository for **VayuBudhi**, the calibrated decision layer for urban air quality management.

This directory organizes all project documentation across both **chronological product versions** (from hackathon inception to enterprise-grade readiness) and **functional product subsystems** (Edge IoT, Atmospheric Machine Learning, Operations Research, Geospatial Digital Twin, and GenAI Executive Intelligence).

---

## 🧭 Documentation Map & Chronological Evolution

The project's architectural maturation is documented through four distinct phases:

```
┌───────────────────────────┐      ┌───────────────────────────┐
│   Phase 1: Inception      │ ───> │ Phase 2: ML & Physics     │
│   • Initial Gap Analysis  │      │ • 33-District Scale       │
│   • Problem Scope Audit   │      │ • Atmospheric PBLH Physics│
│   • Core Platform Review  │      │ • Conformal MAPIE Intervals│
└───────────────────────────┘      └───────────────────────────┘
              │                                  │
              ▼                                  ▼
┌───────────────────────────┐      ┌───────────────────────────┐
│   Phase 3: Code-Level     │ ───> │ Phase 4: Enterprise 2.0   │
│   • 10-Category Deep Audit│      │ • Production HW Spec (PCB)│
│   • Hardcoded Fixes Plan  │      │ • Commercial Readiness    │
│   • Remediation Scorecard │      │ • Grant / Funding Roadmap │
└───────────────────────────┘      └───────────────────────────┘
```

---

## 📑 Complete Document Directory

### 1. 🔍 Audits, Gap Analyses & Readiness Assessments
Located in [`docs/audits_and_assessments/`](./audits_and_assessments/):

| Chronological Order | Document | Scope & Focus | Primary Audience |
|:---|:---|:---|:---|
| **Phase 1** (Day 2) | [**01: Initial Gap Analysis**](./audits_and_assessments/01_phase1_initial_gap_analysis.md) | Baseline review against the original hackathon problem statement; identifies initial strengths, partial features, and missing deliverables. | Core Engineers |
| **Phase 2** (Mid-Sprint) | [**02: Comprehensive Platform Analysis**](./audits_and_assessments/02_phase2_comprehensive_platform_analysis.md) | End-to-end technical analysis of the foundational 5 modules: IoT edge node, Live Map, XGBoost forecaster, Random Forest attribution, and OR-Tools optimizer. | System Architects |
| **Phase 3** (Final Sprint) | [**03: Final Code-Level Audit Report**](./audits_and_assessments/03_phase3_final_code_audit_report.md) | The definitive, 10-category code audit (Categories A–J, 80+ findings) covering hardcoded values, ML pipeline integrity, Hyderabad 33-district coverage, and actionable remediation. | Tech Leads & Evaluators |
| **Phase 4** (Commercialization) | [**04: Product Readiness & Funding Assessment**](./audits_and_assessments/04_product_readiness_funding_assessment.md) | Strategic evaluation for commercial grants and VC funding (₹50 Lakhs – ₹1 Crore), detailing hardware ruggedness, co-location calibration, and field test validation. | Founders & Investors |
| **Phase 4** (Production Plan) | [**05: VayuBudhi 2.0 Enterprise Plan**](./audits_and_assessments/05_vayubudhi_2.0_enterprise_plan.md) | Five-year municipal contract readiness plan: custom 4-layer PCB design, MCERTS-certified Sensirion SPS30/SGP41 sensors, NB-IoT cellular telemetry, and GTM business model. | Municipal Partners & HW Teams |

---

### 2. 🧠 Architecture & Engineering Blueprints
Located in [`docs/architecture_and_engineering/`](./architecture_and_engineering/):

#### Machine Learning & Atmospheric Physics ([`ml_and_physics/`](./architecture_and_engineering/ml_and_physics/))
* [**Finalized ML Architecture & Data Sources**](./architecture_and_engineering/ml_and_physics/finalized_ml_architecture.md): Complete blueprint for multi-layer data ingestion (Open-Meteo ERA5, CPCB CAAQMS, OpenAQ, NASA FIRMS, TomTom Traffic) and model ensemble architecture.
* [**ML Pipeline & AQI Forecasting Blueprint**](./architecture_and_engineering/ml_and_physics/ml_pipeline_and_forecasting_blueprint.md): Action plan expanding spatial coverage to 33 Hyderabad administrative zones, integrating hourly Planetary Boundary Layer Height (PBLH), and computing the Ventilation Index ($VI = \text{PBLH} \times U_{10}$).
* [**AQI Forecaster & Deep Dive Technical Guide**](./architecture_and_engineering/ml_and_physics/aqi_forecaster_and_deepdive_guide.md): Deep-dive into XGBoost multi-horizon regressors (24h/48h/72h), MAPIE 90% conformal uncertainty intervals, weak-supervision source attribution, and backend API contracts.

#### Visual Architecture & Validation Assets ([`assets/`](./architecture_and_engineering/assets/))
* [`forecast_and_validation_full_context.png`](./architecture_and_engineering/assets/forecast_and_validation_full_context.png): Complete validation architecture context and prediction intervals.
* [`validation_pipeline_snip.png`](./architecture_and_engineering/assets/validation_pipeline_snip.png): Pipeline validation snapshot.

---

### 3. 📊 Reports, Deliverables & Presentation Assets
Located in [`docs/reports_and_deliverables/`](./reports_and_deliverables/):

* [**Executive Platform Presentation Deck (PPTX)**](./reports_and_deliverables/VayuBudhi_Executive_Platform_Presentation.pptx): Full high-impact presentation deck covering the problem space, operational optimization ROI, technical architecture, and live platform demo.
* [**VayuBudhi ML Predictions Report (PDF)**](./reports_and_deliverables/vayu_budhi_ml_predictions_report.pdf): Publication-ready executive analytical report highlighting ML forecasts, attribution metrics, and operational enforcement recommendations.
* [**Executive PDF Report Generator (`generate_report.py`)**](./reports_and_deliverables/generate_report.py): Production Python utility using FPDF to dynamically synthesize model forecasts, TreeSHAP feature attributions, and municipal action scorecards into formatted PDFs.

---

## 🏛️ Subsystem & Component Cross-Reference

If you are working on a specific subsystem of the platform, consult the relevant documentation below:

| Subsystem | Source Directory | Primary Documentation | Key Technical Concepts |
|:---|:---|:---|:---|
| **Hardware AI Verification Lab** | [`hardware_lab/`](../hardware_lab/) | [Phase 4 Enterprise Plan](./audits_and_assessments/05_vayubudhi_2.0_enterprise_plan.md) | ESP32 10Hz streaming, TreeSHAP waterfall, surge diagnostics, hygroscopic correction |
| **Physical IoT Sensor & Firmware** | [`iot_firmware/`](../iot_firmware/), [`hardware_demo_code/`](../hardware_demo_code/) | [Hardware Build Guide](../hardware_demo_code/hardware_build_guide.md) | ESP32 DevKit V1, Nova SDS011, BME280, edge PM ratio classification, offline caching |
| **ML Models & Atmospheric Science** | [`ml_model/`](../ml_model/) | [Finalized ML Architecture](./architecture_and_engineering/ml_and_physics/finalized_ml_architecture.md) | Multi-horizon XGBoost, MAPIE conformal intervals, Random Forest attribution, PBLH physics |
| **FastAPI Backend & Optimization** | [`backend/`](../backend/) | [Forecasting Blueprint](./architecture_and_engineering/ml_and_physics/ml_pipeline_and_forecasting_blueprint.md) | Google OR-Tools CVRPTW solver, heterogeneous fleet dispatch, live API aggregation |
| **Geospatial Digital Twin (UI)** | [`frontend/`](../frontend/) | [AQI Forecaster & Deep Dive Guide](./architecture_and_engineering/ml_and_physics/aqi_forecaster_and_deepdive_guide.md) | Next.js 14, Mapbox GL, deck.gl 3D hexbins, 24h diurnal timeline, Spatial IDW interpolation |
| **GenAI & Citizen Health Advisory** | [`agent_advisor/`](../agent_advisor/) | [Final Audit Report](./audits_and_assessments/03_phase3_final_code_audit_report.md) | Google Gemini 2.0 Flash, multilingual health translation, inhaled dose exposure ($\mu g/h$) |

---

## 💡 Quick Tips for New Engineers & Researchers

1. **Understand the Operational Paradigm**: Begin by reading [**02: Comprehensive Platform Analysis**](./audits_and_assessments/02_phase2_comprehensive_platform_analysis.md) to grasp why VayuBudhi is an *intervention optimizer*, not merely a passive AQI tracker.
2. **Review the Atmospheric Physics**: Study [**AQI Forecaster & Deep Dive Technical Guide**](./architecture_and_engineering/ml_and_physics/aqi_forecaster_and_deepdive_guide.md) to understand how the Ventilation Index ($VI$) and Planetary Boundary Layer Height (PBLH) drive ground-level pollution concentrations.
3. **Explore the Enterprise Roadmap**: Review [**05: VayuBudhi 2.0 Enterprise Plan**](./audits_and_assessments/05_vayubudhi_2.0_enterprise_plan.md) for the next-generation sensor specification (Sensirion SPS30 + SGP41, 4-layer custom PCB, and NB-IoT cellular connectivity).
