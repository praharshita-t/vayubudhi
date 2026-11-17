from unittest.mock import MagicMock, patch

import pytest

from app.ingestion import cpcb_once


def scheduled_engine(owns_lock=True):
    engine = MagicMock()
    engine.dialect.name = "postgresql"
    connection = engine.connect.return_value.__enter__.return_value
    connection.scalar.return_value = owns_lock
    return engine, connection


def test_scheduled_ingestion_skips_when_another_worker_owns_lock(monkeypatch):
    monkeypatch.setenv("DATAGOV_API_KEY", "test-key")
    engine, _ = scheduled_engine(False)
    with patch.object(cpcb_once, "engine", engine), patch.object(cpcb_once, "run_cpcb_ingestion") as ingest:
        cpcb_once.main()
    ingest.assert_not_called()


def test_empty_feed_fails_job_and_releases_lock(monkeypatch):
    monkeypatch.setenv("DATAGOV_API_KEY", "test-key")
    engine, connection = scheduled_engine()
    with patch.object(cpcb_once, "engine", engine), patch.object(cpcb_once, "run_cpcb_ingestion", return_value={"records_fetched": 0, "errors": 0}):
        with pytest.raises(RuntimeError, match="returned no records"):
            cpcb_once.main()
    connection.execute.assert_called_once()


def test_scheduled_ingestion_accepts_existing_observations(monkeypatch):
    monkeypatch.setenv("DATAGOV_API_KEY", "test-key")
    engine, connection = scheduled_engine()
    with patch.object(cpcb_once, "engine", engine), patch.object(cpcb_once, "run_cpcb_ingestion", return_value={"records_fetched": 4025, "observations_saved": 0, "errors": 0}) as ingest:
        cpcb_once.main()
    ingest.assert_called_once_with(max_records=10000)
    connection.execute.assert_called_once()
