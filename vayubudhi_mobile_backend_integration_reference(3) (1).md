# VayuBudhi Mobile App — Backend & Integration Reference

# Current Development Phase

> **Important: The physical hardware is NOT connected yet.**
>
> The immediate goal is to have the **backend alert pipeline and a base React Native + Expo frontend ready before hardware integration**.
>
> Hardware integration will be added later without changing the mobile application's core UI/data contract.

## Current Status

| Component | Current Phase |
|---|---|
| ESP32-S3 + SPS30 + SGP41 + BME280 | ⏳ Hardware not connected yet |
| Real ESP32 → `/api/ingest` | ⏳ Later integration |
| Backend alert model / alert APIs | 🔨 Build now |
| Alert detection logic | 🔨 Build now |
| Expo push notification pipeline | 🔨 Build now |
| Sensor data for mobile development | 🟡 Mock/simulated data |
| React Native + Expo frontend | 🔨 Build now |
| Notifications tab | 🔨 Build now |
| MapLibre enforcement map | 🔨 Build now |
| `/api/city-data` | ✅ Existing backend |
| `/api/optimize` | ✅ Existing backend |
| OR-Tools CVRPTW routing | ✅ Existing backend |

## Current Development Flow — Sensor Alerts

Until the physical hardware is connected, use **mock sensor readings that follow the final hardware data structure**.

```text
Mock Hardware Data
       ↓
   FastAPI Backend
       ↓
 Alert Detection Logic
       ↓
 Alert API / Push Notification
       ↓
 React Native + Expo
       ↓
 Notifications Tab
```

The mock data should represent the eventual hardware fields:

```text
SPS30
├── PM1.0
├── PM2.5
├── PM4.0
└── PM10

SGP41
├── VOC Index
└── NOx Index

BME280
├── Temperature
├── Humidity
└── Pressure
```

The mobile frontend should therefore be developed against the **same data contract expected from the real hardware later**.

## Later Hardware Integration

When the physical node becomes available, the intended production flow is:

```text
SPS30 + SGP41 + BME280
          ↓
       ESP32-S3
          ↓
        WiFi
          ↓
   POST /api/ingest
          ↓
     FastAPI Backend
          ↓
     Alert Detection
          ↓
   Alert API / Expo Push
          ↓
     React Native App
```

The hardware integration should replace the mock sensor-data source, **not require a redesign of the mobile notification UI**.

## Current Development Flow — Enforcement

The enforcement feature does **not** depend on the physical hardware being connected.

It can be developed and tested immediately using the existing backend:

```text
GET /api/city-data?city=Delhi
          ↓
MapLibre station markers
          ↓
Officer taps Dispatch
          ↓
POST /api/optimize
          ↓
OR-Tools CVRPTW
          ↓
Prioritized + Evidence-Backed
Enforcement Recommendations
          ↓
Geospatial Evidence + Route
```

The enforcement frontend should therefore be developed now, using the existing backend responses. Hardware integration is a separate later step.

---


> Scope: React Native + Expo mobile application with **two core features only**:
> **Enforcement Routing** and **Sensor Notifications**.
>
> The mobile app should reuse the existing VayuBudhi backend, IoT pipeline, OR-Tools routing logic, and map data wherever possible.

---

## 1. Mobile Technology Decisions

### Map: Use MapLibre, Not `react-native-maps`

Use **Option B — `@maplibre/maplibre-react-native`**.

The mobile app should use the same CARTO Dark Matter map style as the existing web dashboard:

```text
https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json
```

This gives the mobile application:

- The same dark map aesthetic as the web dashboard.
- Visual consistency between the web and mobile applications.
- The same CARTO Dark Matter tiles.
- No map API key requirement for this setup.
- Support for station markers, route polylines, and map annotations.

Install:

```bash
npm install @maplibre/maplibre-react-native
```

Do **not** use `react-native-maps` for this implementation.

The existing web dashboard uses MapLibre GL JS with deck.gl. deck.gl itself should **not** be ported to React Native because it depends on browser WebGL APIs. The mobile application only needs the relevant MapLibre functionality for the two demo flows.

---

# 2. Core Mobile Features

The mobile application has exactly two main tabs:

