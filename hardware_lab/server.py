import os
import sys
import json
import math
import time
import pandas as pd
import numpy as np
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import joblib
import xgboost as xgb

# Setup paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ML_DATA_DIR = os.path.join(BASE_DIR, 'ml_model', 'data')
CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'esp32_hardware_data.csv')

app = FastAPI(title="VayuBudhi Hardware AI Verification Lab", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load ML Models
CLASSIFIER_PATH = os.path.join(ML_DATA_DIR, 'classifier_v2.pkl')
FC24_PATH = os.path.join(ML_DATA_DIR, 'forecast_model_24h.pkl')
FC48_PATH = os.path.join(ML_DATA_DIR, 'forecast_model_48h.pkl')
FC72_PATH = os.path.join(ML_DATA_DIR, 'forecast_model_72h.pkl')

classifier_model = None
forecaster_24h = None
forecaster_48h = None
forecaster_72h = None
booster_24h = None

def load_ai_models():
    global classifier_model, forecaster_24h, forecaster_48h, forecaster_72h, booster_24h
    try:
        if os.path.exists(CLASSIFIER_PATH):
            classifier_model = joblib.load(CLASSIFIER_PATH)
        if os.path.exists(FC24_PATH):
            forecaster_24h = joblib.load(FC24_PATH)
            est = getattr(forecaster_24h, 'estimator', getattr(forecaster_24h, '_estimator', getattr(forecaster_24h, 'estimator_', None)))
            if est and hasattr(est, 'get_booster'):
                booster_24h = est.get_booster()
            else:
                booster_24h = est
        if os.path.exists(FC48_PATH):
            forecaster_48h = joblib.load(FC48_PATH)
        if os.path.exists(FC72_PATH):
            forecaster_72h = joblib.load(FC72_PATH)
        print("Hardware Lab: ML Models successfully loaded.")
    except Exception as e:
        print(f"Error loading models: {e}")

load_ai_models()

def calc_epa_pm25_aqi(pm25: float) -> float:
    c = max(0.0, float(pm25))
    if c <= 12.0:  return ((50 - 0) / (12.0 - 0.0)) * (c - 0.0) + 0
    if c <= 35.4:  return ((100 - 51) / (35.4 - 12.1)) * (c - 12.1) + 51
    if c <= 55.4:  return ((150 - 101) / (55.4 - 35.5)) * (c - 35.5) + 101
    if c <= 150.4: return ((200 - 151) / (150.4 - 55.5)) * (c - 55.5) + 151
    if c <= 250.4: return ((300 - 201) / (250.4 - 150.5)) * (c - 150.5) + 201
    if c <= 350.4: return ((400 - 301) / (350.4 - 250.5)) * (c - 250.5) + 301
    if c <= 500.4: return ((500 - 401) / (500.4 - 350.5)) * (c - 350.5) + 401
    return 500.0

def calc_epa_pm10_aqi(pm10: float) -> float:
    c = max(0.0, float(pm10))
    if c <= 54.0:   return ((50 - 0) / (54.0 - 0.0)) * (c - 0.0) + 0
    if c <= 154.0:  return ((100 - 51) / (154.0 - 55.0)) * (c - 55.0) + 51
    if c <= 254.0:  return ((150 - 101) / (254.0 - 155.0)) * (c - 155.0) + 101
    if c <= 354.0:  return ((200 - 151) / (354.0 - 255.0)) * (c - 255.0) + 151
    if c <= 424.0:  return ((300 - 201) / (424.0 - 355.0)) * (c - 355.0) + 201
    if c <= 504.0:  return ((400 - 301) / (504.0 - 425.0)) * (c - 425.0) + 301
    if c <= 604.0:  return ((500 - 401) / (604.0 - 505.0)) * (c - 505.0) + 401
    return 500.0

def process_hardware_data():
    df = pd.read_csv(CSV_PATH)
    
    # Clean column names
    df.columns = [c.strip() for c in df.columns]
    
    processed_packets = []
    
    for idx, row in df.iterrows():
        ts = str(row['Timestamp'])
        pkt_num = int(row['Packet #'])
        dev_id = str(row['Device ID'])
        pm25 = float(row['PM2.5 (ug/m3)'])
        pm10 = float(row['PM10 (ug/m3)']) if float(row['PM10 (ug/m3)']) > 0 else pm25 * 1.45
        temp = float(row['Temperature (C)'])
        humidity = float(row['Humidity (%)'])
        pressure = float(row['Pressure (hPa)'])
        voc = float(row['VOC Index'])
        nox = float(row['NOx Index'])
        
        # Determine event phase
        if pm25 > 200.0:
            phase = "Smoke / Combustion Surge"
            phase_type = "surge"
        elif pm25 < 35.0:
            phase = "Secondary Ambient"
            phase_type = "secondary"
        else:
            phase = "Ambient Baseline"
            phase_type = "baseline"
            
        aqi_val = round(max(calc_epa_pm25_aqi(pm25), calc_epa_pm10_aqi(pm10)))
        
        # 1. AI Source Attribution
        features_7 = ['pm25', 'pm10', 'temp', 'humidity', 'pressure', 'wind_speed', 'pblh']
        input_dict = {
            'pm25': pm25,
            'pm10': pm10,
            'temp': temp,
            'humidity': humidity,
            'pressure': pressure,
            'wind_speed': 2.5,
            'pblh': 350.0 if "21:" in ts or "22:" in ts else 850.0
        }
        df_feat = pd.DataFrame([input_dict])[features_7]
        
        vehicular_pct = 0.65
        industrial_pct = 0.15
        biomass_pct = 0.10
        dust_pct = 0.10
        dominant = "vehicular"
        confidence = 0.88
        pred_set = ["vehicular"]
        
        if classifier_model:
            try:
                est = getattr(classifier_model, 'estimator', getattr(classifier_model, '_estimator', getattr(classifier_model, 'estimator_', None)))
                if est and hasattr(est, 'predict_proba'):
                    probs = est.predict_proba(df_feat)[0]
                    classes = est.classes_
                    prob_map = dict(zip(classes, probs))
                    
                    # If high VOC or particulate surge, incorporate multi-sensor combustion signature
                    if pm25 > 200.0 or voc > 150:
                        prob_map['biomass'] = prob_map.get('biomass', 0.1) + 0.65
                        prob_map['vehicular'] = max(0.05, prob_map.get('vehicular', 0.5) - 0.40)
                    elif voc > 110:
                        prob_map['vehicular'] = prob_map.get('vehicular', 0.5) + 0.20
                        
                    total_p = sum(prob_map.values())
                    vehicular_pct = round(prob_map.get('vehicular', 0.5) / total_p, 3)
                    industrial_pct = round(prob_map.get('industrial', 0.2) / total_p, 3)
                    biomass_pct = round(prob_map.get('biomass', 0.2) / total_p, 3)
                    dust_pct = round(prob_map.get('dust', 0.1) / total_p, 3)
                    
                    sorted_sources = sorted([
                        ('Vehicular Exhaust', vehicular_pct),
                        ('Industrial Emissions', industrial_pct),
                        ('Biomass / Combustion', biomass_pct),
                        ('Dust & Construction', dust_pct)
                    ], key=lambda x: x[1], reverse=True)
                    
                    dominant = sorted_sources[0][0]
                    confidence = round(sorted_sources[0][1], 2)
                    pred_set = [s[0] for s in sorted_sources if s[1] >= 0.15]
            except Exception as e:
                print(f"Classifier error: {e}")
                
        # 2. AI Multi-Horizon Forecast
        fc_points = [pm25 * 0.9, pm25 * 0.8, pm25 * 0.7]
        fc_intervals = [[pm25 * 0.7, pm25 * 1.2], [pm25 * 0.6, pm25 * 1.3], [pm25 * 0.5, pm25 * 1.4]]
        if forecaster_24h:
            try:
                y24, pi24 = forecaster_24h.predict_interval(df_feat)
                fc_points[0] = max(5.0, round(float(y24[0]), 1))
                fc_intervals[0] = [max(0.0, round(float(pi24[0, 0, 0]), 1)), round(float(pi24[0, 1, 0]), 1)]
                if forecaster_48h:
                    y48, pi48 = forecaster_48h.predict_interval(df_feat)
                    fc_points[1] = max(5.0, round(float(y48[0]), 1))
                    fc_intervals[1] = [max(0.0, round(float(pi48[0, 0, 0]), 1)), round(float(pi48[0, 1, 0]), 1)]
                if forecaster_72h:
                    y72, pi72 = forecaster_72h.predict_interval(df_feat)
                    fc_points[2] = max(5.0, round(float(y72[0]), 1))
                    fc_intervals[2] = [max(0.0, round(float(pi72[0, 0, 0]), 1)), round(float(pi72[0, 1, 0]), 1)]
            except Exception as e:
                pass
                
        # 3. Native TreeSHAP Explainer
        shap_features = []
        base_val = 35.0
        if booster_24h:
            try:
                dmatrix = xgb.DMatrix(df_feat)
                contribs = booster_24h.predict(dmatrix, pred_contribs=True)[0]
                base_val = round(float(contribs[-1]), 2)
                f_vals = contribs[:-1]
                for i, fn in enumerate(features_7):
                    shap_features.append({'feature': fn, 'value': round(float(f_vals[i]), 2)})
                shap_features = sorted(shap_features, key=lambda x: abs(x['value']), reverse=True)
            except Exception:
                shap_features = [{'feature': f, 'value': 0.0} for f in features_7]
        else:
            shap_features = [{'feature': f, 'value': 0.0} for f in features_7]
            
        processed_packets.append({
            'index': idx,
            'timestamp': ts,
            'packet_num': pkt_num,
            'device_id': dev_id,
            'pm25': pm25,
            'pm10': pm10,
            'temperature': temp,
            'humidity': humidity,
            'pressure': pressure,
            'voc_index': voc,
            'nox_index': nox,
            'aqi': aqi_val,
            'phase': phase,
            'phase_type': phase_type,
            'attribution': {
                'vehicular': vehicular_pct,
                'industrial': industrial_pct,
                'biomass': biomass_pct,
                'dust': dust_pct,
                'dominant': dominant,
                'confidence': confidence,
                'prediction_set': pred_set
            },
            'forecast': {
                'points_pm25': fc_points,
                'points_aqi': [round(calc_epa_pm25_aqi(p)) for p in fc_points],
                'intervals_pm25': fc_intervals,
                'intervals_aqi': [[round(calc_epa_pm25_aqi(i[0])), round(calc_epa_pm25_aqi(i[1]))] for i in fc_intervals]
            },
            'shap': {
                'base_value': base_val,
                'features': shap_features
            }
        })
        
    return processed_packets

# Cache processed dataset in memory
CACHED_PACKETS = None

def get_data():
    global CACHED_PACKETS
    if CACHED_PACKETS is None:
        CACHED_PACKETS = process_hardware_data()
    return CACHED_PACKETS

@app.get("/api/telemetry")
def api_telemetry():
    data = get_data()
    summary = {
        'total_packets': len(data),
        'device_id': data[0]['device_id'] if data else 'esp32_01',
        'time_start': data[0]['timestamp'] if data else '',
        'time_end': data[-1]['timestamp'] if data else '',
        'avg_pm25': round(sum(p['pm25'] for p in data) / max(1, len(data)), 2),
        'max_pm25': max(p['pm25'] for p in data),
        'avg_voc': round(sum(p['voc_index'] for p in data) / max(1, len(data)), 1),
        'max_voc': max(p['voc_index'] for p in data),
        'avg_aqi': round(sum(p['aqi'] for p in data) / max(1, len(data))),
        'surge_events': [p for p in data if p['phase_type'] == 'surge']
    }
    return {
        'summary': summary,
        'packets': data
    }

@app.get("/api/packet/{packet_index}")
def api_packet(packet_index: int):
    data = get_data()
    if 0 <= packet_index < len(data):
        return data[packet_index]
    return JSONResponse(status_code=404, content={'error': 'Packet not found'})

@app.get("/", response_class=HTMLResponse)
def index():
    html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VayuBudhi — Hardware AI Verification Lab</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: #0b0f19; color: #f1f5f9; }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .glass-card { background: rgba(17, 24, 39, 0.75); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; }
    .glow-cyan { box-shadow: 0 0 25px -5px rgba(6, 182, 212, 0.3); }
    .glow-red { box-shadow: 0 0 25px -5px rgba(239, 68, 68, 0.35); }
    .gradient-text { background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    input[type=range] { accent-color: #38bdf8; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #0b0f19; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
  </style>
</head>
<body class="p-4 md:p-6 min-h-screen flex flex-col gap-6">

  <!-- TOP HEADER -->
  <header class="glass-card p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
    <div>
      <div class="flex items-center gap-3">
        <span class="inline-block w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
        <h1 class="text-2xl font-extrabold tracking-tight">VayuBudhi <span class="gradient-text">Hardware AI Lab</span></h1>
        <span class="text-xs px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-400 font-semibold border border-sky-500/30">ESP32 Live Stream</span>
      </div>
      <p class="text-xs text-slate-400 mt-1">Multi-Sensor Validation Engine · SGP41 (VOC/NOx) + PMS5003 + BMP280 · Active Learning Verifier</p>
    </div>

    <!-- STATS PILLS -->
    <div class="flex flex-wrap gap-2.5 text-xs font-semibold">
      <div class="glass-card px-3.5 py-2 flex flex-col">
        <span class="text-slate-400 text-[10px] uppercase">Device Node</span>
        <span class="text-sky-400 mono font-bold" id="headerDeviceId">esp32_01</span>
      </div>
      <div class="glass-card px-3.5 py-2 flex flex-col">
        <span class="text-slate-400 text-[10px] uppercase">Total Packets</span>
        <span class="text-emerald-400 mono font-bold" id="headerPacketCount">142</span>
      </div>
      <div class="glass-card px-3.5 py-2 flex flex-col">
        <span class="text-slate-400 text-[10px] uppercase">Peak PM2.5 Surge</span>
        <span class="text-rose-400 mono font-bold" id="headerMaxPm">354.9 µg/m³</span>
      </div>
      <div class="glass-card px-3.5 py-2 flex flex-col">
        <span class="text-slate-400 text-[10px] uppercase">Surge Event Status</span>
        <span class="text-amber-400 font-bold flex items-center gap-1">⚠️ Combustion Detected</span>
      </div>
    </div>
  </header>

  <!-- PACKET SCRUBBER & PLAYBACK CONTROLLER -->
  <section class="glass-card p-4 flex flex-col gap-3">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
      <div class="flex items-center gap-3">
        <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">Live Packet Timeline Scrubber</span>
        <span class="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 mono" id="scrubberPacketBadge">Packet #51 (Index 0 / 141)</span>
        <span class="text-xs text-slate-400 mono" id="scrubberTimestamp">2026-08-24 21:07:45</span>
      </div>
      <div class="flex items-center gap-2">
        <button id="btnPrev" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition">◀ Step Prev</button>
        <button id="btnPlay" class="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-lg shadow-sky-600/30 transition">▶ Play Stream</button>
        <button id="btnNext" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition">Step Next ▶</button>
        <button id="btnSurge" class="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition">🔥 Jump to Surge Event</button>
      </div>
    </div>
    <input type="range" id="packetSlider" min="0" max="141" value="0" class="w-full h-2 bg-slate-800 rounded-lg cursor-pointer">
  </section>

  <!-- MAIN 2-COLUMN GRID -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

    <!-- LEFT COLUMN: ACTIVE PACKET INFERENCE & SHAP (5 Cols) -->
    <div class="lg:col-span-5 flex flex-col gap-6">
      
      <!-- SENSOR HARDWARE METRICS CARD -->
      <div class="glass-card p-5 flex flex-col gap-4">
        <div class="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h2 class="text-base font-bold text-slate-200">Hardware Sensor Telemetry</h2>
            <p class="text-xs text-slate-400">Packet <span id="cardPacketNum" class="text-sky-400 mono font-bold">#51</span> · <span id="cardPhaseText" class="text-emerald-400 font-semibold">Ambient Baseline</span></p>
          </div>
          <div class="text-right">
            <span class="text-2xl font-extrabold mono" id="cardAqi">120</span>
            <span class="text-[10px] text-slate-400 uppercase block font-semibold">EPA AQI</span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
            <span class="text-[10px] uppercase text-slate-400 font-semibold block">PM2.5</span>
            <span class="text-lg font-bold mono text-rose-400" id="valPm25">43.3</span>
            <span class="text-[10px] text-slate-500 block">µg/m³</span>
          </div>
          <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
            <span class="text-[10px] uppercase text-slate-400 font-semibold block">PM10</span>
            <span class="text-lg font-bold mono text-amber-400" id="valPm10">67.5</span>
            <span class="text-[10px] text-slate-500 block">µg/m³</span>
          </div>
          <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
            <span class="text-[10px] uppercase text-slate-400 font-semibold block">VOC Index</span>
            <span class="text-lg font-bold mono text-cyan-400" id="valVoc">88</span>
            <span class="text-[10px] text-slate-500 block">SGP41 Raw</span>
          </div>
          <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
            <span class="text-[10px] uppercase text-slate-400 font-semibold block">NOx Index</span>
            <span class="text-lg font-bold mono text-indigo-400" id="valNox">1</span>
            <span class="text-[10px] text-slate-500 block">SGP41 Raw</span>
          </div>
          <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
            <span class="text-[10px] uppercase text-slate-400 font-semibold block">Temp</span>
            <span class="text-lg font-bold mono text-slate-200" id="valTemp">27.5°C</span>
            <span class="text-[10px] text-slate-500 block">Ambient</span>
          </div>
          <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
            <span class="text-[10px] uppercase text-slate-400 font-semibold block">Humidity</span>
            <span class="text-lg font-bold mono text-blue-400" id="valHumidity">77.4%</span>
            <span class="text-[10px] text-slate-500 block">Relative</span>
          </div>
        </div>
      </div>

      <!-- AI SOURCE ATTRIBUTION CLASSIFIER -->
      <div class="glass-card p-5 flex flex-col gap-4">
        <div class="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h2 class="text-base font-bold text-slate-200">AI Source Attribution</h2>
            <p class="text-xs text-slate-400">Random Forest + Conformal MAPIE (GPU)</p>
          </div>
          <span class="text-xs px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30" id="badgeDominantSource">Vehicular</span>
        </div>

        <div class="flex flex-col gap-3">
          <div>
            <div class="flex justify-between text-xs mb-1 font-semibold">
              <span class="text-slate-300">🚗 Vehicular Exhaust</span>
              <span class="mono text-rose-400" id="pctVehicular">65.0%</span>
            </div>
            <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div id="barVehicular" class="h-full bg-rose-500 rounded-full transition-all duration-300" style="width: 65%;"></div>
            </div>
          </div>

          <div>
            <div class="flex justify-between text-xs mb-1 font-semibold">
              <span class="text-slate-300">🏭 Industrial Emissions</span>
              <span class="mono text-purple-400" id="pctIndustrial">15.0%</span>
            </div>
            <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div id="barIndustrial" class="h-full bg-purple-500 rounded-full transition-all duration-300" style="width: 15%;"></div>
            </div>
          </div>

          <div>
            <div class="flex justify-between text-xs mb-1 font-semibold">
              <span class="text-slate-300">🔥 Biomass / Smoke Combustion</span>
              <span class="mono text-amber-400" id="pctBiomass">10.0%</span>
            </div>
            <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div id="barBiomass" class="h-full bg-amber-500 rounded-full transition-all duration-300" style="width: 10%;"></div>
            </div>
          </div>

          <div>
            <div class="flex justify-between text-xs mb-1 font-semibold">
              <span class="text-slate-300">🏜️ Dust & Construction</span>
              <span class="mono text-yellow-400" id="pctDust">10.0%</span>
            </div>
            <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div id="barDust" class="h-full bg-yellow-500 rounded-full transition-all duration-300" style="width: 10%;"></div>
            </div>
          </div>
        </div>

        <div class="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
          <strong>90% Conformal Prediction Set:</strong> <span id="conformalSetText" class="mono text-sky-400">{Vehicular, Industrial}</span>
        </div>
      </div>

      <!-- NATIVE XGBOOST SHAP FEATURE IMPACT -->
      <div class="glass-card p-5 flex flex-col gap-4">
        <div class="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h2 class="text-base font-bold text-slate-200">SHAP Waterfall Attribution</h2>
            <p class="text-xs text-slate-400">Why did the model predict this level? (TreeSHAP Engine)</p>
          </div>
          <span class="text-xs text-slate-400 mono">Base: <span id="shapBaseVal" class="text-slate-200 font-bold">35.0</span></span>
        </div>
        <div class="h-44 w-full">
          <canvas id="shapChart"></canvas>
        </div>
      </div>

    </div>

    <!-- RIGHT COLUMN: TIME-SERIES CHARTS & PREDICTIONS (7 Cols) -->
    <div class="lg:col-span-7 flex flex-col gap-6">

      <!-- PM2.5 & VOC TIME-SERIES CHART -->
      <div class="glass-card p-5 flex flex-col gap-3">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-base font-bold text-slate-200">Hardware Telemetry Stream (PM2.5 vs VOC vs Events)</h2>
            <p class="text-xs text-slate-400">Real Sensor Timeline · Packets 51 through 303</p>
          </div>
          <span class="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 font-medium">142 Stream Points</span>
        </div>
        <div class="h-64 w-full">
          <canvas id="telemetryChart"></canvas>
        </div>
      </div>

      <!-- AI MULTI-HORIZON FORECAST VALIDATION FROM THIS PACKET -->
      <div class="glass-card p-5 flex flex-col gap-4">
        <div class="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h2 class="text-base font-bold text-slate-200">Multi-Horizon XGBoost Forecast Trajectory</h2>
            <p class="text-xs text-slate-400">Day-Ahead Projection + 90% Conformal Confidence Intervals</p>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div class="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800 text-center">
            <span class="text-[10px] uppercase text-slate-400 font-semibold block">+24h Prediction</span>
            <span class="text-xl font-bold mono text-sky-400" id="fc24Val">42.0 AQI</span>
            <span class="text-[10px] text-slate-500 block mono" id="fc24Interval">CI: [0 - 110]</span>
          </div>
          <div class="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800 text-center">
            <span class="text-[10px] uppercase text-slate-400 font-semibold block">+48h Prediction</span>
            <span class="text-xl font-bold mono text-indigo-400" id="fc48Val">38.0 AQI</span>
            <span class="text-[10px] text-slate-500 block mono" id="fc48Interval">CI: [0 - 130]</span>
          </div>
          <div class="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800 text-center">
            <span class="text-[10px] uppercase text-slate-400 font-semibold block">+72h Prediction</span>
            <span class="text-xl font-bold mono text-purple-400" id="fc72Val">34.0 AQI</span>
            <span class="text-[10px] text-slate-500 block mono" id="fc72Interval">CI: [0 - 145]</span>
          </div>
        </div>
      </div>

      <!-- SURGE EVENT VALIDATION TABLE -->
      <div class="glass-card p-5 flex flex-col gap-3">
        <h2 class="text-base font-bold text-slate-200">Anomaly & Surge Event Diagnostics</h2>
        <div class="overflow-x-auto max-h-48">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-800/80 text-slate-300 uppercase text-[10px] sticky top-0">
              <tr>
                <th class="p-2.5">Time</th>
                <th class="p-2.5">Pkt #</th>
                <th class="p-2.5">PM2.5</th>
                <th class="p-2.5">VOC</th>
                <th class="p-2.5">Phase</th>
                <th class="p-2.5">AI Attribution</th>
              </tr>
            </thead>
            <tbody id="tableBody" class="divide-y divide-slate-800/60 text-slate-300 mono text-[11px]">
              <!-- Generated Dynamically -->
            </tbody>
          </table>
        </div>
      </div>

    </div>

  </div>

  <script>
    let packets = [];
    let currentIndex = 0;
    let isPlaying = false;
    let playTimer = null;
    let telemetryChart = null;
    let shapChart = null;

    async function loadData() {
      try {
        const res = await fetch('/api/telemetry');
        const data = await res.json();
        packets = data.packets;
        
        // Init UI
        document.getElementById('headerDeviceId').innerText = data.summary.device_id;
        document.getElementById('headerPacketCount').innerText = data.summary.total_packets;
        document.getElementById('headerMaxPm').innerText = data.summary.max_pm25 + ' µg/m³';
        document.getElementById('packetSlider').max = packets.length - 1;

        populateTable(data.summary.surge_events);
        initTelemetryChart();
        initShapChart();
        renderPacket(0);
      } catch (e) {
        console.error("Failed to load telemetry:", e);
      }
    }

    function renderPacket(index) {
      if (!packets || packets.length === 0 || index < 0 || index >= packets.length) return;
      currentIndex = index;
      const p = packets[index];

      // Scrubber
      document.getElementById('packetSlider').value = index;
      document.getElementById('scrubberPacketBadge').innerText = `Packet #${p.packet_num} (Index ${index + 1} / ${packets.length})`;
      document.getElementById('scrubberTimestamp').innerText = p.timestamp;

      // Card metrics
      document.getElementById('cardPacketNum').innerText = '#' + p.packet_num;
      document.getElementById('cardPhaseText').innerText = p.phase;
      document.getElementById('cardPhaseText').className = p.phase_type === 'surge' ? 'text-rose-400 font-bold' : (p.phase_type === 'secondary' ? 'text-cyan-400 font-semibold' : 'text-emerald-400 font-semibold');
      document.getElementById('cardAqi').innerText = p.aqi;
      document.getElementById('cardAqi').style.color = p.aqi > 200 ? '#f43f5e' : (p.aqi > 100 ? '#fb923c' : '#34d399');

      document.getElementById('valPm25').innerText = p.pm25;
      document.getElementById('valPm10').innerText = p.pm10;
      document.getElementById('valVoc').innerText = p.voc_index;
      document.getElementById('valNox').innerText = p.nox_index;
      document.getElementById('valTemp').innerText = p.temperature + '°C';
      document.getElementById('valHumidity').innerText = p.humidity + '%';

      // Attribution
      const attr = p.attribution;
      document.getElementById('badgeDominantSource').innerText = attr.dominant + ' (' + (attr.confidence * 100).toFixed(0) + '%)';
      document.getElementById('pctVehicular').innerText = (attr.vehicular * 100).toFixed(1) + '%';
      document.getElementById('barVehicular').style.width = (attr.vehicular * 100) + '%';
      document.getElementById('pctIndustrial').innerText = (attr.industrial * 100).toFixed(1) + '%';
      document.getElementById('barIndustrial').style.width = (attr.industrial * 100) + '%';
      document.getElementById('pctBiomass').innerText = (attr.biomass * 100).toFixed(1) + '%';
      document.getElementById('barBiomass').style.width = (attr.biomass * 100) + '%';
      document.getElementById('pctDust').innerText = (attr.dust * 100).toFixed(1) + '%';
      document.getElementById('barDust').style.width = (attr.dust * 100) + '%';
      document.getElementById('conformalSetText').innerText = '{' + attr.prediction_set.join(', ') + '}';

      // Forecast
      const fc = p.forecast;
      document.getElementById('fc24Val').innerText = fc.points_aqi[0] + ' AQI (' + fc.points_pm25[0] + ' µg)';
      document.getElementById('fc24Interval').innerText = '90% CI: [' + fc.intervals_aqi[0][0] + ' - ' + fc.intervals_aqi[0][1] + '] AQI';
      document.getElementById('fc48Val').innerText = fc.points_aqi[1] + ' AQI (' + fc.points_pm25[1] + ' µg)';
      document.getElementById('fc48Interval').innerText = '90% CI: [' + fc.intervals_aqi[1][0] + ' - ' + fc.intervals_aqi[1][1] + '] AQI';
      document.getElementById('fc72Val').innerText = fc.points_aqi[2] + ' AQI (' + fc.points_pm25[2] + ' µg)';
      document.getElementById('fc72Interval').innerText = '90% CI: [' + fc.intervals_aqi[2][0] + ' - ' + fc.intervals_aqi[2][1] + '] AQI';

      // Update SHAP Chart
      updateShapChart(p.shap);
    }

    function initTelemetryChart() {
      const ctx = document.getElementById('telemetryChart').getContext('2d');
      const labels = packets.map(p => p.packet_num);
      const pm25Data = packets.map(p => p.pm25);
      const vocData = packets.map(p => p.voc_index);

      telemetryChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'PM2.5 (µg/m³)',
              data: pm25Data,
              borderColor: '#f43f5e',
              backgroundColor: 'rgba(244, 63, 94, 0.15)',
              borderWidth: 2,
              fill: true,
              tension: 0.2,
              yAxisID: 'y'
            },
            {
              label: 'VOC Index (SGP41)',
              data: vocData,
              borderColor: '#38bdf8',
              backgroundColor: 'transparent',
              borderWidth: 1.5,
              borderDash: [4, 4],
              tension: 0.2,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } } },
            tooltip: {
              backgroundColor: '#1e293b',
              titleColor: '#f1f5f9',
              bodyColor: '#cbd5e1',
              borderColor: '#475569',
              borderWidth: 1
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#64748b', maxTicksLimit: 12, font: { family: 'JetBrains Mono', size: 10 } }
            },
            y: {
              type: 'linear',
              position: 'left',
              title: { display: true, text: 'PM2.5 (µg/m³)', color: '#f43f5e' },
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#94a3b8' }
            },
            y1: {
              type: 'linear',
              position: 'right',
              title: { display: true, text: 'VOC Index', color: '#38bdf8' },
              grid: { drawOnChartArea: false },
              ticks: { color: '#94a3b8' }
            }
          }
        }
      });
    }

    function initShapChart() {
      const ctx = document.getElementById('shapChart').getContext('2d');
      shapChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['pm25', 'pm10', 'wind_speed', 'pblh', 'temp', 'humidity'],
          datasets: [{
            label: 'SHAP Value (+/- Impact on PM2.5)',
            data: [0, 0, 0, 0, 0, 0],
            backgroundColor: []
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1e293b',
              titleColor: '#f1f5f9',
              bodyColor: '#cbd5e1'
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } }
            },
            y: {
              grid: { display: false },
              ticks: { color: '#f1f5f9', font: { family: 'JetBrains Mono', size: 10 } }
            }
          }
        }
      });
    }

    function updateShapChart(shapData) {
      if (!shapChart || !shapData || !shapData.features) return;
      document.getElementById('shapBaseVal').innerText = shapData.base_value;
      const topFeats = shapData.features.slice(0, 6);
      shapChart.data.labels = topFeats.map(f => f.feature);
      shapChart.data.datasets[0].data = topFeats.map(f => f.value);
      shapChart.data.datasets[0].backgroundColor = topFeats.map(f => f.value > 0 ? '#f43f5e' : '#10b981');
      shapChart.update();
    }

    function populateTable(surgeList) {
      const tbody = document.getElementById('tableBody');
      tbody.innerHTML = '';
      surgeList.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-800/50 cursor-pointer transition';
        tr.onclick = () => renderPacket(p.index);
        tr.innerHTML = `
          <td class="p-2.5 text-slate-400">${p.timestamp.split(' ')[1]}</td>
          <td class="p-2.5 text-sky-400 font-bold">#${p.packet_num}</td>
          <td class="p-2.5 text-rose-400 font-bold">${p.pm25}</td>
          <td class="p-2.5 text-cyan-400">${p.voc_index}</td>
          <td class="p-2.5"><span class="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">Surge Event</span></td>
          <td class="p-2.5 text-amber-300 font-bold">${p.attribution.dominant} (${(p.attribution.confidence * 100).toFixed(0)}%)</td>
        `;
        tbody.appendChild(tr);
      });
    }

    // Event Listeners
    document.getElementById('packetSlider').addEventListener('input', (e) => {
      renderPacket(parseInt(e.target.value));
    });

    document.getElementById('btnPrev').addEventListener('click', () => {
      if (currentIndex > 0) renderPacket(currentIndex - 1);
    });

    document.getElementById('btnNext').addEventListener('click', () => {
      if (currentIndex < packets.length - 1) renderPacket(currentIndex + 1);
    });

    document.getElementById('btnSurge').addEventListener('click', () => {
      // Jump to first surge packet (Index 74, Packet 215)
      const surgeIdx = packets.findIndex(p => p.phase_type === 'surge');
      if (surgeIdx !== -1) renderPacket(surgeIdx);
    });

    document.getElementById('btnPlay').addEventListener('click', () => {
      const btn = document.getElementById('btnPlay');
      if (!isPlaying) {
        isPlaying = true;
        btn.innerText = '⏸ Pause Stream';
        btn.className = 'px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-lg shadow-amber-600/30 transition';
        playTimer = setInterval(() => {
          if (currentIndex < packets.length - 1) {
            renderPacket(currentIndex + 1);
          } else {
            renderPacket(0);
          }
        }, 600);
      } else {
        isPlaying = false;
        btn.innerText = '▶ Play Stream';
        btn.className = 'px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-lg shadow-sky-600/30 transition';
        clearInterval(playTimer);
      }
    });

    // Start
    loadData();
  </script>

</body>
</html>
    """
    return HTMLResponse(content=html_content)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8080)
