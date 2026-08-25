# Implementation Plan: Simulate Tab — Live Event Log + Mobile Notifications

**Scope:** Two features for the **Simulate** tab (`/simulate`), without changing unrelated pages.

| # | Feature | Goal |
|---|---------|------|
| 1 | **Live event log** | User sees scrolling, timestamped text of what the system is doing in real time (no silent 8–18s gaps). |
| 2 | **Mobile push at dispatch** | When enforcement is dispatched, backend fires a notification to the mobile app at that exact moment via a new API. |

**Do not implement yet in this doc — this is the handoff plan for a new tab/session.**

---

## Current state (as of this plan)

### Files involved today

| File | Role |
|------|------|
| `frontend/src/app/simulate/page.tsx` | Renders `SimulatorPanel`; `onAlert` is a no-op `() => {}` |
| `frontend/src/components/SimulatorPanel.tsx` | **All simulation logic** — timers + one API call |
| `backend/app/routers/attribution.py` | `POST /api/attribution` — used once at sim start |
| `backend/app/routers/optimize.py` | `POST /api/optimize` — **not called** during simulation today |
| `backend/app/routers/__init__.py` | Router registration — no notifications router |

### How simulation works today (`SimulatorPanel.tsx`)

1. User clicks **Simulate Spot Event**.
2. `setInterval` updates elapsed time every 100ms.
3. **Only one real API call:** `POST http://127.0.0.1:8000/api/attribution` with sensor payload.
4. **Fake timeline via `setTimeout`:**
   - 0s → stage `detecting`
   - 8s → `attributing` (no new API)
   - 18s → `routing` (no `/api/optimize`)
   - 32s → `dispatched` + `onAlert(iotSensor)`
   - 42s → `simulating = false`
5. UI shows 4 stage dots + timer. Attribution card appears only after routing stage starts.

### Gaps

- No event log / activity feed.
- Routing stage is theater — OR-Tools never runs.
- Notification dispatch does not exist (no FCM, webhook, or mobile endpoint).
- `onAlert` on `/simulate` does nothing (no map on that page).
- Sensor pick: first `source === 'deployed' | 'iot'` or `stations[0]`.

---

## Target architecture

```
User clicks "Simulate Spot Event"
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│  SimulatorPanel — orchestrated pipeline (not fake timers) │
├───────────────────────────────────────────────────────────┤
│  1. DETECT     → log + local spike check                  │
│  2. ATTRIBUTION→ POST /api/attribution → log result       │
│  3. ROUTING    → POST /api/optimize → log route          │
│  4. DISPATCH   → POST /api/notifications/dispatch-alert   │
│                 → log push status → onAlert(sensor)       │
│  5. COMPLETE   → log summary                              │
└───────────────────────────────────────────────────────────┘
        │
        ├── Live Event Log (React state: array of events)
        └── Mobile app ← backend push / webhook / poll
```

**Principle:** Log lines are appended when each step **starts** and when each API **returns**. Optional short delays (300–800ms) between steps for readability, but **no multi-second dead air** without log activity.

---

## Task 1: Live real-time event log

### 1.1 UX spec

Add a panel below the stage indicator:

- Title: **Live pipeline log** or **System activity**
- Monospace / terminal style, max-height ~200px, `overflow-y: auto`, auto-scroll to bottom
- Each line format: `[{elapsed}s] {level?} {message}`
- Levels (optional color): `info` (gray), `success` (green), `warn` (amber), `error` (red)
- Show at least 8–15 lines during a full run

**Example log sequence:**

```
[0.0s] ▶ Simulation started — monitoring IoT sensor ST_0 (Anand Vihar)
[0.1s] PM2.5 spike detected: 57 µg/m³ (baseline threshold exceeded)
[0.2s] POST /api/attribution — running CatBoost conformal classifier…
[1.4s] Attribution complete: {vehicular, biomass_burning} · confidence 92% · set size 2
[1.5s] Dispatch policy: FULL_INSPECTION (high severity + low set ambiguity)
[1.6s] POST /api/optimize — OR-Tools CVRPTW routing 4 hotspots…
[3.2s] Route computed: 4 stops · est. 47 min · ROI 2.1x
[3.3s] POST /api/notifications/dispatch-alert — pushing to mobile app…
[3.5s] ✓ Mobile notification delivered (id: notif_abc123)
[3.5s] Enforcement unit dispatched — alert active on commander map
```

### 1.2 Frontend implementation steps

**File:** `frontend/src/components/SimulatorPanel.tsx`

1. **Add state:**
   ```ts
   type LogLevel = 'info' | 'success' | 'warn' | 'error';
   type SimLogEvent = { ts: number; message: string; level: LogLevel };
   const [events, setEvents] = useState<SimLogEvent[]>([]);
   ```

2. **Helper:**
   ```ts
   const appendLog = (message: string, level: LogLevel = 'info') => {
     setEvents(prev => [...prev, { ts: elapsed, message, level }]);
   };
   ```
   Use a ref for `elapsed` inside async callbacks if needed (`elapsedRef.current`).