```text
┌─────────────────────────────────────┐
│          VayuBudhi Mobile           │
├─────────────────────────────────────┤
│                                     │
│  [ Enforcement ]   [ Notifications ]│
│                                     │
└─────────────────────────────────────┘
```

---

# 3. Flow A — Sensor Notification Tab

> **Development note:** This flow is being implemented **before the physical hardware is connected**. Use mock/simulated readings for development, while keeping the fields and alert contract aligned with the final SPS30 + SGP41 + BME280 hardware.


The mobile notification tab should be based on the **actual values produced by the hardware**, not on a separate mobile-side interpretation of the data.

The hardware assembly guide defines the sensor set as:

- **SPS30** → PM1.0, PM2.5, PM4.0, PM10.0
- **SGP41** → VOC Index, NOx Index
- **BME280** → Temperature, Humidity, Pressure

The ESP32-S3 reads these sensors and is responsible for sending their readings to the backend.

The mobile application should therefore receive the relevant sensor reading associated with an alert and display the hardware values directly.

---

## Hardware → Mobile Flow

```text
SPS30 ──────┐
            │
SGP41 ──────┼──→ ESP32-S3 ──→ WiFi ──→ FastAPI /api/ingest
            │                              │
BME280 ─────┘                              ↓
                                      Alert detection
                                             ↓
                                      Alert record
                                             ↓
                                      Expo Push
                                             ↓
                                      Mobile App
```

The mobile app should **not connect directly to the ESP32 or sensors**.

---

## Hardware Data Available to the Mobile App

Based on the hardware assembly guide, the sensor data that can be associated with an alert is:

| Hardware | Data | Unit / Format |
|---|---|---|
| SPS30 | PM1.0 | µg/m³ |
| SPS30 | PM2.5 | µg/m³ |
| SPS30 | PM4.0 | µg/m³ |
| SPS30 | PM10 | µg/m³ |
| SGP41 | VOC Index | Index |
| SGP41 | NOx Index | Index |
| BME280 | Temperature | °C |
| BME280 | Humidity | % |
| BME280 | Pressure | hPa |
| ESP32-S3 | Station/device ID | Identifier |
| ESP32-S3 | Timestamp | Timestamp |

The mobile alert should present these values as **sensor readings**, without pretending that the mobile app calculated them.

---

# 4. Alert Design Based on the Hardware

The hardware guide explicitly defines the physical high-pollution alert behavior:

```text
PM2.5 > 60
      ↓
Buzzer beeps
      ↓
NeoPixel changes according to pollution level
      ↓
TFT reflects the high-pollution condition
```

The final integration test specifically expects:

```text
Buzzer beeps when PM2.5 > 60
```

and:

```text
Incense test:
PM spikes
→ screen turns red
→ buzzer beeps
→ NeoPixel turns red
```

Therefore, the **mobile alert trigger should be aligned with this existing hardware behavior**.

For the mobile implementation:

```text
PM2.5 > 60 µg/m³
        ↓
Create high-PM alert
        ↓
Send Expo push notification
        ↓
Show sensor readings in mobile alert
```

Do not introduce a separate arbitrary mobile threshold.

### Important

The hardware guide does **not** define exact mobile alert thresholds for:

- VOC Index
- NOx Index
- PM1.0
- PM4.0
- PM10

Therefore, these values should be displayed as sensor information when an alert is generated, but the mobile application should not independently invent additional trigger rules.

If the backend later adds additional alert rules, those rules should come from the backend rather than being hardcoded into the mobile app.

---

# 5. Mobile Alert Notification

The push notification should be simple and directly tied to the hardware event.

Example:

```text
⚠️ Air Quality Alert

PM2.5 has exceeded the configured hardware alert threshold.

Sensor: ESP32_01
PM2.5: 74.2 µg/m³
```

The notification should not claim a source attribution or AQI category unless the backend explicitly provides those values.

---

# 6. Mobile Alert Card

The alert card should focus on **what the physical device actually measured**.

Example:

