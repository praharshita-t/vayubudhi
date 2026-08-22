"""
Satellite NO₂ Overlay Router
Fetches live NO₂ concentration data from Open-Meteo CAMS Air Quality API,
generates a color-mapped RGBA heatmap PNG, and serves it to the frontend
for deck.gl BitmapLayer overlay on the live map.

Supports: Delhi, Hyderabad, Bengaluru (extensible via CITY_BOUNDS).
Caching: 1-hour disk cache per city to avoid hammering the external API.
"""

import io
import os
import time
import json
import hashlib
import logging
from pathlib import Path
from typing import Optional

import numpy as np
import requests
from PIL import Image
from fastapi import APIRouter, Query, Response
from fastapi.responses import Response as FastAPIResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["satellite"])

# ── City Bounding Boxes: [west_lon, south_lat, east_lon, north_lat] ──
CITY_BOUNDS: dict[str, list[float]] = {
    "Delhi":     [76.84, 28.40, 77.35, 28.88],
    "Hyderabad": [78.20, 17.20, 78.65, 17.60],
    "Bengaluru": [77.40, 12.80, 77.80, 13.15],
}

# Grid resolution: number of sample points along each axis
GRID_SIZE = 12

# Output image resolution (upscaled from GRID_SIZE × GRID_SIZE)
IMG_SIZE = 256

# Cache duration in seconds (1 hour)
CACHE_TTL = 3600

# Cache directory
CACHE_DIR = Path(__file__).resolve().parent.parent / "satellite_cache"
CACHE_DIR.mkdir(exist_ok=True)

# Open-Meteo CAMS Air Quality API endpoint
OPEN_METEO_AQ_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"


def _no2_to_rgba(no2_value: float) -> tuple[int, int, int, int]:
    """Map an NO₂ concentration (µg/m³) to an RGBA color.

    Uses a contrasting neon colormap (Deep Purple -> Magenta -> Neon Pink -> White)
    so that it doesn't blend in with the standard green/yellow/red AQI scale on the map.
    """
    if no2_value is None or no2_value <= 1:
        return (0, 0, 0, 0)

    # Normalize to 0-1 range (capped at 50 µg/m³ to make colors pop at typical concentrations)
    t = min(max(no2_value / 50.0, 0.0), 1.0)

    # Non-linear alpha to smoothly fade out lower values, preventing a hard rectangular block
    alpha = int((t ** 1.2) * 230)
    
    # Ensure a very slight minimum base alpha for visible areas
    alpha = max(alpha, 15) if no2_value > 1 else 0

    if t < 0.33:
        # Deep Purple to Magenta
        s = t / 0.33
        r, g, b = int(75 + s * 180), 0, int(130 + s * 125)
    elif t < 0.66:
        # Magenta to Neon Pink
        s = (t - 0.33) / 0.33
        r, g, b = 255, int(s * 105), int(255 - s * 75)
    else:
        # Neon Pink to White
        s = (t - 0.66) / 0.34
        r, g, b = 255, int(105 + s * 150), int(180 + s * 75)

    return (min(r, 255), min(g, 255), min(b, 255), min(alpha, 255))


