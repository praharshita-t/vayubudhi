"""Lightweight scheduled ingestion; no API, model, JWT or Redis dependency."""
import json
import os

from sqlalchemy import text

from app.database import engine
from app.ingestion.cpcb_worker import run_cpcb_ingestion


def main():
    if not os.getenv("DATAGOV_API_KEY"):
        raise RuntimeError("DATAGOV_API_KEY is required")
    if engine.dialect.name != "postgresql":
        raise RuntimeError("Scheduled ingestion requires the migrated PostgreSQL database")
    with engine.connect() as connection:
        if not connection.scalar(text("SELECT pg_try_advisory_lock(8675309)")):
            print(json.dumps({"status": "skipped", "reason": "Another ingestion is running"}))
            return
        try:
            result = run_cpcb_ingestion(max_records=10000)
            print(json.dumps(result))
            if result["errors"] or not result["records_fetched"]:
                raise RuntimeError("CPCB ingestion failed or returned no records")
        finally:
            connection.execute(text("SELECT pg_advisory_unlock(8675309)"))


if __name__ == "__main__":
    main()
