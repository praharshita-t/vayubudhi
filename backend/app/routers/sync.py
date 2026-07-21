from fastapi import APIRouter, BackgroundTasks, HTTPException
import os
import sys
import subprocess
import requests
from app.ml_service import ml_service

router = APIRouter()

# Constants
SHEET_URL = "https://docs.google.com/spreadsheets/d/1myYlsoOTpXPPN9mKfZkEDrX_H5mlAiIPbM0HxA6L0OY/export?format=csv"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ML_DATA_DIR = os.path.join(BASE_DIR, 'ml_model', 'data')
ML_SRC_DIR = os.path.join(BASE_DIR, 'ml_model', 'src')
DATASET_PATH = os.path.join(ML_DATA_DIR, 'dataset.csv')

def run_sync_pipeline():
    print("Starting ML Synchronization Pipeline...")
    
    # 1. Download live CSV
    try:
        print(f"Downloading live dataset from Google Sheets...")
        response = requests.get(SHEET_URL, timeout=15)
        response.raise_for_status()
        
        os.makedirs(ML_DATA_DIR, exist_ok=True)
        with open(DATASET_PATH, "wb") as f:
            f.write(response.content)
        print("Dataset downloaded successfully.")
    except Exception as e:
        print(f"Error downloading dataset: {e}")
        return False
        
    # 2. Run fetch_pblh.py
    try:
        print("Fetching PBLH data...")
        pblh_script = os.path.join(ML_SRC_DIR, "fetch_pblh.py")
        subprocess.run([sys.executable, pblh_script], cwd=BASE_DIR, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running fetch_pblh.py: {e}")
        return False
        
    # 3. Run train_models.py
    try:
        print("Training models...")
        train_script = os.path.join(ML_SRC_DIR, "train_models.py")
        subprocess.run([sys.executable, train_script], cwd=BASE_DIR, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running train_models.py: {e}")
        return False
        
    # 4. Hot-reload the models in the ML service
    try:
        print("Hot-reloading models in ML Service...")
        ml_service._load_models()
    except Exception as e:
        print(f"Error reloading models: {e}")
        return False
        
    print("ML Synchronization Pipeline completed successfully.")
    return True

@router.post("/sync")
def trigger_sync(background_tasks: BackgroundTasks):
    """
    Manually trigger the 24-hour sync pipeline for the Live Dataset.
    """
    background_tasks.add_task(run_sync_pipeline)
    return {"message": "Synchronization pipeline triggered in the background. Models will be hot-reloaded upon completion."}
