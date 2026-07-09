from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas

router = APIRouter()

@router.get("/attribution", response_model=schemas.AttributionOutput)
def get_attribution(db: Session = Depends(get_db)):
    """
    Returns the source apportionment classifier prediction.
    Outputs Contract 2 JSON shape. Logs result to SQLite.
    """
    db_result = models.AttributionResult(
        prediction_set=["biomass_burning"],
        set_size=1,
        confidence=0.90,
        probabilities={"biomass_burning": 0.82, "vehicular": 0.11}
    )
    db.add(db_result)
    db.commit()
    db.refresh(db_result)
    
    return {
        "prediction_set": db_result.prediction_set,
        "set_size": db_result.set_size,
        "confidence": db_result.confidence,
        "probabilities": db_result.probabilities
    }
