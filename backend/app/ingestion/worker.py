"""One ingestion process per deployment; SIGTERM stops the wait promptly."""
import os
import signal
import threading
from app.ingestion.scheduler import execute_ingestion_cycle
from app.config import PRODUCTION
from app.redis_client import set_cache
from datetime import datetime, timezone

def main():
    if PRODUCTION and not (os.getenv("DATAGOV_API_KEY") or os.getenv("OPENAQ_API_KEY")):
        raise RuntimeError("Ingestion requires DATAGOV_API_KEY or OPENAQ_API_KEY")
    stop = threading.Event()
    signal.signal(signal.SIGTERM, lambda *_: stop.set())
    signal.signal(signal.SIGINT, lambda *_: stop.set())
    interval = max(60, int(os.getenv("INGESTION_INTERVAL_SECONDS", "900")))
    while not stop.is_set():
        set_cache("ingestion:heartbeat", {"time": datetime.now(timezone.utc).isoformat(), "state": "running"}, ttl_seconds=interval * 3)
        execute_ingestion_cycle()
        set_cache("ingestion:heartbeat", {"time": datetime.now(timezone.utc).isoformat(), "state": "waiting"}, ttl_seconds=interval * 3)
        stop.wait(interval)

if __name__ == "__main__":
    main()