```text
┌─────────────────────────────────────┐
│ ⚠️ Air Quality Alert                │
│                                     │
│ ESP32_01                            │
│ Detected: 12:04 PM                  │
│                                     │
│ PARTICULATE MATTER                  │
│ PM1.0     48.1 µg/m³                │
│ PM2.5     74.2 µg/m³   ⚠️           │
│ PM4.0     91.6 µg/m³                │
│ PM10     105.3 µg/m³                │
│                                     │
│ GAS INDICES                         │
│ VOC       126                       │
│ NOx        98                       │
│                                     │
│ ENVIRONMENT                         │
│ Temperature   28.4 °C               │
│ Humidity      74.4 %                │
│ Pressure      948.8 hPa              │
│                                     │
│              [ Sensor Location ]    │
│                  📍                 │
└─────────────────────────────────────┘
```

### Alert card principles

The card should:

- Show the **actual hardware readings**.
- Keep PM2.5 visually prominent because it is the current hardware-defined alert trigger.
- Show PM1.0, PM4.0 and PM10 from the SPS30.
- Show VOC and NOx indices from the SGP41.
- Show temperature, humidity and pressure from the BME280.
- Show the station/device ID.
- Show the timestamp.
- Show the sensor location if coordinates are available from the backend.
- Avoid adding unsupported values simply to make the card look more sophisticated.

---

# 7. What Should NOT Be Invented in the Mobile Alert

The hardware assembly guide does not state that the ESP32 itself produces:

- AQI
- Pollution source attribution
- Population exposed
- Legal basis
- Enforcement severity
- ROI

Therefore, these should **not** be presented as hardware sensor readings.

They belong to other layers of VayuBudhi.

For the Sensor Notifications tab, the primary data should remain:

```text
SPS30
├── PM1.0
├── PM2.5
├── PM4.0
└── PM10

SGP41
├── VOC Index
└── NOx Index

BME280
├── Temperature
├── Humidity
└── Pressure

ESP32-S3
├── Station ID
└── Timestamp
```

---

# 8. Backend Data Required for the Mobile Alert

The existing backend reference currently stores:

```text
station_id
timestamp
pm25
pm10
temp
humidity
pressure
```

However, the hardware assembly guide shows that the final hardware provides additional measurements:

```text
pm1
pm4
voc_index
nox_index
```

If the mobile application is expected to show **all hardware data**, these additional fields must also be carried through the backend.

The desired mobile alert response should therefore conceptually contain:

```json
{
  "id": 1,
  "station_id": "esp32_01",
  "timestamp": "2026-08-15T12:04:00Z",

  "pm1": 48.1,
  "pm25": 74.2,
  "pm4": 91.6,
  "pm10": 105.3,

  "voc_index": 126,
  "nox_index": 98,

  "temp": 28.4,
  "humidity": 74.4,
  "pressure": 948.8,

  "lat": 28.6468,
  "lon": 77.3160,

  "alert_reason": "PM2.5 exceeded 60 µg/m³"
}
```

The exact JSON field names should follow the actual backend implementation, but the mobile app should receive the complete hardware reading associated with the alert.

---

# 9. Backend Alert Endpoints

The backend will provide:

### Get Alert Feed

```http
GET /api/alerts?station_id=&limit=50
```

The mobile app uses this to retrieve recent sensor alerts.

Each alert should contain the hardware readings associated with the event.

### Acknowledge Alert

```http
PATCH /api/alerts/{id}/acknowledge
```

This only changes the alert's acknowledgement state. It should not modify the underlying sensor readings.

### Register Expo Device

```http
POST /api/devices/register
```

Request:

```json
{
  "token": "ExponentPushToken[xxx]"
}
```

This allows the backend to send a push notification when the alert condition occurs.

---

# 10. Push Notification Flow

```text
SPS30 reads PM2.5
        ↓
ESP32-S3
        ↓
POST /api/ingest
        ↓
Backend checks hardware-defined alert condition
        ↓
PM2.5 > 60 µg/m³
        ↓
Create Alert
        ↓
Send Expo Push
        ↓
Phone receives:
"⚠️ Air Quality Alert — PM2.5 74.2 µg/m³"
        ↓
User taps notification
        ↓
Mobile opens the corresponding alert card
        ↓
Complete hardware reading is displayed
```

The push notification itself can be short. The alert card is where the full sensor data should be shown.

---

# 11. Important Hardware Behaviour to Preserve

The mobile application should complement, not replace, the physical device's alert behavior.

The hardware guide specifies:

