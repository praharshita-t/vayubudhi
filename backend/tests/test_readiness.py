"""Release gates against a disposable migrated database, never a production DB."""
import uuid
from unittest.mock import patch
import numpy as np
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import User
from app.ml_service import ml_service
from app.schemas import SensorReading

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as instance:
        yield instance

def test_health_requires_database(client):
    response = client.get("/api/health")
    assert response.status_code == 200, response.text
    assert response.json()["models_ready"] is True
    assert "redis_url" not in response.json()["cache"]
    assert "x-compliance" not in response.headers

def test_database_failure_is_not_healthy(client):
    from app.database import get_db
    class BrokenSession:
        def execute(self, *_):
            raise RuntimeError("database unavailable")
    app.dependency_overrides[get_db] = lambda: BrokenSession()
    try:
        response = client.get("/api/health")
        assert response.status_code == 503
        assert response.json()["database"] == "disconnected"
    finally:
        app.dependency_overrides.clear()

def test_no_staff_demo_accounts_created(client):
    with SessionLocal() as db:
        assert db.query(User).filter(User.email == "admin@vayubudhi.gov.in").first() is None

def test_public_registration_cannot_choose_role(client):
    payload = {"email": "attacker@example.com", "password": "test-password-12345", "full_name": "Test User", "role": "super_admin"}
    assert client.post("/api/auth/register", json=payload).status_code == 422

def test_register_login_profile(client):
    email = f"release-{uuid.uuid4().hex}@example.com"
    payload = {"email": email, "password": "test-password-12345", "full_name": "Release Test"}
    try:
        response = client.post("/api/auth/register", json=payload)
        assert response.status_code == 201, response.text
        assert response.json()["role"] == "public_viewer"
        response = client.post("/api/auth/login", json=payload)
        assert response.status_code == 200, response.text
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        assert client.get("/api/auth/me", headers=headers).json()["email"] == email
        assert client.post("/api/ingestion/trigger", headers=headers).status_code == 403
    finally:
        with SessionLocal() as db:
            db.query(User).filter(User.email == email).delete()
            db.commit()

@pytest.mark.parametrize("path", ["/api/sync", "/api/ingestion/trigger", "/api/notifications/dispatch-alert", "/api/optimize"])
def test_privileged_operations_require_auth(client, path):
    assert client.post(path, json={}).status_code in (401, 403)

def test_sensor_key_enforced(client, monkeypatch):
    monkeypatch.setenv("SENSOR_API_KEY", "test-sensor-key")
    assert client.post("/api/ingest", json={}).status_code == 401
    response = client.post("/api/ingest", json={"station_id": "release-test"}, headers={"X-API-Key": "test-sensor-key"})
    assert response.status_code == 200, response.text

def test_packaged_models_can_predict_without_fallback():
    frame = ml_service._prepare_features(SensorReading())
    for horizon in (24, 48, 72):
        model = ml_service.forecasters[f"{horizon}h"]
        points, intervals = model.predict_interval(frame)
        assert np.isfinite(points).all()
        assert np.isfinite(intervals).all()
    assert ml_service.classifier is not None
    assert np.isfinite(ml_service.classifier._estimator.predict_proba(frame)).all()
    assert ml_service.dataset_cache is not None

def test_production_forecast_does_not_silently_fall_back(client, monkeypatch):
    monkeypatch.setattr(ml_service, "forecasters", {})
    response = client.post("/api/forecast", json={"pm25": 42})
    assert response.status_code == 503

def test_worker_does_not_start_in_api_process(client):
    from app.ingestion import scheduler
    assert scheduler.SCHEDULER_THREAD is None

def test_ingestion_lock_prevents_duplicate_processes():
    from app.database import engine
    from app.ingestion.scheduler import execute_ingestion_cycle
    from sqlalchemy import text
    if engine.dialect.name != "postgresql":
        pytest.skip("Cross-process locking is a PostgreSQL release gate")
    with engine.connect() as connection:
        connection.execute(text("SELECT pg_advisory_lock(8675309)"))
        try:
            assert execute_ingestion_cycle()["status"] == "skipped"
        finally:
            connection.execute(text("SELECT pg_advisory_unlock(8675309)"))

def test_worker_lifecycle_and_heartbeat(monkeypatch):
    import threading
    import signal
    from types import SimpleNamespace
    from app.ingestion import worker
    stop = threading.Event()
    heartbeats = []
    monkeypatch.setenv("OPENAQ_API_KEY", "test-only-no-network")
    monkeypatch.setattr(worker, "threading", SimpleNamespace(Event=lambda: stop))
    monkeypatch.setattr(worker, "signal", SimpleNamespace(SIGTERM=signal.SIGTERM, SIGINT=signal.SIGINT, signal=lambda *_: None))
    monkeypatch.setattr(worker, "execute_ingestion_cycle", stop.set)
    monkeypatch.setattr(worker, "set_cache", lambda key, value, **_: heartbeats.append(value["state"]))
    worker.main()
    assert heartbeats == ["running", "waiting"]

def test_forecast_and_advisory_contracts(client):
    response = client.post("/api/forecast", json={"pm25": 42, "lat": 17.4, "lon": 78.4})
    assert response.status_code == 200, response.text
    assert len(response.json()["points"]) == 3
    with patch.dict("os.environ", {"GEMINI_API_KEY": ""}):
        response = client.post("/api/advisory", json={"city": "Hyderabad", "district_aqi": 100})
    assert response.status_code == 200, response.text
    assert response.json()["advisory"]

def test_optimizer_contract(client):
    from app.auth import get_current_user
    app.dependency_overrides[get_current_user] = lambda: User(id=999, role="city_officer")
    try:
        response = client.post("/api/optimize", json={"lat": 17.4, "lon": 78.4,
            "stations": [{"lat": 17.41, "lon": 78.42, "aqi": 240, "name": "Test Station"}]})
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.clear()
