from datetime import datetime, timezone
from app.ingestion.openaq_worker import normalize_readings, select_locations, location_city


NOW = datetime(2026, 11, 17, 14, tzinfo=timezone.utc)


def location(lat=28.6, lon=77.2, timestamp="2026-11-17T13:00:00Z"):
    return {"id": 1, "coordinates": {"latitude": lat, "longitude": lon},
            "datetimeLast": {"utc": timestamp}, "sensors": [
                {"id": 10, "parameter": {"name": "pm25", "units": "µg/m³"}},
                {"id": 11, "parameter": {"name": "co", "units": "µg/m³"}},
            ]}


def test_v3_sensor_ids_preserve_zero_and_normalize_co():
    values, observed_at = normalize_readings(location(), [
        {"sensorsId": 10, "value": 0, "datetime": {"utc": "2026-11-17T13:00:00Z"}},
        {"sensorsId": 11, "value": 900, "datetime": {"utc": "2026-11-17T13:00:00Z"}},
    ], now=NOW)
    assert values == {"pm25": 0.0, "co": 0.9}
    assert observed_at == datetime(2026, 11, 17, 13)


def test_historical_or_unknown_sensor_readings_are_not_live():
    values, observed_at = normalize_readings(location(), [
        {"sensorsId": 10, "value": 35, "datetime": {"utc": "2018-02-22T04:00:00Z"}},
        {"sensorsId": 99, "value": 35, "datetime": {"utc": "2026-11-17T13:00:00Z"}},
    ], now=NOW)
    assert values == {}
    assert observed_at is None


def test_locations_cover_cities_before_adding_more_in_one_city():
    delhi = location()
    hyderabad = location(17.385, 78.4867)
    bengaluru = location(12.9716, 77.5946)
    old = location(timestamp="2018-02-22T04:00:00Z")
    chosen = select_locations([delhi, delhi.copy(), hyderabad, bengaluru, old], 3, now=NOW)
    assert [location_city(row) for row in chosen] == ["Delhi", "Hyderabad", "Bengaluru"]