```text
PM2.5 > 60
      ↓
Buzzer alert
      ↓
NeoPixel visual alert
      ↓
TFT displays the condition
```

The mobile application adds:

```text
PM2.5 > 60
      ↓
Backend alert
      ↓
Expo push notification
      ↓
Mobile alert card
```

This creates a consistent alert path:

```text
             ┌──→ TFT
             │
ESP32 ───────┼──→ NeoPixel
             │
             ├──→ Buzzer
             │
             └──→ Backend
                       ↓
                  Mobile App
```

The same physical event is therefore visible on the device and on the officer's phone.

---

# 10. Flow B — Evidence-Backed Enforcement Tab

The Enforcement tab should not present OR-Tools only as a route optimizer.

The evaluation focus requires the system to generate:

> **prioritised, evidence-backed enforcement action recommendations for municipal and pollution control authorities with supporting geospatial documentation.**

Therefore, the mobile enforcement experience should show the complete chain:

```text
Pollution / Sensor Evidence
        ↓
Priority / Risk Assessment
        ↓
Recommended Enforcement Action
        ↓
Evidence Supporting Recommendation
        ↓
Geospatial Context
        ↓
OR-Tools CVRPTW Route Optimization
        ↓
Prioritized Enforcement Plan
```

The existing OR-Tools routing remains the real optimization layer. The mobile application adds the presentation layer that makes the **reason for each enforcement recommendation visible and auditable**.

---

# 11. Enforcement Demo Flow

```text
Officer opens mobile app
        ↓
Enforcement tab
        ↓
GET /api/city-data?city=Delhi
        ↓
Station / pollution markers appear on MapLibre map
        ↓
Officer taps "Dispatch"
        ↓
POST /api/optimize
        ↓
OR-Tools CVRPTW solver
        ↓
Optimized route + enforcement stops
        ↓
Mobile ranks/displays stops as an enforcement plan
        ↓
Each stop shows:
  - Priority
  - Recommended action
  - Evidence
  - ETA
  - ROI
        ↓
Officer can open "View Evidence"
        ↓
Evidence + geospatial context are displayed
```

---

# 12. Enforcement Recommendation Card

Each route stop should be presented as an **enforcement recommendation**, not just a route waypoint.

Example:

```text
┌────────────────────────────────────────┐
│ 🔴 PRIORITY 1                          │
│ Anand Vihar                            │
│                                        │
│ RECOMMENDED ACTION                     │
│ FULL INSPECTION                        │
│                                        │
│ ETA          09:34                     │
│ ROI          54.2                      │
│                                        │
│ AQI          342                       │
│ PM2.5        142 µg/m³                 │
│ PM10         169 µg/m³                 │
│ Population   185,000                   │
│                                        │
│ Source       Vehicular                 │
│ Confidence   0.92                      │
│                                        │
│ [ View Evidence ]                      │
└────────────────────────────────────────┘
```

The exact fields shown must come from the backend where available. Demo-only values should be clearly treated as presentation data and should not be represented as independently calculated mobile intelligence.

---

# 13. Why Was This Location Prioritized?

The application should make the prioritization understandable.

When the officer opens a recommendation, show a section such as:

```text
WHY THIS LOCATION?

• High pollution severity
• High population exposure
• Strong source-attribution confidence
• High enforcement ROI
• Suitable for immediate inspection
```

The explanation should be generated from **actual backend evidence and existing routing/priority information**.

Do not invent scoring weights or evidence that the backend does not actually calculate.

If a formal priority score already exists in the backend, display it directly.

If it does not, show the underlying evidence fields instead of fabricating a score.

---

# 14. Evidence Panel

Every important enforcement recommendation should have a **View Evidence** action.

Example:

```text
┌────────────────────────────────────────┐
│ ENFORCEMENT EVIDENCE                   │
│                                        │
│ 📍 Anand Vihar                         │
│                                        │
│ POLLUTION                              │
│ AQI          342                       │
│ PM2.5        142 µg/m³                 │
│ PM10         169 µg/m³                 │
│                                        │
│ SOURCE                                 │
│ 🚗 Vehicular                           │
│ Confidence   92%                       │
│                                        │
│ EXPOSURE                               │
│ Population   185,000                   │
│                                        │
│ RECOMMENDATION                         │
│ FULL INSPECTION                        │
│                                        │
│ LEGAL BASIS                            │
│ GRAP Stage III, §4.2                   │
│                                        │
│ [ View on Map ]                        │
└────────────────────────────────────────┘
```

