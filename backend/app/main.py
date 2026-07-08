from fastapi import FastAPI
from backend.app.api.endpoints import api_router

app = FastAPI(title="VayuBudhi API Server", version="1.0.0")

# Include the endpoints router
app.include_router(api_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to VayuBudhi API Server"}
