from fastapi import APIRouter
from routers.ingest import router as ingest_router
from routers.forecast import router as forecast_router
from routers.attribution import router as attribution_router
from routers.optimize import router as optimize_router
from routers.health import router as health_router

api_router = APIRouter()

api_router.include_router(ingest_router)
api_router.include_router(forecast_router)
api_router.include_router(attribution_router)
api_router.include_router(optimize_router)
api_router.include_router(health_router)
