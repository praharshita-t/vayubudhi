import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from app.redis_client import check_rate_limit
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine, Base
from app.routers import api_router
from app.routers.sync import router as sync_router
from app.routers.auth import router as auth_router, seed_default_users
from app.redis_client import get_cache_status
from app.config import PRODUCTION

from app.ingestion.scheduler import (
    start_ingestion_scheduler,
    stop_ingestion_scheduler,
    router as ingestion_router,
)

# Initialize database tables
if not PRODUCTION:
    Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Seed initial RBAC demonstration accounts
    try:
        if not PRODUCTION and os.getenv("SEED_DEMO_USERS", "false").lower() == "true":
            seed_default_users()
    except Exception as e:
        print(f"Warning: could not seed default users: {e}")

    # Startup: Start the background 15-minute CPCB/OpenAQ ingestion scheduler
    if os.getenv("INGESTION_ENABLED", "false").lower() == "true":
        if PRODUCTION:
            raise RuntimeError("Run ingestion in the dedicated worker in production")
        start_ingestion_scheduler(interval_seconds=900)
    yield
    # Shutdown: cancel background scheduler thread gracefully
    stop_ingestion_scheduler()


app = FastAPI(
    title="VayuBudhi API Server",
    description="Enterprise Municipal Air Quality Intelligence Platform with 4-Tier RBAC, Time-Series Hypertables, and Distributed Caching.",
    version="2.0.0",
    lifespan=lifespan
)

# Allowed CORS origins (defaults to local frontend, configurable via ALLOWED_ORIGINS env)
raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000")
allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
if "*" in raw_origins:
    if PRODUCTION:
        raise RuntimeError("Production ALLOWED_ORIGINS must contain explicit HTTPS origins")
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# Enterprise Security Headers & Data Sovereignty Middleware
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    # Never trust forwarded client addresses supplied directly by callers.
    # The edge proxy supplies X-Forwarded-For, but this API also works without it.
    if PRODUCTION:
        sensitive = request.url.path.endswith(("/auth/login", "/auth/token", "/auth/register"))
        limit = 20 if sensitive else 240
        # All public traffic passes through Caddy. Use its final appended address.
        forwarded = request.headers.get("x-forwarded-for", "").split(",")[-1].strip()
        address = forwarded or (request.client.host if request.client else "unknown")
        allowed, _, reset = check_rate_limit(f"{'auth' if sensitive else 'api'}:{address}", limit, 60)
        if not allowed:
            return JSONResponse({"detail": "Too many requests"}, status_code=429, headers={"Retry-After": str(reset)})
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# Register routers
app.include_router(auth_router, prefix="/api")
app.include_router(api_router, prefix="/api")
app.include_router(api_router)
app.include_router(sync_router, prefix="/api")
app.include_router(ingestion_router)


@app.get("/")
def read_root():
    return {
        "platform": "VayuBudhi 2.0 Enterprise API",
        "status": "online",
        "docs_url": "/docs"
    }
