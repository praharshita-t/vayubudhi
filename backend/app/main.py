import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import api_router
from app.routers.sync import run_sync_pipeline, router as sync_router

from app.ingestion.scheduler import (
    start_ingestion_scheduler,
    stop_ingestion_scheduler,
    router as ingestion_router,
)

# Initialize database tables (SQLite WAL mode or PostgreSQL TimescaleDB)
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start the background 15-minute CPCB/OpenAQ ingestion scheduler
    start_ingestion_scheduler(interval_seconds=900)
    yield
    # Shutdown: cancel background scheduler thread gracefully
    stop_ingestion_scheduler()

app = FastAPI(
    title="VayuBudhi API Server",
    description="Backend API scaffolding for VayuBudhi, supporting IoT, ML, and Front-end contracts.",
    version="2.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register endpoints router with and without prefix for frontend compatibility
app.include_router(api_router, prefix="/api")
app.include_router(api_router)
app.include_router(sync_router, prefix="/api")
app.include_router(ingestion_router)


@app.get("/")
def read_root():
    return {
        "message": "Welcome to VayuBudhi API Server. Scaffolding is active and healthy.",
        "docs_url": "/docs"
    }
