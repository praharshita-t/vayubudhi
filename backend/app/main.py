import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import api_router
from app.routers.sync import run_sync_pipeline, router as sync_router

# Initialize SQLite database tables
Base.metadata.create_all(bind=engine)

async def periodic_sync():
    while True:
        await asyncio.sleep(86400) # Wait 24 hours
        print("Running scheduled 24-hour dataset synchronization...")
        run_sync_pipeline()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start the background periodic task
    task = asyncio.create_task(periodic_sync())
    yield
    # Shutdown: cancel task if needed
    task.cancel()

app = FastAPI(
    title="VayuBudhi API Server",
    description="Backend API scaffolding for VayuBudhi hackathon project, supporting IoT, ML, and Front-end contracts.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local hackathon development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register endpoints router with and without prefix for frontend compatibility
app.include_router(api_router, prefix="/api")
app.include_router(api_router)
app.include_router(sync_router, prefix="/api")


@app.get("/")
def read_root():
    return {
        "message": "Welcome to VayuBudhi API Server. Scaffolding is active and healthy.",
        "docs_url": "/docs"
    }
