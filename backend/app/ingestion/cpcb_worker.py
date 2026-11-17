"""
CPCB CAAQMS Ingestion Worker for VayuBudhi.
Fetches official Central Pollution Control Board telemetry from data.gov.in
and stores parsed time-series observations in the persistent database.
"""
import os
import re
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
import requests
from dotenv import load_dotenv

from app.database import SessionLocal, Base, engine
from app.models import Station, StationObservation
from app.aqi_standards import calc_india_naqi, calc_us_epa_aqi

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("cpcb_worker")

DATA_GOV_API_KEY = os.getenv("DATAGOV_API_KEY", "")
RESOURCE_ID = os.getenv("CPCB_RESOURCE_ID", "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69")
BASE_URL = f"https://api.data.gov.in/resource/{RESOURCE_ID}"

def slugify(text: str) -> str:
    """Generate clean uppercase identifier slug."""
    clean = re.sub(r"[^A-Za-z0-9]+", "_", text).strip("_").upper()
    return clean[:80]

def parse_cpcb_timestamp(ts_str: str) -> datetime:
    """Parses timestamps formatted like '10-09-2026 18:00:00' or ISO."""
    if not ts_str:
        return datetime.utcnow()
    formats = [
        "%d-%m-%Y %H:%M:%S",
        "%d/%m/%Y %H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(ts_str.strip(), fmt)
        except ValueError:
            continue
    return datetime.utcnow()

def fetch_cpcb_records(limit: int = 1000, offset: int = 0, city: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetches a page of records from data.gov.in."""
    if not DATA_GOV_API_KEY:
        logger.error("DATAGOV_API_KEY is not set in environment or .env")
        return []

    params = {
        "api-key": DATA_GOV_API_KEY,
        "format": "json",
        "limit": limit,
        "offset": offset,
    }
    if city:
        params["filters[city]"] = city

    try:
        resp = requests.get(BASE_URL, params=params, timeout=20, headers={"User-Agent": "VayuBudhi/1.0"})
        if resp.status_code != 200:
            logger.error("data.gov.in returned HTTP %s", resp.status_code)
            return []
        data = resp.json()
        return data.get("records", [])
    except Exception as e:
        # Request exceptions can include the URL, whose query contains the key.
        logger.error("Failed to fetch data.gov.in records (%s)", type(e).__name__)
        return []

def run_cpcb_ingestion(cities: Optional[List[str]] = None, max_records: int = 4000) -> Dict[str, Any]:
    """
    Main ingestion execution function.
    Queries CPCB records, aggregates multi-pollutant measurements per station,
    calculates dual-standard AQIs, and persists to database.
    """
    # Schema changes belong to Alembic, including when run by a scheduled job.
    db = SessionLocal()

    stats = {
        "records_fetched": 0,
        "stations_synced": 0,
        "observations_saved": 0,
        "errors": 0,
    }

    try:
        all_records: List[Dict[str, Any]] = []

        if cities:
            for city in cities:
                records = fetch_cpcb_records(limit=1000, offset=0, city=city)
                all_records.extend(records)
        else:
            # Nationwide crawl in chunks of 1000
            offset = 0
            while offset < max_records:
                page = fetch_cpcb_records(limit=1000, offset=offset)
                if not page:
                    break
                all_records.extend(page)
                if len(page) < 1000:
                    break
                offset += 1000

        stats["records_fetched"] = len(all_records)
        logger.info(f"Fetched {len(all_records)} raw pollutant records from CPCB CAAQMS feed.")

        # Group rows by (station_slug, timestamp)
        # One station row has PM2.5, another has PM10, etc.
        station_groups: Dict[str, Dict[str, Any]] = {}

        for r in all_records:
            station_name = r.get("station") or "Unknown Station"
            city_name = r.get("city") or "Unknown City"
            state_name = r.get("state") or "Unknown State"
            lat_str = r.get("latitude")
            lon_str = r.get("longitude")
            pollutant = (r.get("pollutant_id") or "").strip().upper()
            val_str = r.get("avg_value") or r.get("max_value") or r.get("min_value")
            ts_str = r.get("last_update") or ""

            try:
                lat = float(lat_str) if lat_str else 0.0
                lon = float(lon_str) if lon_str else 0.0
            except ValueError:
                lat, lon = 0.0, 0.0

            try:
                val = float(val_str) if (val_str and val_str != "NA") else None
            except ValueError:
                val = None

            station_id = f"CPCB_{slugify(city_name)}_{slugify(station_name)}"
            dt = parse_cpcb_timestamp(ts_str)
            group_key = f"{station_id}_{dt.strftime('%Y%m%d%H')}"

            if group_key not in station_groups:
                station_groups[group_key] = {
                    "station_id": station_id,
                    "station_name": station_name,
                    "city": city_name,
                    "state": state_name,
                    "lat": lat,
                    "lon": lon,
                    "timestamp": dt,
                    "pollutants": {},
                    "raw_records": [],
                }

            if pollutant and val is not None:
                station_groups[group_key]["pollutants"][pollutant] = val
            station_groups[group_key]["raw_records"].append(r)

        # Upsert into database
        for group_key, grp in station_groups.items():
            station_id = grp["station_id"]
            station = db.query(Station).filter(Station.id == station_id).first()

            agency = "CPCB"
            if "TSPCB" in grp["station_name"]:
                agency = "TSPCB"
            elif "DPCC" in grp["station_name"]:
                agency = "DPCC"
            elif "MPCB" in grp["station_name"]:
                agency = "MPCB"
            elif "KSPCB" in grp["station_name"]:
                agency = "KSPCB"

            if not station:
                station = Station(
                    id=station_id,
                    name=grp["station_name"],
                    city=grp["city"],
                    state=grp["state"],
                    latitude=grp["lat"],
                    longitude=grp["lon"],
                    agency=agency,
                    source="cpcb_caaqms",
                    is_active=True,
                )
                db.add(station)
                db.flush()
                stats["stations_synced"] += 1
            else:
                # Update coords if previously zero
                if station.latitude == 0.0 and grp["lat"] != 0.0:
                    station.latitude = grp["lat"]
                    station.longitude = grp["lon"]
                    station.updated_at = datetime.utcnow()

            # Pollutants mapping
            pol = grp["pollutants"]
            pm25 = pol.get("PM2.5") or pol.get("PM2_5")
            pm10 = pol.get("PM10")
            no2 = pol.get("NO2")
            so2 = pol.get("SO2")
            co = pol.get("CO")
            o3 = pol.get("OZONE") or pol.get("O3")
            nh3 = pol.get("NH3")

            # Calculate Dual AQIs
            aqi_in, primary_pol, _ = calc_india_naqi(
                pm25=pm25, pm10=pm10, no2=no2, so2=so2, co=co, o3=o3, nh3=nh3
            )
            aqi_us, _, _ = calc_us_epa_aqi(
                pm25=pm25, pm10=pm10, no2=no2, so2=so2, co=co, o3=o3
            )

            # Check if observation exists for this (station_id, timestamp)
            obs = (
                db.query(StationObservation)
                .filter(
                    StationObservation.station_id == station_id,
                    StationObservation.timestamp == grp["timestamp"],
                )
                .first()
            )

            if not obs:
                obs = StationObservation(
                    station_id=station_id,
                    timestamp=grp["timestamp"],
                    pm25=pm25,
                    pm10=pm10,
                    no2=no2,
                    so2=so2,
                    co=co,
                    o3=o3,
                    nh3=nh3,
                    aqi_in=aqi_in,
                    aqi_us=aqi_us,
                    primary_pollutant=primary_pol,
                    source="cpcb_caaqms",
                    raw_payload=grp["raw_records"],
                )
                db.add(obs)
                stats["observations_saved"] += 1
            else:
                # Update missing fields if new values arrived
                if pm25 is not None and obs.pm25 is None: obs.pm25 = pm25
                if pm10 is not None and obs.pm10 is None: obs.pm10 = pm10
                if no2 is not None and obs.no2 is None: obs.no2 = no2
                if so2 is not None and obs.so2 is None: obs.so2 = so2
                if co is not None and obs.co is None: obs.co = co
                if o3 is not None and obs.o3 is None: obs.o3 = o3
                if nh3 is not None and obs.nh3 is None: obs.nh3 = nh3
                if aqi_in is not None: obs.aqi_in = aqi_in
                if aqi_us is not None: obs.aqi_us = aqi_us
                if primary_pol is not None: obs.primary_pollutant = primary_pol

        db.commit()
        logger.info(
            f"CPCB Ingestion successfully completed: {stats['stations_synced']} new stations, "
            f"{stats['observations_saved']} new observations saved."
        )
    except Exception as e:
        db.rollback()
        stats["errors"] += 1
        logger.error(f"CPCB ingestion error: {e}", exc_info=True)
    finally:
        db.close()

    return stats

if __name__ == "__main__":
    import sys
    city_filter = [sys.argv[1]] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else None
    print(f"Starting CPCB CAAQMS ingestion worker (city filter: {city_filter})...")
    results = run_cpcb_ingestion(cities=city_filter)
    print("Ingestion results:", json.dumps(results, indent=2))
