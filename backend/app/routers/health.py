from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app import schemas

router = APIRouter()

@router.get("/health", response_model=schemas.HealthStatus, status_code=status.HTTP_200_OK)
def check_health(db: Session = Depends(get_db)):
    """
    Performs server connectivity and database readiness checks.
    """
    database_status = "disconnected"
    try:
        db.execute(text("SELECT 1"))
        database_status = "connected"
    except Exception:
        pass
        
    return {
        "status": "healthy",
        "database": database_status
    }