def _fetch_no2_grid(city: str) -> Optional[np.ndarray]:
    """Fetch a GRID_SIZE × GRID_SIZE array of current NO₂ values (µg/m³)
    from the Open-Meteo CAMS Air Quality API for the given city."""

    bounds = CITY_BOUNDS.get(city)
    if not bounds:
        return None

    west, south, east, north = bounds

    # Create evenly spaced grid points
    lats = np.linspace(south, north, GRID_SIZE)
    lons = np.linspace(west, east, GRID_SIZE)

    # Build comma-separated coordinate lists for multi-point query
    lat_list = []
    lon_list = []
    for lat in lats:
        for lon in lons:
            lat_list.append(f"{lat:.4f}")
            lon_list.append(f"{lon:.4f}")

    try:
        resp = requests.get(
            OPEN_METEO_AQ_URL,
            params={
                "latitude": ",".join(lat_list),
                "longitude": ",".join(lon_list),
                "current": "nitrogen_dioxide",
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.error(f"Open-Meteo API error for {city}: {e}")
        return None

    # Parse response: list of dicts, each with .current.nitrogen_dioxide
    if not isinstance(data, list):
        data = [data]

    grid = np.zeros((GRID_SIZE, GRID_SIZE), dtype=np.float32)
    for idx, point in enumerate(data):
        row = idx // GRID_SIZE
        col = idx % GRID_SIZE
        try:
            val = point.get("current", {}).get("nitrogen_dioxide")
            grid[row, col] = val if val is not None else 0.0
        except (KeyError, TypeError):
            grid[row, col] = 0.0

    # Flip vertically: row 0 should be south (bottom of image)
    # but BitmapLayer expects image top = north
    grid = np.flipud(grid)

    return grid


def _grid_to_png(grid: np.ndarray) -> bytes:
    """Convert a GRID_SIZE × GRID_SIZE NO₂ grid into a 256×256 RGBA PNG."""

    # Create small RGBA image from the grid
    small_img = Image.new("RGBA", (GRID_SIZE, GRID_SIZE), (0, 0, 0, 0))
    pixels = small_img.load()
    for y in range(GRID_SIZE):
        for x in range(GRID_SIZE):
            pixels[x, y] = _no2_to_rgba(grid[y, x])

    # Upscale with bicubic interpolation for smoother hotspots
    large_img = small_img.resize((IMG_SIZE, IMG_SIZE), Image.BICUBIC)

    # Save to bytes
    buf = io.BytesIO()
    large_img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def _get_cache_path(city: str) -> Path:
    """Return the filesystem path for a cached satellite image."""
    return CACHE_DIR / f"no2_{city.lower()}.png"


def _get_cache_meta_path(city: str) -> Path:
    """Return the filesystem path for cache metadata."""
    return CACHE_DIR / f"no2_{city.lower()}.json"


def _is_cache_valid(city: str) -> bool:
    """Check if the cached image exists and is less than CACHE_TTL old."""
    meta_path = _get_cache_meta_path(city)
    if not meta_path.exists():
        return False
    try:
        with open(meta_path, "r") as f:
            meta = json.load(f)
        return (time.time() - meta.get("timestamp", 0)) < CACHE_TTL
    except Exception:
        return False


def _write_cache(city: str, png_bytes: bytes, bounds: list[float]):
    """Write the generated PNG and metadata to disk cache."""
    cache_path = _get_cache_path(city)
    meta_path = _get_cache_meta_path(city)
    with open(cache_path, "wb") as f:
        f.write(png_bytes)
    with open(meta_path, "w") as f:
        json.dump({"timestamp": time.time(), "bounds": bounds}, f)


def _read_cache(city: str) -> Optional[bytes]:
    """Read cached PNG bytes from disk."""
    cache_path = _get_cache_path(city)
    if cache_path.exists():
        with open(cache_path, "rb") as f:
            return f.read()
    return None


@router.get("/satellite/no2")
async def get_no2_overlay(city: str = Query("Delhi", description="City name: Delhi, Hyderabad, or Bengaluru")):
    """Return a live NO₂ heatmap PNG overlay for the specified city.

    The image is a 256×256 RGBA PNG generated from the Open-Meteo CAMS
    Air Quality API. It is cached for 1 hour on disk.

    Response headers include:
    - X-Bounds: JSON array [west, south, east, north] for deck.gl BitmapLayer
    - X-Cache: HIT or MISS
    """
    bounds = CITY_BOUNDS.get(city)
    if not bounds:
        return Response(
            content=json.dumps({"error": f"Unknown city: {city}. Supported: {list(CITY_BOUNDS.keys())}"}),
            status_code=400,
            media_type="application/json",
        )

    # Check cache first
    if _is_cache_valid(city):
        png_bytes = _read_cache(city)
        if png_bytes:
            return Response(
                content=png_bytes,
                media_type="image/png",
                headers={
                    "X-Bounds": json.dumps(bounds),
                    "X-Cache": "HIT",
                    "Cache-Control": f"public, max-age={CACHE_TTL}",
                },
            )

    # Fetch fresh data from Open-Meteo
    grid = _fetch_no2_grid(city)
    if grid is None:
        # If API fails, try serving stale cache
        png_bytes = _read_cache(city)
        if png_bytes:
            return Response(
                content=png_bytes,
                media_type="image/png",
                headers={
                    "X-Bounds": json.dumps(bounds),
                    "X-Cache": "STALE",
                    "Cache-Control": "public, max-age=300",
                },
            )
        return Response(
            content=json.dumps({"error": "Failed to fetch NO₂ data and no cache available."}),
            status_code=502,
            media_type="application/json",
        )

    # Generate PNG
    png_bytes = _grid_to_png(grid)

    # Write to cache
    _write_cache(city, png_bytes, bounds)

    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={
            "X-Bounds": json.dumps(bounds),
            "X-Cache": "MISS",
            "Cache-Control": f"public, max-age={CACHE_TTL}",
        },
    )
