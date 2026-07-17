from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import schemas
from app.ml_service import ml_service

router = APIRouter()

@router.post("/attribution", response_model=schemas.AttributionOutput)
def get_attribution(reading: schemas.SensorReading, db: Session = Depends(get_db)):
    """
    Returns the source apportionment classifier prediction using ML model.
    """
    prediction = ml_service.predict_attribution(reading)
    
    db_result = models.AttributionResult(
        prediction_set=prediction["prediction_set"],
        set_size=prediction["set_size"],
        confidence=prediction["confidence"],
        probabilities=prediction["probabilities"]
    )
    db.add(db_result)
    db.commit()
    db.refresh(db_result)
    
    return prediction