This panel exists to answer the evaluator's most important question:

> **Why is this particular enforcement action being recommended?**

The evidence should be traceable to the data already available in the VayuBudhi backend.

---

# 15. Geospatial Documentation

The map must be treated as part of the evidence, not merely as a background.

For an enforcement recommendation, the mobile app should visually connect:

- Monitoring/sensor location
- Enforcement target location
- Route position
- Other relevant station markers
- Route sequence
- Coordinates
- ETA
- Population/exposure information where available
- Relevant geographic context already supplied by the backend

Example:

```text
                    📍 ②
                   ╱
                  ╱
        📍 ① ────╱
          ╲
           ╲
            🏢 DEPOT
```

The selected recommendation should be identifiable on the map.

A user should be able to move between:

```text
Recommendation
      ↕
Evidence
      ↕
Map Location
```

This directly supports the **supporting geospatial documentation** requirement.

---

# 16. Prioritized Enforcement Plan

Instead of presenting only a route, show the officer a prioritized enforcement plan.

Example:

```text
OPTIMIZED ENFORCEMENT PLAN

01 🔴 Anand Vihar
   FULL INSPECTION
   ETA 09:34
   ROI 54.2

02 🟠 ITO
   VERIFY FIRST
   ETA 10:15
   ROI 12.8

03 🟡 R.K. Puram
   MONITOR
   ETA 10:48
   ROI 7.4
```

The route order should follow the optimized result returned by OR-Tools.

The mobile interface should make the priority and action explicit rather than forcing the evaluator to infer them from map markers.

---

# 17. Recommended Action + Alternative

Where the backend provides different action types, show the recommendation clearly.

Supported actions include:

```text
FULL_INSPECTION
VERIFY_FIRST
MONITOR
```

Example:

```text
RECOMMENDED
🔴 FULL INSPECTION

Reason:
High pollution severity + high exposure +
strong supporting evidence.

ALTERNATIVE
🟠 VERIFY FIRST

Reason:
Lower-cost verification option.
```

Only display an alternative when the backend provides enough information to support it.

The mobile app must not invent alternative enforcement decisions.

---

# 18. Route Visualization

The existing OR-Tools CVRPTW pipeline remains responsible for the actual optimization.

The mobile app should render the result using MapLibre.

```text
Depot
  │
  ├──────→ ① Anand Vihar
  │          FULL INSPECTION
  │
  ├──────→ ② ITO
  │          VERIFY FIRST
  │
  └──────→ ③ R.K. Puram
             MONITOR
```

Use:

- Numbered stop markers
- Color-coded recommendation/action indicators
- Optimized route polyline
- ETA
- Stop cards
- ROI
- Evidence access

The route should remain based on the real OR-Tools output.

---

# 19. Enforcement Evidence Timeline

Where timestamps are available, the selected recommendation can show an evidence timeline:

```text
12:01:15
Sensor reading received
PM2.5 = 142 µg/m³
        ↓
12:01:20
Pollution condition detected
        ↓
12:01:21
Source attribution generated
        ↓
12:01:22
Location prioritized
        ↓
12:01:24
OR-Tools route optimized
        ↓
12:01:25
FULL INSPECTION recommended
```

This is optional and should only be implemented if the backend contains the corresponding timestamps/events.

The purpose is to make the decision chain auditable:

```text
Evidence
   ↓
Analysis
   ↓
Priority
   ↓
Recommendation
   ↓
Route
```

---

# 20. Recommendation Quality / Expert Evaluation

The evaluation specifically mentions:

> **enforcement recommendation quality rated by domain experts**

The mobile interface should therefore make recommendations transparent enough for a domain expert to evaluate.

For each recommendation, expose:

```text
Recommendation
FULL INSPECTION

Supporting evidence
✓ Pollution measurements
✓ Source attribution
✓ Confidence
✓ Exposure
✓ Geospatial context
✓ ROI
✓ Route position
```

If a real domain-expert review mechanism is implemented, it can provide:

```text
DOMAIN EXPERT REVIEW

Recommendation quality
☆ ☆ ☆ ☆ ☆

[ Submit Review ]
```

However, the application must **not claim that recommendations have been domain-expert validated unless such validation has actually been performed**.

The goal of the interface is to make the recommendation evidence and reasoning transparent and assessable.

---

# 21. Enforcement API

The existing enforcement APIs remain the source of truth.

### Get City / Station Data

```http
GET /api/city-data?city=Delhi
```

The mobile application uses this to obtain station information for the map and optimization request.

### Optimize Enforcement Route

```http
POST /api/optimize
```

The existing OR-Tools CVRPTW solver processes the request and returns optimized enforcement stops.

The mobile application should not implement another routing algorithm.

---

# 22. Enforcement Route Response

The existing response contains:

```json
{
  "route_id": "combined_enforcement_route",
  "stops": [
    {
      "source_id": "S_0",
      "lat": 28.6468,
      "lon": 77.3160,
      "eta": "09:34",
      "action": "FULL_INSPECTION",
      "roi": 54.2
    },
    {
      "source_id": "S_1",
      "lat": 28.6289,
      "lon": 77.2405,
      "eta": "10:15",
      "action": "VERIFY_FIRST",
      "roi": 12.8
    }
  ]
}
```

The mobile application should use these values for:

- Route sequence
- Stop coordinates
- ETA
- Action recommendation
- ROI
- Map rendering

Additional evidence fields should be consumed from backend responses when available.

---

# 23. Evidence Data to Expose

For the evaluation focus, the enforcement recommendation should ideally expose the following information when it exists in the backend:

| Evidence | Purpose |
|---|---|
| AQI / pollution level | Demonstrates pollution severity |
| PM2.5 / PM10 | Shows underlying pollutant measurements |
| Source attribution | Supports likely pollution source |
| Confidence | Shows strength of attribution |
| Population exposed | Shows impact |
| Coordinates | Provides geographic evidence |
| Station/sensor ID | Identifies evidence source |
| Timestamp | Establishes when evidence was observed |
| ROI | Supports enforcement prioritization |
| Action | Converts evidence into an enforcement recommendation |
| ETA | Connects recommendation to execution |
| Legal basis | Provides regulatory context when available |

Do not display a field as real evidence unless it is actually provided or calculated by the backend.

---

# 24. Demo Display Values

The current web application adds some presentation values client-side.

For the hackathon demo, the mobile application may mirror these existing display values:

```text
severity: 350
population_exposed: 185,000
legal_basis: "GRAP Stage III, §4.2"
confidence: 0.92
```

However, these values should be treated as **demo display values**, not as evidence independently calculated by the mobile application.

The stronger long-term implementation is to expose these values through the backend with their actual provenance.

---

# 25. Final Enforcement UX

The Enforcement tab should therefore have three connected layers:

```text
┌─────────────────────────────────────────┐
│ 1. GEOSPATIAL EVIDENCE                  │
│                                         │
│       DARK MAP                          │
│   📍 stations                           │
│   🔴 priority locations                 │
│   ━━━ optimized route                  │
│                                         │
├─────────────────────────────────────────┤
│ 2. PRIORITIZED ACTION PLAN              │
│                                         │
│ 🔴 #1 Anand Vihar                      │
│ FULL INSPECTION | ETA 09:34 | ROI 54.2 │
│ [ View Evidence ]                       │
│                                         │
│ 🟠 #2 ITO                              │
│ VERIFY FIRST | ETA 10:15 | ROI 12.8    │
│ [ View Evidence ]                       │
│                                         │
├─────────────────────────────────────────┤
│ 3. EVIDENCE                             │
│                                         │
│ Pollution measurements                  │
│ Source attribution                      │
│ Confidence                              │
│ Population / exposure                   │
│ Coordinates / map context               │
│ Recommendation rationale                │
│ Legal basis, where available            │
└─────────────────────────────────────────┘
```

This changes the enforcement feature from:

```text
"Here is an optimized route."
```

to:

```text
"Here are the locations that should be prioritized,
here is the enforcement action recommended for each,
here is the evidence supporting that recommendation,
here is the geographic context,
and here is the most efficient route for executing it."
```

