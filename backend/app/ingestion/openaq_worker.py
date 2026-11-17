"""
OpenAQ v3 Ingestion Worker for VayuBudhi.
Fetches Indian ambient air quality monitoring telemetry from OpenAQ v3 API
as a high-speed fallback and secondary sensor validation network.
"""
import os
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
import requests
from dotenv import load_dotenv

from app.database import SessionLocal, Base, engine
from app.models import Station, StationObservation
from app.aqi_standards import calc_india_naqi, calc_us_epa_aqi
from app.ingestion.cpcb_worker import slugify

load_dotenv()

logger = logging.getLogger("openaq_worker")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

OPENAQ_API_KEY = os.getenv("OPENAQ_API_KEY", "")
BASE_URL = "https://api.openaq.org/v3"
INDIA_COUNTRY_ID = 9  # Verified OpenAQ v3 country ID for India

def fetch_openaq_locations(limit: int = 50) -> List[Dict[str, Any]]:
    """Fetches list of active monitoring stations in India from OpenAQ v3."""
    if not OPENAQ_API_KEY:
        logger.warning("OPENAQ_API_KEY not found in environment.")
        return []

    url = f"{BASE_URL}/locations?countries_id={INDIA_COUNTRY_ID}&limit={limit}"
    headers = {
        "X-API-Key": OPENAQ_API_KEY,
        "User-Agent": "VayuBudhi/1.0 (Contact: admin@vayubudhi.local)",
    }

    try:
        resp = requests.get(url, headers=headers, timeout=15)
        if resp.status_code != 200:
            logger.error("OpenAQ returned HTTP %s", resp.status_code)
            return []
        data = resp.json()
        return data.get("results", [])
    except Exception as e:
        logger.error("OpenAQ location request failed (%s)", type(e).__name__)
        return []

def fetch_location_latest(location_id: int) -> List[Dict[str, Any]]:
    """Fetches latest sensor readings for a specific OpenAQ location."""
    url = f"{BASE_URL}/locations/{location_id}/latest"
    headers = {
        "X-API-Key": OPENAQ_API_KEY,
        "User-Agent": "VayuBudhi/1.0",
    }
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            return resp.json().get("results", [])
    except Exception:
        pass
    return []

CITY_CENTERS = {
    "Delhi": (28.6139, 77.2090), "Hyderabad": (17.385, 78.4867), "Bengaluru": (12.9716, 77.5946),
    "Mumbai": (19.076, 72.8777), "Chennai": (13.0827, 80.2707), "Kolkata": (22.5726, 88.3639),
    "Pune": (18.5204, 73.8567), "Ahmedabad": (23.0225, 72.5714), "Jaipur": (26.9124, 75.7873),
    "Lucknow": (26.8467, 80.9462), "Chandigarh": (30.7333, 76.7794), "Thiruvananthapuram": (8.5241, 76.9366),
    "Guwahati": (26.1445, 91.7362), "Kanpur": (26.4499, 80.3319), "Nagpur": (21.1458, 79.0882),
    "Indore": (22.7196, 75.8577), "Bhopal": (23.2599, 77.4126), "Patna": (25.5941, 85.1376),
}


def location_city(location):
    import math
    coords = location.get("coordinates") or {}
    lat, lon = coords.get("latitude"), coords.get("longitude")
    if lat is None or lon is None:
        return None
    distances = {city: math.hypot((lat - xy[0]) * 111, (lon - xy[1]) * 111 * math.cos(math.radians(lat)))
                 for city, xy in CITY_CENTERS.items()}
    city = min(distances, key=distances.get)
    return city if distances[city] <= 75 else None


def parse_utc(value):
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed.astimezone(timezone.utc)
    except (ValueError, TypeError, AttributeError):
        return None


def select_locations(locations, limit, now=None):
    now = now or datetime.now(timezone.utc)
    buckets = {city: [] for city in CITY_CENTERS}
    for location in locations:
        last = parse_utc((location.get("datetimeLast") or {}).get("utc"))
        city = location_city(location)
        if city and last and timedelta(0) <= now - last <= timedelta(hours=24):
            buckets[city].append(location)
    for values in buckets.values():
        values.sort(key=lambda loc: (bool(loc.get("isMonitor")), (loc.get("datetimeLast") or {}).get("utc", "")), reverse=True)
    selected = []
    while len(selected) < limit and any(buckets.values()):
        for values in buckets.values():
            if values and len(selected) < limit:
                selected.append(values.pop(0))
    return selected


