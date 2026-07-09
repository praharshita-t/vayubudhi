from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas

router = APIRouter()

@router.get("/forecast", response_model=schemas.ForecastOutput)
def get_forecast(db: Session = Depends(get_db)):
    """
    Returns the 24h point and interval forecast.
    Outputs Contract 3 JSON shape. Logs the forecast in database.
    """
    db_forecast = models.Forecast(
        horizon_h=24,
        point=210.0,
        interval=[180.0, 245.0],
        ventilation_index=850.0
    )
    db.add(db_forecast)
    db.commit()
    db.refresh(db_forecast)
    
    return {
        "horizon_h": db_forecast.horizon_h,
        "point": db_forecast.point,
        "interval": db_forecast.interval,
        "ventilation_index": db_forecast.ventilation_index
    }