3. **Replace `startSimulation` body** with async pipeline:
   - `setEvents([])` on start
   - `appendLog` before each step
   - `await fetch(...)` for each API
   - `appendLog` with response summary on success; `level: 'error'` on catch
   - Update `stage` when each phase begins (keep existing stage UI)

4. **Remove or shorten** hardcoded `setTimeout(8000/18000/32000)` — drive stages from pipeline progress.

5. **Add JSX** for log panel (scrollable `div`).

6. **Optional:** `useEffect` to auto-scroll log container when `events` changes.

**File:** `frontend/src/app/simulate/page.tsx`

- No change required unless you want map + alert; optional later.

### 1.3 Backend calls to wire into the log (reuse existing)

| Step | Endpoint | Body (reference) |
|------|----------|------------------|
| Attribution | `POST /api/attribution` | Same as current `payload` in `SimulatorPanel` (add `lat`, `lon`, `no2`, `so2`, `co`, `o3` if missing) |
| Optimize | `POST /api/optimize` | `{ lat, lon, stations: cityData.stations.map(s => ({ lat, lon, aqi, name })) }` — see `OptimizerPanel.tsx` ~lines 157–169 |

Log the **count of stops**, **total_time_min** if returned, or first stop name from optimize response.

### 1.4 Edge cases

- No `cityData` / empty stations → log error, abort sim early.
- API timeout → log failure, set stage idle or `error`, stop pipeline.
- Reset → clear `events`, clear timers, `onAlert(null)`.

### 1.5 Testing checklist (Task 1)

- [ ] Log updates within first second of clicking Simulate
- [ ] New line appears when attribution API returns (not only at 8s)
- [ ] Routing step mentions OR-Tools and shows stop count
- [ ] No 5+ second gap with zero new log lines
- [ ] Reset clears log

---

## Task 2: Mobile notification at dispatch moment

### 2.1 Choose integration path (pick one before coding)

| Option | When to use | Mobile work |
|--------|-------------|-------------|
| **A. FCM (Firebase Cloud Messaging)** | Native Android / Flutter with Firebase | Register device token, listen for pushes |
| **B. Expo Push** | React Native / Expo app | `expo-notifications` + Expo push token |
| **C. Custom webhook** | You already have a mobile backend URL | Mobile backend receives POST, sends push |
| **D. Poll + in-app only (fallback)** | No push infra yet | Mobile polls `GET /api/notifications/latest` every N seconds |

**Recommended for hackathon:** **C (webhook)** or **D (poll)** fastest; **B** if app is Expo.

### 2.2 Backend — new router

**Create:** `backend/app/routers/notifications.py`

**Endpoints:**

#### `POST /api/notifications/dispatch-alert`

**Request body (suggested schema in `schemas.py`):**

```json
{
  "station_id": "ST_0",
  "station_name": "Anand Vihar",
  "lat": 28.6468,
  "lon": 77.316,
  "city": "Delhi",
  "aqi": 259,
  "pm25": 57.5,
  "stage": "dispatched",
  "attribution_set": ["vehicular", "biomass_burning"],
  "confidence": 0.92,
  "message": "AQI spike detected — enforcement dispatched to Anand Vihar"
}
```

**Response:**

```json
{
  "status": "sent",
  "notification_id": "notif_20260824_001",
  "channel": "webhook",
  "delivered_at": "2026-08-24T18:30:00Z"
}
```

**Implementation logic:**

1. Validate payload (Pydantic model `DispatchAlertRequest` / `DispatchAlertResponse`).
2. Store last notification in memory or SQLite table `notifications` (optional, helps polling).
3. **Dispatch to mobile** via env-configured channel:
   - `MOBILE_WEBHOOK_URL` → `requests.post(webhook_url, json=payload, timeout=5)`
   - Or FCM: use `firebase-admin` + `FCM_DEVICE_TOKEN` env var
4. Return success/failure; never crash sim if push fails — return `status: "failed"` + error string.

**Register router** in `backend/app/routers/__init__.py`:

```python
from app.routers.notifications import router as notifications_router
api_router.include_router(notifications_router)
```

#### Optional: `GET /api/notifications/latest`

For mobile apps without push — return last alert JSON + `since` timestamp filter.

### 2.3 Environment variables

Add to `backend/.env` (do not commit secrets):

```env
# Option C — webhook to your mobile backend
MOBILE_WEBHOOK_URL=https://your-mobile-api.example.com/v1/alerts
MOBILE_WEBHOOK_SECRET=optional-shared-secret

# Option A/B — push providers (if used instead)
FCM_SERVER_KEY=
EXPO_ACCESS_TOKEN=
```

### 2.4 Frontend — call notification at dispatch

**File:** `SimulatorPanel.tsx` — in pipeline, **after** optimize succeeds, **before** `onAlert`:

