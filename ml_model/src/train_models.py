import os
import sys
import numpy as np
import pandas as pd
import joblib
from xgboost import XGBRegressor
from sklearn.ensemble import RandomForestClassifier
from mapie.regression import SplitConformalRegressor
from mapie.classification import SplitConformalClassifier
from sklearn.model_selection import train_test_split

# Setup paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ML_DATA_DIR = os.path.join(BASE_DIR, 'ml_model', 'data')
DATASET_PATH = os.path.join(BASE_DIR, 'dataset.csv')

os.makedirs(ML_DATA_DIR, exist_ok=True)

def load_and_prepare_data():
    print("Loading dataset...")
    df = pd.read_csv(DATASET_PATH)
    
    # Extract needed columns based on what's available
    # Available in dataset: pm25, pm10, temp_c, humidity, pressure_mb, wind_kph
    df = df.rename(columns={
        'temp_c': 'temp',
        'pressure_mb': 'pressure'
    })
    
    # Calculate wind_speed in m/s from kph
    df['wind_speed'] = df['wind_kph'] / 3.6
    
    # Fill any NaNs
    for col in ['pm25', 'pm10', 'temp', 'humidity', 'pressure', 'wind_speed', 'aqi']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(df[col].median() if not df[col].isnull().all() else 0)

    # Ensure pblh exists (it should be populated by fetch_pblh.py)
    if 'pblh' not in df.columns:
        print("Warning: pblh column missing! Please run fetch_pblh.py first.")
        df['pblh'] = 1000.0
    
    # Ensure Date is parsed
    if 'Date' in df.columns:
        df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
    else:
        df['Date'] = pd.to_datetime('today')
        
    # Sort chronologically to prepare for time-series shift
    df = df.sort_values(by=['station', 'Date'])
    
    # 1. Forecast Target: True 24h, 48h, 72h Future AQI based on historical dataset trends
    df['target_aqi_24h'] = df.groupby('station')['aqi'].shift(-1)
    df['target_aqi_48h'] = df.groupby('station')['aqi'].shift(-2)
    df['target_aqi_72h'] = df.groupby('station')['aqi'].shift(-3)
    
    # Drop rows where we don't have all next 3 days
    df = df.dropna(subset=['target_aqi_24h', 'target_aqi_48h', 'target_aqi_72h'])
    
    # 2. Classification Target: Pollution Source
    # Let's create a heuristic so the model learns from the clean features
    sources = []
    for _, row in df.iterrows():
        ratio = row['pm25'] / (row['pm10'] + 1e-5)
        if ratio > 0.8:
            sources.append("vehicular")
        elif row['temp'] > 35 and row['humidity'] < 40:
            sources.append("dust")
        elif row.get('co', 0) > 300:
            sources.append("biomass")
        else:
            sources.append("industrial")
            
    df['target_source'] = sources
    
    # The required EXACT feature order
    features = ['pm25', 'pm10', 'temp', 'humidity', 'pressure', 'wind_speed', 'pblh']
    X = df[features]
    y_reg_24h = df['target_aqi_24h']
    y_reg_48h = df['target_aqi_48h']
    y_reg_72h = df['target_aqi_72h']
    y_clf = df['target_source']
    
    return X, y_reg_24h, y_reg_48h, y_reg_72h, y_clf

def train_models():
    X, y_reg_24h, y_reg_48h, y_reg_72h, y_clf = load_and_prepare_data()
    
    X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(X, y_clf, test_size=0.2, random_state=42)
    
    print("Training 3-Day XGBoost Forecasters with MAPIE...")
    models_dict = {}
    
    for label, y_target in [('24h', y_reg_24h), ('48h', y_reg_48h), ('72h', y_reg_72h)]:
        X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(X, y_target, test_size=0.2, random_state=42)
        xgb = XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=42)
        mapie_reg = SplitConformalRegressor(estimator=xgb)
        
        # Split train further to prefit Mapie
        X_train_reg_sub, X_cal_reg, y_train_reg_sub, y_cal_reg = train_test_split(X_train_r, y_train_r, test_size=0.3, random_state=42)
        xgb.fit(X_train_reg_sub, y_train_reg_sub)
        mapie_reg.conformalize(X_cal_reg, y_cal_reg)
        
        models_dict[label] = mapie_reg
        print(f"Finished training {label} model.")
    
    print("Training Random Forest Classifier with MAPIE...")
    rfc = RandomForestClassifier(n_estimators=100, random_state=42)
    mapie_clf = SplitConformalClassifier(estimator=rfc)
    
    X_train_clf_sub, X_cal_clf, y_train_clf_sub, y_cal_clf = train_test_split(X_train_c, y_train_c, test_size=0.3, random_state=42)
    rfc.fit(X_train_clf_sub, y_train_clf_sub)
    mapie_clf.conformalize(X_cal_clf, y_cal_clf)
    
    # Save models
    joblib.dump(models_dict, os.path.join(ML_DATA_DIR, 'forecaster.pkl'))
    joblib.dump(mapie_clf, os.path.join(ML_DATA_DIR, 'classifier.pkl'))
    
    print("Models successfully trained and saved!")
    
    print("\nVerifying model predictions on a sample (matching API requirement):")
    sample_df = X.head(1)
    
    pred_point = models_dict['24h'].predict(sample_df)[0]
    pred_class = mapie_clf.predict(sample_df)[0]
    
    print(f"Sample Input:\n{sample_df}")
    print(f"Forecasted PM2.5 24h: {pred_point:.2f}")
    print(f"Attributed Source: {pred_class}")
    
    print("\nTraining completed successfully!")

if __name__ == "__main__":
    train_models()
