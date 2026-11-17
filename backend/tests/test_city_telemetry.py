from unittest.mock import MagicMock, patch

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