```ts
appendLog('POST /api/notifications/dispatch-alert — notifying mobile app…');
const notifRes = await fetch('http://127.0.0.1:8000/api/notifications/dispatch-alert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    station_id: iotSensor.id,
    station_name: iotSensor.name,
    lat: iotSensor.lat,
    lon: iotSensor.lon,
    city,
    aqi: iotSensor.aqi,
    pm25: iotSensor.pm25,
    attribution_set: attribution?.prediction_set,
    confidence: attribution?.confidence,
    message: `AQI alert — enforcement dispatched to ${iotSensor.name}`,
  }),
});
const notif = await notifRes.json();
appendLog(
  notif.status === 'sent'
    ? `✓ Mobile notification delivered (${notif.notification_id})`
    : `⚠ Notification failed: ${notif.error || 'unknown'}`,
  notif.status === 'sent' ? 'success' : 'warn'
);
setStage('dispatched');
onAlert(iotSensor);
```

**Timing:** Notification fires when backend step completes — **exact dispatch moment**, not a fixed 32s timer.

### 2.5 Mobile app (out of repo — your other tab)

Depending on path:

**Webhook receiver (Option C):**
- Endpoint receives same JSON as above
- Triggers local notification via platform APIs (Android `NotificationManager`, iOS `UNUserNotificationCenter`)

**FCM (Option A):**
- App registers token → send token to backend (future: `POST /api/devices/register`)
- Backend sends FCM message at dispatch

**Polling (Option D):**
- Every 5s: `GET http://127.0.0.1:8000/api/notifications/latest`
- If `id` newer than last seen → show in-app alert / local notification

### 2.6 Testing checklist (Task 2)

- [ ] `POST /api/notifications/dispatch-alert` returns 200 from Swagger `/docs`
- [ ] Simulator log shows notification line immediately after optimize
- [ ] Mobile receives alert within ~1–2s of dispatch log line (webhook/FCM)
- [ ] Failed webhook does not break sim — warn in log, still shows dispatched
- [ ] CORS allows frontend origin (already `*` on backend)

---

## Suggested implementation order

| Phase | Work | Est. time |
|-------|------|-----------|
| **1** | Event log UI + refactor `startSimulation` to async pipeline with attribution only | 1–2 h |
| **2** | Wire `POST /api/optimize` + log route details | 30–60 min |
| **3** | Backend `notifications.py` + webhook stub (log to console if no URL) | 1 h |
| **4** | Wire notification call + mobile webhook/FCM | 1–2 h |
| **5** | Polish: error handling, reset, stage sync with log | 30 min |

---

## Files to create / modify (summary)

| Action | Path |
|--------|------|
| **Modify** | `frontend/src/components/SimulatorPanel.tsx` |
| **Modify** | `frontend/src/app/simulate/page.tsx` (optional: wire `onAlert` to toast) |
| **Create** | `backend/app/routers/notifications.py` |
| **Modify** | `backend/app/routers/__init__.py` |
| **Modify** | `backend/app/schemas.py` (notification request/response models) |
| **Optional** | `backend/app/models.py` + migration if persisting notifications |
| **Optional** | `backend/.env.example` with `MOBILE_WEBHOOK_URL` |
| **Mobile** | Your app — webhook handler or FCM listener (separate repo/tab) |

**Do not change:** `DeepDivePanel` intervention simulator (different feature — policy sliders, `/api/intervention/simulate`).

---

## API contract quick reference

### Existing — Attribution

- `POST /api/attribution`
- Body: `SensorReading` shape (`schemas.py` lines 5–21)
- Response: `AttributionOutput` — `prediction_set`, `set_size`, `confidence`, `probabilities`

### Existing — Optimize

- `POST /api/optimize`
- Body: `{ lat, lon, stations: [{ lat, lon, aqi, name }] }`
- Response: route object with `stops`, timing, ROI fields (see `OptimizerPanel` usage)

### New — Dispatch alert

- `POST /api/notifications/dispatch-alert`
- Body: see §2.2
- Response: `{ status, notification_id, channel, delivered_at }` or `{ status: "failed", error }`

---

## Demo script (for judges)

1. Open **Simulate** tab, select city with data (Delhi/Hyderabad/Bengaluru).
2. Click **Simulate Spot Event**.
3. Point at **live log** — attribution → routing → notification lines appear in sequence.
4. Show phone receiving push **at the same time** log says “Mobile notification delivered”.
5. Mention pipeline is real APIs (CatBoost attribution + OR-Tools), not pre-recorded video.

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Backend slow → log feels stuck | Log “waiting for API…” immediately; show spinner on active step |
| Mobile push fails on demo Wi‑Fi | Fallback: show `GET /api/notifications/latest` in mobile app; log webhook response in UI |
| `/simulate` has no map | Optional toast: “Alert dispatched to Anand Vihar” or link to Live Map |
| Attribution payload missing fields | Copy full payload from `DeepDivePanel.tsx` (includes `no2`, `so2`, `lat`, `lon`) |

---

## Out of scope (for this plan)

- WebSocket/SSE streaming (sequential fetch is enough for hackathon)
- User-configurable notification templates in UI
- Multi-user device token registry
- Changing Enforce tab `OptimizerPanel` Monitor button behavior

---

*Generated for handoff — implement in Agent mode or manually following phases 1–5.*
