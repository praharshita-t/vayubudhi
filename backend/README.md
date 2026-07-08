# Member 2: Backend Developer & Operations Optimizer

This directory contains the FastAPI REST backend, database schema migrations, and optimization engines.

## Key Tasks & Roles
1. **REST APIs & Database**: Build endpoints and SQLite schema logic. Ensure the `/ingest` stub is available.
2. **OpenAQ Historical Loader**: Code ingestion logic in `app/scripts/openaq_loader.py`.
3. **Vehicle Routing Solver (CVRPTW)**: Implement routing optimization in `app/optimization/solver.py` using Google OR-Tools.
4. **Uncertainty-Aware Routing Dispatch**: Route logic dynamically sending drones/inspectors depending on classifier confidence.
5. **Cost-Benefit ROI Calculator**: Formulate exposure reduction and inspection costs calculations.

## Checkpoints
- **Day 1**: Launch the FastAPI server + SQLite schema, and provide the `/ingest` endpoint stub immediately so Member 4 (ESP32 Firmware) can post.
- **Day 5**: Wire in the real ML model function from Member 1, swapping out the mock/stub classifier.
- **Day 6**: Be ready to support Member 3 (Frontend) fetching real API data.
