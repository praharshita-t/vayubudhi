from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import schemas

router = APIRouter()

import random
import uuid
from datetime import datetime, timedelta

@router.get("/optimize", response_model=schemas.RoutePlan)
def get_optimization(lat: float = 28.6139, lon: float = 77.2090, db: Session = Depends(get_db)):
    """
    Returns dynamically generated optimized routing plan for inspectors.
    Outputs Contract 4 JSON shape. Logs route and ROI details to SQLite.
    """
    route_id = f"inspector_{random.randint(1, 100)}"
    
    # Generate 3 dynamic stops around the given center (simulate hotspots)
    stops = []
    base_time = datetime.strptime("09:00", "%H:%M")
    
    actions = ["FULL_INSPECTION", "EMISSION_CHECK", "SITE_CLOSURE"]
    
    for i in range(3):
        stop_lat = lat + random.uniform(-0.05, 0.05)
        stop_lon = lon + random.uniform(-0.05, 0.05)
        eta_time = base_time + timedelta(minutes=random.randint(30, 90))
        base_time = eta_time
        
        stops.append({
            "source_id": f"s_{uuid.uuid4().hex[:4]}",
            "lat": round(stop_lat, 4),
            "lon": round(stop_lon, 4),
            "eta": eta_time.strftime("%H:%M"),
            "action": random.choice(actions),
            "roi": round(random.uniform(20.0, 100.0), 1)
        })
    
    # Check if this route_id already exists to prevent duplicate insertion error
    db_route = db.query(models.EnforcementRoute).filter_by(route_id=route_id).first()
    if not db_route:
        db_route = models.EnforcementRoute(
            route_id=route_id,
            stops=stops
        )
        db.add(db_route)
        db.commit()
        db.refresh(db_route)
        
        # Calculate total ROI
        total_roi = sum(s["roi"] for s in stops)
        
        # Also log the cost-benefit ROI calculation result
        db_roi = models.ROIResult(
            route_id=route_id,
            exposure_reduction=total_roi * 2.5,
            compliance_cost=250.0,
            roi=total_roi
        )
        db.add(db_roi)
        db.commit()
    
    return {
        "route_id": route_id,
        "stops": stops
    }