That structure is directly aligned with the evaluation focus on **prioritised, evidence-backed enforcement action recommendations and supporting geospatial documentation**.

---

# 19. Mobile API Sequence

## Enforcement Tab

```text
1. GET /api/city-data?city=Delhi
          ↓
2. Render station / pollution evidence on MapLibre
          ↓
3. Officer taps Dispatch
          ↓
4. POST /api/optimize
          ↓
5. Receive optimized stops
          ↓
6. Display prioritized enforcement plan
          ↓
7. Draw MapLibre route + numbered stops
          ↓
8. Show recommended action + ETA + ROI
          ↓
9. Officer opens View Evidence
          ↓
10. Show pollution / source / exposure / geographic evidence
```

## Notification Tab

```text
1. Register Expo push token
          ↓
2. POST /api/devices/register
          ↓
3. GET /api/alerts?limit=50
          ↓
4. Display recent hardware alerts
          ↓
5. Backend detects PM2.5 > 60 µg/m³
          ↓
6. Expo push arrives
          ↓
7. Phone displays PM2.5 alert
          ↓
8. User taps notification
          ↓
9. Open alert details
          ↓
10. Show complete hardware reading
    PM1.0 / PM2.5 / PM4.0 / PM10
    VOC / NOx
    Temperature / Humidity / Pressure
          ↓
11. User dismisses
          ↓
12. PATCH /api/alerts/{id}/acknowledge
```

---

# 20. What Already Exists vs What the Mobile App Adds

| Component | Current Status |
|---|---|
| ESP32 → `/api/ingest` | Existing |
| SDS011 PM2.5 / PM10 readings | Existing |
| BME280 readings | Existing |
| `sensor_readings` table | Existing |
| `GET /api/city-data` | Existing |
| NAQI calculation | Existing |
| Existing AQI > 200 `status="alert"` flag | Existing, but separate from the hardware alert trigger |
| ML source attribution | Existing |
| OR-Tools CVRPTW routing | Existing |
| `POST /api/optimize` | Existing |
| Enforcement route persistence | Existing |
| MapLibre/CARTO web map | Existing |
| `Alert` database model | Backend change |
| PM2.5-based alert detection in ingest | Backend change |
| `GET /api/alerts` | Backend change |
| Alert acknowledgement endpoint | Backend change |
| Expo device registration | Backend change |
| Expo push notifications | Backend change |
| Mobile MapLibre UI | New mobile implementation |
| Mobile enforcement tab | New mobile implementation |
| Mobile notification tab | New mobile implementation |
| Mobile alert cards | New mobile implementation |
| Mobile route stop cards | New mobile implementation |

---

# 21. Final Mobile Architecture

```text
                         VAYUBUDHI
                              │
             ┌────────────────┴────────────────┐
             │                                 │
        IoT Hardware                     Existing Backend
             │                                 │
      SDS011 + BME280                          │
             │                                 │
           ESP32                               │
             │                                 │
            WiFi                               │
             │                                 │
       POST /api/ingest                        │
             └───────────────► FastAPI ◄───────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              Sensor Alerts              OR-Tools CVRPTW
                    │                           │
             Expo Push API                /api/optimize
                    │                           │
                    └─────────────┬─────────────┘
                                  │
                         React Native + Expo
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              Notifications               Enforcement
                    │                           │
             Alert Cards                 MapLibre Map
             AQI / PM2.5                 Station Markers
             Source Attribution          Route Polyline
             Mini Map                    ETA / Action / ROI
                    │                           │
                    └─────────────┬─────────────┘
                                  │
                         VayuBudhi Mobile
```

## Core Principle

The mobile application should **reuse the hardware data and backend functionality already present in VayuBudhi**.

For the Sensor Notifications tab, it should not invent additional sensor intelligence. It should present the measurements produced by the:

- SPS30
- SGP41
- BME280
- ESP32-S3

The mobile app's responsibility is to:

1. **Receive and present hardware-triggered alerts clearly.**
2. **Show the complete sensor reading associated with each alert.**
3. **Visualize the existing optimized enforcement route.**
4. **Provide a consistent MapLibre/CARTO Dark Matter experience.**
5. **Keep hardware measurements separate from backend-derived analytics such as AQI, source attribution, ROI, and enforcement decisions.**
