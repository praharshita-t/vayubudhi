# VayuBudhi — Sensor Data Format & Dry Run Guide

## What the Backend Expects

The ESP32 hardware sends a **JSON POST** to `POST /api/ingest` every 5 seconds.

The backend doesn't care whether it comes from a real ESP32 or a script — it's just JSON over HTTP.

---

## The Exact JSON Payload

```json
{
  "station_id": "esp32_01",
  "timestamp": "2026-08-15T15:30:00Z",
  "pm25": 142.3,
  "pm10": 168.9,
  "temp": 31.2,
  "humidity": 58.4,
  "pressure": 1008.1
}
```

## The Backend Response

```json
{"status": "received"}
```

---

## Field Reference

| Field | Type | Required | What It Is | Unit | Example |
|---|---|---|---|---|---|
| `station_id` | string | ✅ | Unique ID of the sensor device | — | `"esp32_01"` |
| `timestamp` | string | ✅ | When the reading was taken (ISO 8601 UTC) | — | `"2026-08-15T15:30:00Z"` |
| `pm25` | float | ✅ | Fine particulate matter concentration | µg/m³ | `142.3` |
| `pm10` | float | ✅ | Coarse particulate matter concentration | µg/m³ | `168.9` |
| `temp` | float | ✅ | Ambient temperature | °C | `31.2` |
| `humidity` | float | ✅ | Relative humidity | % | `58.4` |
| `pressure` | float | ✅ | Barometric pressure | hPa | `1008.1` |

### Optional Fields (schema accepts them but ESP32 never sends them)

| Field | Type | Default | Note |
|---|---|---|---|
| `wind_speed` | float | `3.0` | Accepted by schema but **not stored** in DB |
| `pblh` | float | `1000.0` | Accepted by schema but **not stored** in DB |
| `lat` | float | `28.6139` | Accepted by schema but **not stored** in DB |
| `lon` | float | `77.2090` | Accepted by schema but **not stored** in DB |

---

## Where It Goes in the Backend

```
POST /api/ingest
       │
       ▼
  Pydantic validates the 7 fields (schemas.py → SensorReading)
       │
       ▼
  SQLAlchemy writes to SQLite table "sensor_readings" (models.py → SensorReading)
       │
       ▼
  Returns {"status": "received"}
```

**Backend file:** `backend/app/routers/ingest.py`  
**Schema file:** `backend/app/schemas.py` (class `SensorReading`)  
**DB model file:** `backend/app/models.py` (class `SensorReading`)  
**Database:** `backend/vayubudhi.db` (SQLite)

### What Gets Stored in the Database

| DB Column | Comes From | Type |
|---|---|---|
| `id` | Auto-generated | Integer (primary key) |
| `station_id` | `station_id` field | String |
| `timestamp` | `timestamp` field | String |
| `pm25` | `pm25` field | Float |
| `pm10` | `pm10` field | Float |
| `temp` | `temp` field | Float |
| `humidity` | `humidity` field | Float |
| `pressure` | `pressure` field | Float |
| `created_at` | Auto-generated (server time) | DateTime |

---

## Dry Run — Testing Without Hardware

### Option 1: curl

```bash
curl -X POST http://127.0.0.1:8000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "station_id": "esp32_01",
    "timestamp": "2026-08-15T15:30:00Z",
    "pm25": 142.3,
    "pm10": 168.9,
    "temp": 31.2,
    "humidity": 58.4,
    "pressure": 1008.1
  }'
```

### Option 2: PowerShell

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/ingest" -Method POST -ContentType "application/json" -Body '{
  "station_id": "esp32_01",
  "timestamp": "2026-08-15T15:30:00Z",
  "pm25": 142.3,
  "pm10": 168.9,
  "temp": 31.2,
  "humidity": 58.4,
  "pressure": 1008.1
}'
```

### Option 3: Python script (continuous, simulates real hardware)

```python
import requests, time, random
from datetime import datetime, timezone

while True:
    requests.post("http://127.0.0.1:8000/api/ingest", json={
        "station_id": "esp32_01",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "pm25": round(80 + random.uniform(-20, 60), 1),
        "pm10": round(110 + random.uniform(-30, 80), 1),
        "temp": round(30 + random.uniform(-3, 5), 1),
        "humidity": round(58 + random.uniform(-10, 10), 1),
        "pressure": round(1008 + random.uniform(-5, 5), 1),
    })
    print("Sent reading")
    time.sleep(5)
```

### Option 4: Postman / Thunder Client

- **Method:** POST  
- **URL:** `http://127.0.0.1:8000/api/ingest`  
- **Header:** `Content-Type: application/json`  
- **Body (raw JSON):** paste the JSON payload above

---

## Realistic Value Ranges

If you're generating test data, use these ranges to stay realistic:

| Field | Clean Air | Moderate | Unhealthy | Severe (Delhi winter) |
|---|---|---|---|---|
| `pm25` | 10–30 | 60–90 | 120–250 | 300–500+ |
| `pm10` | 20–50 | 100–250 | 250–430 | 430–1000 |
| `temp` | 20–25 | 28–35 | 35–42 | 5–15 (winter) |
| `humidity` | 30–50 | 50–65 | 65–80 | 70–90 |
| `pressure` | 1010–1015 | 1005–1010 | 1000–1005 | 995–1005 |

---

## What the Backend Does NOT Do (Currently)

After storing the reading, the ingest endpoint does **nothing else**:

- ❌ Does not calculate AQI
- ❌ Does not check any thresholds
- ❌ Does not create alerts
- ❌ Does not send notifications
- ❌ Does not run ML attribution

All of these must be **added** to the ingest endpoint for the mobile app's notification feature to work.
