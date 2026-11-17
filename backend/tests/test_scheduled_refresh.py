from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.ingestion import scheduler


def test_scheduled_refresh_requires_dedicated_secret(monkeypatch):
    app = FastAPI()
    app.include_router(scheduler.router)
    client = TestClient(app)
    monkeypatch.delenv("INGESTION_TRIGGER_SECRET", raising=False)
    assert client.post("/api/ingestion/scheduled-refresh").status_code == 503
    monkeypatch.setenv("INGESTION_TRIGGER_SECRET", "x" * 48)
    assert client.post("/api/ingestion/scheduled-refresh").status_code == 401
    assert client.post("/api/ingestion/scheduled-refresh", headers={"X-Ingestion-Key": "wrong"}).status_code == 401


def test_scheduled_refresh_tracks_success_and_provider_failure(monkeypatch):
    app = FastAPI()
    app.include_router(scheduler.router)
    client = TestClient(app)
    monkeypatch.setenv("INGESTION_TRIGGER_SECRET", "x" * 48)
    cache = {}
    monkeypatch.setattr(scheduler, "set_cache", lambda key, value, **_: cache.__setitem__(key, value))
    monkeypatch.setattr(scheduler, "get_cache", cache.get)
    headers = {"X-Ingestion-Key": "x" * 48}
    for count, expected in [(25, "succeeded"), (0, "failed")]:
        with patch.object(scheduler, "execute_ingestion_cycle", return_value={"cpcb": {"records_fetched": count, "errors": 0}}):
            response = client.post("/api/ingestion/scheduled-refresh", headers=headers)
        assert response.status_code == 202
        run_id = response.json()["run_id"]
        assert client.get(f"/api/ingestion/scheduled-refresh/{run_id}", headers=headers).json()["status"] == expected
        assert client.get(f"/api/ingestion/scheduled-refresh/{run_id}").status_code == 401
