from unittest.mock import MagicMock, patch

import pytest
import requests

from app.ingestion import cpcb_worker


def test_provider_exception_never_exposes_key(monkeypatch):
    monkeypatch.setattr(cpcb_worker, "DATA_GOV_API_KEY", "private-test-provider-key")
    session = MagicMock()
    session.get.side_effect = requests.ConnectionError("Failed URL ?api-key=private-test-provider-key")
    with patch.object(cpcb_worker.requests, "Session") as factory:
        factory.return_value.__enter__.return_value = session
        with pytest.raises(RuntimeError) as error:
            cpcb_worker.fetch_cpcb_records()
    assert "private-test-provider-key" not in str(error.value)
    assert "[REDACTED]" in str(error.value)


def test_failed_page_is_not_mistaken_for_end_of_feed(monkeypatch):
    monkeypatch.setattr(cpcb_worker, "DATA_GOV_API_KEY", "test-key")
    session = MagicMock()
    session.get.return_value.status_code = 503
    with patch.object(cpcb_worker.requests, "Session") as factory:
        factory.return_value.__enter__.return_value = session
        with pytest.raises(RuntimeError, match="HTTP 503"):
            cpcb_worker.fetch_cpcb_records(offset=1000)
