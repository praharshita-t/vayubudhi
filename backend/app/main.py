from fastapi import FastAPI
from app.database import engine, Base
from app.routers import api_router

# Initialize SQLite database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="VayuBudhi API Server",
    description="Backend API scaffolding for VayuBudhi hackathon project, supporting IoT, ML, and Front-end contracts.",
    version="1.0.0"
)

# Register endpoints router
app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "message": "Welcome to VayuBudhi API Server. Scaffolding is active and healthy.",
        "docs_url": "/docs"
    }
