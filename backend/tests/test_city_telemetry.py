from unittest.mock import MagicMock, patch
from datetime import datetime
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.routers import live


def test_empty_city_returns_unavailable_instead_of_sample_readings():
    session = MagicMock()
    session.query.return_value.filter.return_value.all.return_value = []
    with patch.object(live, "SessionLocal", return_value=session), patch.object(live, "CITY_DATA_CACHE", {}), patch.object(live, "_get_with_retry") as weather:
        with pytest.raises(HTTPException) as error:
            live.get_city_data("Delhi")
    assert error.value.status_code == 503
    assert "No station observations" in error.value.detail
    weather.assert_not_called()
    session.close.assert_called_once()


def test_city_preserves_zero_missing_values_and_provider_timestamp():
    station = SimpleNamespace(id="CPCB_ZERO", name="Test station", city="Delhi", latitude=28.6, longitude=77.2, agency="CPCB")
    observation = SimpleNamespace(pm25=0, pm10=None, no2=None, so2=None, co=None, o3=None,
                                  aqi_in=0, aqi_us=0, primary_pollutant="PM2.5", source="cpcb_caaqms",
                                  timestamp=datetime(2026, 11, 17, 18, 0))
    session = MagicMock()
    station_query, observation_query = MagicMock(), MagicMock()
    station_query.filter.return_value.all.return_value = [station]
    observation_query.filter.return_value.order_by.return_value.first.return_value = observation
    session.query.side_effect = lambda model: station_query if model is live.DBStation else observation_query
    with patch.object(live, "SessionLocal", return_value=session), patch.object(live, "CITY_DATA_CACHE", {}), patch.object(live, "_get_with_retry", side_effect=RuntimeError("Weather unavailable")), patch.object(live, "get_traffic_multipliers_bulk", return_value={}):
        result = live.get_city_data("Delhi")
    assert result.stations[0].pm25 == 0
    assert result.stations[0].aqi_in == 0
    assert result.stations[0].pm10 is None
    assert result.stations[0].temp is None
    assert result.latest_observation_time == "2026-11-17T18:00:00+05:30"