def normalize_readings(location, readings, now=None):
    now = now or datetime.now(timezone.utc)
    sensors = {sensor["id"]: sensor.get("parameter", {}) for sensor in location.get("sensors", [])}
    valid = []
    for item in readings:
        parameter = sensors.get(item.get("sensorsId"), item.get("parameter") or {})
        name = parameter.get("name", "").lower()
        units = parameter.get("units", "").lower().replace("μ", "µ")
        timestamp = parse_utc((item.get("datetime") or {}).get("utc"))
        value = item.get("value")
        if name not in {"pm25", "pm10", "no2", "so2", "co", "o3"} or timestamp is None or value is None or value < 0:
            continue
        if not timedelta(0) <= now - timestamp <= timedelta(hours=24):
            continue
        value = float(value)
        if name == "co":
            if units in {"µg/m³", "ug/m3"}: value /= 1000
            elif units == "ppm": value *= 1.145
            elif units not in {"mg/m³", "mg/m3"}: continue
        elif units in {"mg/m³", "mg/m3"}:
            value *= 1000
        elif name in {"no2", "so2", "o3"} and units in {"ppb", "ppm"}:
            value *= {"no2": 1.88, "so2": 2.62, "o3": 2.0}[name] * (1000 if units == "ppm" else 1)
        elif units not in {"µg/m³", "ug/m3"}:
            continue
        valid.append((timestamp, name, value))
    if not valid:
        return {}, None
    latest = max(row[0] for row in valid)
    pollutants = {name: value for timestamp, name, value in sorted(valid) if latest - timestamp <= timedelta(hours=1)}
    return pollutants, latest.replace(tzinfo=None)


def run_openaq_ingestion(max_locations=36):
    db = SessionLocal()
    stats = {"locations_scanned": 0, "stations_synced": 0, "observations_saved": 0, "observations_seen": 0, "errors": 0}
    try:
        locations = select_locations(fetch_openaq_locations(limit=1000), max_locations)
        stats["locations_scanned"] = len(locations)
        for location in locations:
            readings = fetch_location_latest(location["id"])
            pollutants, observed_at = normalize_readings(location, readings)
            if not pollutants:
                continue
            stats["observations_seen"] += 1
            name = location.get("name") or f"OpenAQ {location['id']}"
            station_id = f"OPENAQ_{location['id']}_{slugify(name)[:30]}"
            station = db.query(Station).filter(Station.id == station_id).first()
            coords = location["coordinates"]
            if station is None:
                station = Station(id=station_id, name=name, city=location_city(location), state="India",
                                  latitude=coords["latitude"], longitude=coords["longitude"], agency="OpenAQ",
                                  source="openaq", is_active=True)
                db.add(station)
                db.flush()
                stats["stations_synced"] += 1
            else:
                station.city = location_city(location)
            observation = db.query(StationObservation).filter(StationObservation.station_id == station_id,
                                                             StationObservation.timestamp == observed_at).first()
            if observation is None:
                observation = StationObservation(station_id=station_id, timestamp=observed_at, source="openaq")
                db.add(observation)
                stats["observations_saved"] += 1
            values = {key: pollutants.get(key) for key in ("pm25", "pm10", "no2", "so2", "co", "o3")}
            for key, value in values.items():
                setattr(observation, key, value)
            observation.aqi_in, observation.primary_pollutant, _ = calc_india_naqi(**values)
            observation.aqi_us, _, _ = calc_us_epa_aqi(**values)
            observation.raw_payload = readings
        db.commit()
        logger.info("OpenAQ ingestion result: %s", stats)
    except Exception as error:
        db.rollback()
        stats["errors"] += 1
        logger.error("OpenAQ ingestion failed (%s)", type(error).__name__)
    finally:
        db.close()
    return stats


if __name__ == "__main__":
    print(json.dumps(run_openaq_ingestion()))
