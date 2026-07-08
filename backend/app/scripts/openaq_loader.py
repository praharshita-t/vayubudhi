"""
Data loading and seeding scripts.
Pulls historical data from OpenAQ API to populate SQLite baseline database.
"""
import requests
from typing import Dict, Any, List

def fetch_openaq_data(city: str, limit: int = 100) -> List[Dict[str, Any]]:
    """
    Calls OpenAQ public API to retrieve atmospheric reading telemetry.
    """
    pass

def seed_database() -> None:
    """
    Loads fetched OpenAQ data into local SQLite tables.
    """
    pass
