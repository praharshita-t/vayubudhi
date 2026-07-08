# VayuBudhi — How Each Member Proceeds (Integration Guide)

**Golden rule:** Lock the interfaces on Day 1. Build your own piece against fake/mock data. Only plug into real teammates' work on the checkpoint days below. This is how 4 people build separately without breaking each other.

---

## Day 1, Hour 1 — Everyone in one room, freeze 4 contracts

Before anyone writes real logic, agree on these 4 JSON shapes and write them in a shared doc. Nobody changes them alone later — any change is a 2-minute group message, not a silent edit.

**1. Sensor → Backend**
```json
{"station_id": "esp32_01", "timestamp": "2026-07-07T10:15:00Z",
 "pm25": 142.3, "pm10": 168.9, "temp": 31.2, "humidity": 58.4, "pressure": 1008.1}
```

**2. Attribution output (ML → Backend)**
```json
{"prediction_set": ["biomass_burning"], "set_size": 1, "confidence": 0.90,
 "probabilities": {"biomass_burning": 0.82, "vehicular": 0.11}}
```

**3. Forecast output (ML → Backend/Frontend)**
```json
{"horizon_h": 24, "point": 210, "interval": [180, 245], "ventilation_index": 850}
```

**4. Optimizer output (Backend → Frontend)**
```json
{"route_id": "inspector_1",
 "stops": [{"source_id": "s7", "lat": 28.6, "lon": 77.2, "eta": "10:45",
            "action": "FULL_INSPECTION", "roi": 54.2}]}
```

Member 2 also ships a **stub endpoint** in this first hour — `@app.post("/ingest") → return 200`. Empty logic, correct shape. This unblocks Member 4 immediately.

---

## Member 1 — ML Engineer & Atmospheric Modeler

**Proceed how:** Build entirely offline against historical/synthetic data. You don't need anyone else's code running.
- Days 1–6: build features, train XGBoost, train Random Forest, wrap both in MAPIE, validate (RMSE, JSD).
- Your output at every stage must already match **Contract 2 and Contract 3** exactly — test this yourself by printing your function's output and eyeballing it against the schema before handing anything off.
- **Day 5 checkpoint:** hand Member 2 your trained model as a plain Python function that takes readings in and returns Contract 2/3 shape out. This is the only handoff you owe anyone before Day 7.
- Days 7–10: help Member 2 wire your model into the real backend, then work on validation dashboards and pre-cached fallback scenarios.

**Don't do:** wait on live sensor data or a live API to start training. Use CSVs and mock rows the whole time.

---

## Member 2 — Backend Developer & Operations Optimizer

**Proceed how:** You're the hub everyone else plugs into, so you move first and fastest on scaffolding.
- Day 1: stand up FastAPI + SQLite schema + the stub `/ingest` endpoint (fake logic, real shape) so Member 4 can start posting immediately.
- Days 2–4: build real endpoints, OR-Tools solver — test the solver against **synthetic source lists** shaped like Contract 2, not against Member 1's real model yet.
- **Day 5 checkpoint:** receive Member 1's real model function, replace your stub logic, endpoint now returns real predictions.
- **Day 6 checkpoint:** Member 3 will start hitting your real endpoints for the first time today — be present, expect their first calls to break something, fix live.
- Days 7–10: full-chain integration lead. You're in the room for every checkpoint below.

**Don't do:** let Member 3 or 4 wait on you past their stub/mock stage — if your real endpoint isn't ready, keep the stub alive so they're never blocked.

---

## Member 3 — Frontend & GIS Developer

**Proceed how:** Build the entire dashboard against a **hardcoded fake JSON file** shaped exactly like Contracts 3 and 4. You should not need a running backend until Day 6.
- Days 1–6: scaffold Next.js, Mapbox/deck.gl layers, dashboard views, GRAP simulator — all reading from your local fake JSON.
- **Day 6 checkpoint:** swap your fake JSON for a real fetch call to Member 2's real endpoint. Expect field mismatches — this is exactly why it happens on Day 6 and not Day 9.
- Days 7–10: live-wire remaining components, polish UI states, animations, loading indicators.

**Don't do:** design your data models around "whatever the backend happens to send" — design against the frozen Contract 3/4 shapes, so the Day 6 swap is a fetch-URL change, not a rewrite.

---

## Member 4 — IoT Hardware & GenAI Integrator

**Proceed how:** Get sensor → JSON working standalone first; the backend's real logic is irrelevant to you, only the endpoint shape matters.
- Day 1: wire ESP32 + SDS011 + BME280 + OLED on breadboard, get raw readings printing locally.
- Days 2–3: write firmware that posts Contract 1 JSON — test against Member 2's **stub endpoint**, not a finished one.
- **Day 3 checkpoint:** first real POST over the phone hotspot to the stub. Confirms wire format works physically, not just in theory.
- Days 4–6: build LangGraph coordinator + Gemini advisory generation in parallel — these depend on Contract 2/3 shapes, not on live ML, so use mock attribution/forecast JSON to build against.
- Days 7–10: connect LangGraph to real backend outputs, assemble the physical enclosure, run full demo rehearsals.

**Don't do:** wait for Member 1's real model to test your Gemini prompts — feed them mock attribution JSON from Day 4 onward.

---

## The 3 mandatory full-team checkpoints

| Day | What happens | Who must be present |
|:---|:---|:---|
| **Day 3** | ESP32 → stub endpoint, first real POST over hotspot | Member 2 + 4 |
| **Day 6** | Frontend swaps fake JSON for real backend calls; backend swaps stub logic for real ML | All 4 |
| **Day 7** | First full chain: real sensor → real backend → real ML → real optimizer → real frontend | All 4 |

After Day 7, Days 8–10 are dry-run rehearsals and fallback-safety, not new integration — if anything breaks and can't be fixed in ~2 hours, fall back to the pre-cached scenario data rather than debugging live on Day 9 or 10.
