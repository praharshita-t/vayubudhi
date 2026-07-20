from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import sys
import os

# Add the 'app' directory to python path so 'optimization' imports can be resolved
app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if app_dir not in sys.path:
    sys.path.append(app_dir)

from app.database import get_db
from app import models
from app import schemas
from optimization.solver import RouteSolver
from optimization.router import get_dispatch_details
from optimization.roi import calculate_inspection_roi

router = APIRouter()

# Synthetic source data representing emission hotspots in Delhi
SYNTHETIC_SOURCES = [
    {
        "source_id": "S01",
        "latitude": 28.6469,
        "longitude": 77.3164,
        "severity": 350.0,
        "confidence": 0.92,
        "set_size": 1,
        "population_exposed": 185000.0
    },
    {
        "source_id": "S03",
        "latitude": 28.6289,
        "longitude": 77.2406,
        "severity": 248.0,
        "confidence": 0.90,
        "set_size": 1,
        "population_exposed": 210000.0
    },
    {
        "source_id": "S04",
        "latitude": 28.5635,
        "longitude": 77.1724,
        "severity": 260.0,
        "confidence": 0.58,
        "set_size": 3,
        "population_exposed": 78000.0
    },
    {
        "source_id": "S07",
        "latitude": 28.6724,
        "longitude": 77.3151,
        "severity": 275.0,
        "confidence": 0.88,
        "set_size": 1,
        "population_exposed": 120000.0
    },
    {
        "source_id": "S09",
        "latitude": 28.7762,
        "longitude": 77.0511,
        "severity": 245.0,
        "confidence": 0.62,
        "set_size": 2,
        "population_exposed": 65000.0
    },
    {
        "source_id": "S12",
        "latitude": 28.6843,
        "longitude": 77.0319,
        "severity": 225.0,
        "confidence": 0.85,
        "set_size": 1,
        "population_exposed": 95000.0
    },
    {
        "source_id": "S15",
        "latitude": 28.5308,
        "longitude": 77.2713,
        "severity": 150.0,
        "confidence": 0.50,
        "set_size": 2,
        "population_exposed": 50000.0
    }
]

@router.get("/optimize", response_model=schemas.RoutePlan)
def get_optimization(lat: float = 28.6139, lon: float = 77.2090, db: Session = Depends(get_db)):
    """
    Solves the vehicle routing problem for ground inspectors, vans, and drones using Google OR-Tools.
    Shift locations dynamically to center around the requested coordinates (lat, lon).
    Logs all routes and their cost-benefit ROI profiles to SQLite.
    Returns the primary inspector routing plan to stay compatible with Contract 4.
    """
    # 1. Establish the central depot coordinates
    depot = {
        "source_id": "depot",
        "latitude": lat,
        "longitude": lon,
        "severity": 0,
        "confidence": 0,
        "set_size": 0,
        "population_exposed": 0
    }
    
    # 2. Adjust synthetic sources relative to the depot coordinates
    delta_lat = lat - 28.6289
    delta_lon = lon - 77.2406
    
    adjusted_sources = []
    for src in SYNTHETIC_SOURCES:
        adjusted_sources.append({
            **src,
            "latitude": src["latitude"] + delta_lat,
            "longitude": src["longitude"] + delta_lon
        })
    
    # 3. Filter out MONITOR-only sources (severity < 200) from active routing
    dispatchable_sources = [src for src in adjusted_sources if src["severity"] >= 200]
    locations = [depot] + dispatchable_sources

    # 4. Instantiate and run Google OR-Tools CVRPTW solver
    solver = RouteSolver(locations, depot_index=0)
    routes = solver.solve_vrp()

    # 5. Save/update all generated routes and calculate their ROI metrics in database
    for r_id, route_data in routes.items():
        # Update or create EnforcementRoute log
        db_route = db.query(models.EnforcementRoute).filter_by(route_id=r_id).first()
        if db_route:
            db_route.stops = route_data["stops"]
        else:
            db_route = models.EnforcementRoute(
                route_id=r_id,
                stops=route_data["stops"]
            )
            db.add(db_route)
        db.commit()

        # Compute route-level aggregate metrics for ROIResult
        total_reduction = 0.0
        total_cost = 0.0
        stop_rois = []
        
        # We look up matching adjusted source records to retrieve severity, cost, and pop
        for stop in route_data["stops"]:
            src = next((s for s in adjusted_sources if s["source_id"] == stop["source_id"]), None)
            if src:
                severity = src["severity"]
                reduction = severity * 0.05
                total_reduction += reduction
                
                # Retrieve the specific vehicle cost
                v_type = route_data["vehicle_type"]
                if v_type == "inspector":
                    cost = 10000.0 + (severity - 200.0) * 36.0
                elif v_type == "van":
                    cost = 9000.0 + (severity - 200.0) * 40.0
                else:
                    cost = 5000.0 + (severity - 200.0) * 50.0
                
                total_cost += cost
                stop_rois.append(stop["roi"])
                
        route_roi = round(sum(stop_rois), 1) if stop_rois else 0.0
        
        # Update or create ROIResult log
        db_roi = db.query(models.ROIResult).filter_by(route_id=r_id).first()
        if db_roi:
            db_roi.exposure_reduction = total_reduction
            db_roi.compliance_cost = total_cost
            db_roi.roi = route_roi
        else:
            db_roi = models.ROIResult(
                route_id=r_id,
                exposure_reduction=total_reduction,
                compliance_cost=total_cost,
                roi=route_roi
            )
            db.add(db_roi)
        db.commit()

    # 6. Return the primary inspector route plan (inspector_1) for Contract 4 compatibility
    inspector_route = routes.get("inspector_1")
    return {
        "route_id": inspector_route["route_id"],
        "stops": inspector_route["stops"]
    }
