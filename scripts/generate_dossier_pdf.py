import os
import subprocess
import shutil

HTML_CONTENT = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>VayuBudhi — Machine Learning & Real-Time Telemetry Dossier</title>
<style>
  @page {
    size: A4 portrait;
    margin: 14mm 14mm 14mm 14mm;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page-break { page-break-before: always; }
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    background: #ffffff;
    line-height: 1.55;
    font-size: 9.5pt;
    margin: 0;
    padding: 0;
  }
  
  .header-card {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: #ffffff;
    padding: 20px 24px;
    border-radius: 8px;
    margin-bottom: 18px;
    border-left: 6px solid #38bdf8;
  }
  .header-tag {
    font-size: 7.5pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #38bdf8;
    margin-bottom: 4px;
  }
  .header-title {
    font-size: 16pt;
    font-weight: 900;
    margin: 0 0 6px 0;
    color: #ffffff;
    letter-spacing: -0.3px;
  }
  .header-subtitle {
    font-size: 8.5pt;
    color: #94a3b8;
    margin: 0;
  }

  h2 {
    font-size: 12pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 5px;
    margin-top: 18px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
  }
  h3 {
    font-size: 10.2pt;
    font-weight: 700;
    color: #1e293b;
    margin-top: 14px;
    margin-bottom: 6px;
  }
  h4 {
    font-size: 9pt;
    font-weight: 700;
    color: #334155;
    margin-top: 10px;
    margin-bottom: 4px;
  }
  p, li {
    font-size: 9pt;
    color: #334155;
  }
  ul, ol {
    margin-top: 4px;
    margin-bottom: 8px;
    padding-left: 18px;
  }
  li {
    margin-bottom: 3px;
  }

  .callout {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 4px solid #38bdf8;
    padding: 10px 14px;
    border-radius: 0 6px 6px 0;
    margin: 10px 0;
  }
  .callout-title {
    font-size: 8pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #0284c7;
    margin-bottom: 4px;
  }
  .callout-success {
    border-left-color: #10b981;
    background: #f0fdf4;
  }
  .callout-success .callout-title {
    color: #059669;
  }

  .formula-box {
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 8px 14px;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 8.5pt;
    color: #0f172a;
    margin: 8px 0;
    font-weight: 600;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 8.5pt;
  }
  th {
    background: #0f172a;
    color: #ffffff;
    font-weight: 700;
    text-align: left;
    padding: 7px 9px;
    border: 1px solid #0f172a;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  td {
    padding: 6px 9px;
    border: 1px solid #cbd5e1;
    color: #334155;
  }
  tr:nth-child(even) {
    background: #f8fafc;
  }
  .highlight-cell {
    font-weight: 700;
    color: #0369a1;
  }
  .badge {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 7.5pt;
    font-weight: 700;
  }
  .badge-success { background: #dcfce7; color: #15803d; }
  .badge-info { background: #e0f2fe; color: #0369a1; }
  .badge-warning { background: #fef3c7; color: #b45309; }

  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 8px 0;
  }
  .card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .card-title {
    font-size: 8pt;
    font-weight: 800;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 4px;
  }
  .card-val {
    font-size: 13pt;
    font-weight: 900;
    color: #0f172a;
  }

  .diagram-box {
    background: #0f172a;
    color: #f8fafc;
    border-radius: 6px;
    padding: 12px 16px;
    font-family: 'Consolas', monospace;
    font-size: 7.5pt;
    line-height: 1.45;
    margin: 10px 0;
    overflow-x: auto;
  }
</style>
</head>
<body>

  <!-- HEADER -->
  <div class="header-card">
    <div class="header-tag">VAYUBUDHI ENVIRONMENTAL INTELLIGENCE SYSTEM</div>
    <h1 class="header-title">Machine Learning & Real-Time Telemetry Technical Dossier</h1>
    <div class="header-subtitle">Comprehensive Architectural Specification, Physics Derivations, and Model Evaluation Benchmarks</div>
  </div>

  <!-- SECTION 1 -->
  <h2>1. Platform Architecture Overview</h2>
  <p>
    VayuBudhi is an enterprise environmental AI platform that fuses real-time multi-source telemetry, continuous atmospheric conservation physics, gradient-boosted temporal forecasting, and physics-informed source apportionment.
  </p>

  <div class="diagram-box">
+---------------------------------------------------------------------------------------+
|                                DATA INGESTION LAYER                                   |
|  [Satellite CAMS Model]      [TomTom Live Traffic]      [ESP32 Hardware Edge Lab]     |
|  (PM2.5, NO2, SO2, CO, O3)   (Arterial Congestion)      (SPS30, SGP41, SCD41, BME280) |
+---------------------------+--------------------------+--------------------------------+
                            |                          |
                            v                          v
+---------------------------------------------------------------------------------------+
|                       ATMOSPHERIC PHYSICS & CONSERVATION ENGINE                       |
|  * Barometric Hydrostatic Altitudinal Scaling: (1013.25 / Pressure)^2.70              |
|  * Planetary Boundary Layer (PBLH) Box-Model Convective Ventilation                   |
|  * Secondary Organic Aerosol (SOA) Photochemical Formation                            |
|  * 2D Inverse Distance Squared Weighting (IDW, p=2) & Circular Wind Vectors           |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
|                       MACHINE LEARNING & UNCERTAINTY CALIBRATION                      |
|  [24h / 48h / 72h Forecasters]               [Source Apportionment & PINN]            |
|  - City-Specific XGBoost Regressors          - Random Forest & CatBoost Classifier    |
|  - 90% Certified MAPIE Conformal Sets        - 90% Conformal Prediction Sets          |
|  - Online Kalman/EMA Bias Tracking           - Gaussian Plume Upwind Triangulation    |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
|                         FASTAPI PRODUCTION SERVING LAYER                              |
|  /api/city-data  |  /api/live  |  /api/attribution  |  /api/forecast  |  /api/report   |
+---------------------------------------------------------------------------------------+
  </div>

  <!-- SECTION 2 -->
  <h2>2. Machine Learning Forecasting Models</h2>
  
  <h3>2.1 Model Pipeline & Feature Representation</h3>
  <p>
    The platform deploys multi-horizon <strong>Gradient Boosted Decision Trees (XGBoost, LightGBM, CatBoost)</strong> to predict ambient PM2.5 concentrations at 24-hour, 48-hour, and 72-hour intervals. Every model takes an identical 7-dimensional physical feature vector:
  </p>
  <div class="formula-box">
    Input Vector = [ PM2.5, PM10, Temperature (&deg;C), Relative Humidity (%), Barometric Pressure (hPa), Wind Speed (m/s), Boundary Layer Height (m) ]
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="card-title">City-Specific Tailored Models</div>
      <p style="font-size: 8pt; margin: 0;">
        Trained specifically on historical meteorological and ambient sensor distributions for major cities (<strong>Delhi, Hyderabad, Bengaluru</strong>). Captures local microclimate features like Delhi's winter thermal inversions and Bengaluru's high-altitude convective mixing.
      </p>
    </div>
    <div class="card">
      <div class="card-title">Unified National Base Models</div>
      <p style="font-size: 8pt; margin: 0;">
        Trained on aggregated multi-city historical records (over 650,000 telemetry rows). Acts as a high-robustness general model across secondary cities (Kolkata, Mumbai, Pune, Chennai, Ahmedabad, Jaipur, Lucknow, Chandigarh).
      </p>
    </div>
  </div>

  <h3>2.2 Accuracy Benchmarks & Evaluation Metrics</h3>
  <p>
    Models were evaluated on strictly chronologically held-out test datasets (70% train, 15% conformal calibration, 15% test) with zero data leakage:
  </p>

  <table>
    <thead>
      <tr>
        <th>Forecast Horizon</th>
        <th>Mean Absolute Error (MAE)</th>
        <th>Root Mean Squared Error (RMSE)</th>
        <th>Determination Coeff. (R&sup2;)</th>
        <th>Persistence Baseline RMSE</th>
        <th>Error Reduction vs. Baseline</th>
        <th>90% Certified Conformal Coverage</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>24-Hour Ahead</strong></td>
        <td class="highlight-cell">6.90 &micro;g/m&sup3;</td>
        <td>9.41 &micro;g/m&sup3;</td>
        <td>0.472</td>
        <td>13.03 &micro;g/m&sup3;</td>
        <td><span class="badge badge-success">+27.7% Improvement</span></td>
        <td><strong>94.0%</strong></td>
      </tr>
      <tr>
        <td><strong>48-Hour Ahead</strong></td>
        <td class="highlight-cell">8.15 &micro;g/m&sup3;</td>
        <td>11.05 &micro;g/m&sup3;</td>
        <td>0.274</td>
        <td>14.10 &micro;g/m&sup3;</td>
        <td><span class="badge badge-success">+21.7% Improvement</span></td>
        <td><strong>92.7%</strong></td>
      </tr>
      <tr>
        <td><strong>72-Hour Ahead</strong></td>
        <td class="highlight-cell">8.63 &micro;g/m&sup3;</td>
        <td>11.49 &micro;g/m&sup3;</td>
        <td>0.215</td>
        <td>14.10 &micro;g/m&sup3;</td>
        <td><span class="badge badge-success">+18.5% Improvement</span></td>
        <td><strong>93.9%</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="callout callout-success">
    <div class="callout-title">Metric Interpretations</div>
    <ul style="margin: 0;">
      <li><strong>MAE = 6.90 &micro;g/m&sup3;</strong>: On average, the 24-hour prediction deviates by less than 7 &micro;g/m&sup3; from actual next-day sensor truth.</li>
      <li><strong>Persistence Baseline Comparison</strong>: The standard meteorological assumption assumes tomorrow's air quality will equal today's. VayuBudhi outperforms this benchmark by <strong>27.7%</strong> at 24 hours.</li>
    </ul>
  </div>

  <div class="page-break"></div>

  <!-- SECTION 3 -->
  <h2>3. Uncertainty Quantification & Online Adaptation</h2>

  <h3>3.1 Certified Uncertainty: MAPIE Split Conformal Prediction</h3>
  <p>
    Standard neural networks and regression models produce point estimates without quantifying certainty. VayuBudhi wraps every forecaster and classifier with <strong>MAPIE (Model Agnostic Prediction Interval Estimator)</strong> based on inductive conformal prediction theory:
  </p>
  <ol>
    <li><strong>Non-Conformity Residuals</strong>: On a separate calibration dataset, compute residual: <code>R_i = |y_i - y_hat(x_i)|</code></li>
    <li><strong>Conformal Quantile</strong>: For a 90% confidence target (&alpha; = 0.10), extract the empirical (1 - &alpha;) quantile <code>q_hat</code> of residuals.</li>
    <li><strong>Guaranteed Interval</strong>: Generates dynamic interval: <code>[ y_hat(x_new) - q_hat, y_hat(x_new) + q_hat ]</code></li>
  </ol>
  <p>
    <strong>Guaranteed Result</strong>: The probability that the true future PM2.5 concentration falls inside the generated interval is provably &ge; 90% (empirically achieves <strong>94.0% coverage</strong>).
  </p>

  <h3>3.2 Closed-Loop Kalman / EMA Online Bias Adaptation</h3>
  <p>
    In live production serving, ambient weather conditions can shift unseasonally. The backend maintains an active verification log:
  </p>
  <ul>
    <li>As past predictions mature each hour, the backend calculates: <code>Residual = Actual_PM25 - Predicted_PM25</code></li>
    <li>Updates a recursive Exponential Moving Average (EMA) bias tracker (&alpha; = 0.35):<br>
      <code>Bias_t = 0.35 * Residual_t + 0.65 * Bias_{t-1}</code>
    </li>
    <li>Subsequent live forecasts are dynamically adjusted by this bias, eliminating systematic drift.</li>
  </ul>

  <!-- SECTION 4 -->
  <h2>4. Source Apportionment, Explainability & PINN Plume Inversion</h2>

  <h3>4.1 Multi-Class Source Classifier</h3>
  <p>
    The source attribution model classifies ambient pollution into 4 physical emission sectors:
  </p>
  <ul>
    <li><strong>Vehicular Exhaust & Transport</strong>: High NO2, traffic congestion slowdowns, fine-to-coarse ratio PM2.5 / PM10 &gt; 0.65.</li>
    <li><strong>Industrial Point Sources</strong>: High SO2, elevated PM10, proximity to industrial zoning.</li>
    <li><strong>Biomass & Crop Residue Combustion</strong>: Fine fraction PM2.5 / PM10 &gt; 0.80, low temperature, elevated CO.</li>
    <li><strong>Road Dust Resuspension</strong>: Low relative humidity &lt; 40%, coarse particle fraction dominant PM2.5 / PM10 &lt; 0.45.</li>
  </ul>

  <h3>4.2 TreeSHAP Feature Explainability</h3>
  <p>
    Using cooperative game theory (Shapley values), the system explains exactly <em>why</em> pollution is rising or falling for any selected ward:
  </p>
  <div class="formula-box">
    &bull; Particulate Mass (PM2.5): +18.4 &micro;g/m&sup3; (Primary mass loading driver)<br>
    &bull; Thermal Inversion Entrapment: +6.8 &micro;g/m&sup3; (Shallow 420m PBLH ceiling traps ground soot)<br>
    &bull; SGP41 VOC Gaseous Precursor: +3.2 &micro;g/m&sup3; (Hydrocarbon exhaust driving secondary nucleation)<br>
    &bull; Horizontal Wind Ventilation: -4.5 &micro;g/m&sup3; (2.8 m/s wind mitigating localized accumulation)
  </div>

  <h3>4.3 Physics-Informed Neural Network (PINN) Plume Inversion</h3>
  <p>
    When a localized sensor spike is detected, the physics engine inverts the classical <strong>Gaussian Plume atmospheric advection-diffusion equation</strong>:
  </p>
  <div class="formula-box">
    C(x, y, z) = [ Q / (2 &pi; u &sigma;_y &sigma;_z) ] * exp( -y&sup2; / (2 &sigma;_y&sup2;) ) * [ exp( -(z - H)&sup2; / (2 &sigma;_z&sup2;) ) + exp( -(z + H)&sup2; / (2 &sigma;_z&sup2;) ) ]
  </div>
  <p>
    <strong>Upwind Source Triangulation Algorithm</strong>:
  </p>
  <ol>
    <li>Extracts meteorological wind direction &theta; (direction from which the wind arrives).</li>
    <li>Calculates the 15-minute upwind travel vector: <code>Distance = min(Wind_Speed * 900s, 1500m)</code>.</li>
    <li>Projects backward coordinates on Earth's surface:
      <code>Delta_Lat = (Distance * cos(&theta;)) / 111,000m</code> and <code>Delta_Lon = (Distance * sin(&theta;)) / (111,000m * cos(Lat))</code>.
    </li>
    <li>Pinpoints the estimated source coordinates (Lat, Lon) and computes emission rate <code>Q = C * (2 &pi; u &sigma;_y &sigma;_z)</code> in grams per second.</li>
  </ol>

  <div class="page-break"></div>

  <!-- SECTION 5 -->
  <h2>5. Live Telemetry & Underground Physics Calculations</h2>

  <h3>5.1 Ingested External APIs</h3>
  <table>
    <thead>
      <tr>
        <th>External Service</th>
        <th>Ingested Parameters</th>
        <th>Update Cadence & Function</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Open-Meteo Air Quality (CAMS)</strong></td>
        <td>PM2.5, PM10, NO2, SO2, CO, O3, Aerosol Optical Depth (AOD), Desert Dust</td>
        <td>Continuous hourly background chemical baseline</td>
      </tr>
      <tr>
        <td><strong>Open-Meteo Weather API</strong></td>
        <td>Planetary Boundary Layer Height (PBLH), Barometric Pressure, Temp, Humidity, Wind Vector</td>
        <td>Real-time boundary layer physics and wind particle synthesis</td>
      </tr>
      <tr>
        <td><strong>TomTom Traffic Flow API</strong></td>
        <td>Current speed, Free-flow speed, Travel delay, Congestion score</td>
        <td>Dynamic traffic slowdown index for street-canyon vehicle soot injection</td>
      </tr>
      <tr>
        <td><strong>NASA FIRMS Satellite</strong></td>
        <td>Thermal anomaly coordinates, Brightness temperature, Fire Radiative Power</td>
        <td>Cross-verification of agricultural and open biomass combustion</td>
      </tr>
      <tr>
        <td><strong>OpenStreetMap (OSM)</strong></td>
        <td>Administrative district polygons, Industrial zoning corridors</td>
        <td>High-resolution ward boundaries and land-use spatial masking</td>
      </tr>
      <tr>
        <td><strong>Hardware Lab (ESP32)</strong></td>
        <td>Sensirion SPS30 (PM1.0/2.5/4.0/10), SGP41 (VOC/NOx), SCD41 (CO2), BME280 (T/H/P)</td>
        <td>Physical edge sensor calibration and live hardware testbench</td>
      </tr>
    </tbody>
  </table>

  <h3>5.2 Continuous Atmospheric Conservation Engine</h3>
  <p>
    Raw satellite models have coarse 10 km grid resolution. VayuBudhi's backend conservation engine transforms them into microclimate ground truth:
  </p>
  
  <h4>1. Barometric Hydrostatic Altitudinal Scaling</h4>
  <p>Barometric air density compresses aerosol volumetric mass in low-lying basins:</p>
  <div class="formula-box">
    Altitudinal Factor = ( 1013.25 / max(700.0, Surface_Pressure) )^2.70
  </div>

  <h4>2. Planetary Boundary Layer Height (PBLH) Box Model</h4>
  <p>During morning inversions (08:00 - 10:30 IST), the ceiling contracts to 350m - 500m, trapping smoke. In the afternoon, thermal convection expands the ceiling to 2000m, flushing the basin:</p>
  <div class="formula-box">
    Ventilation Factor = ( 800.0 / clamp(PBLH, 350, 3000) )^0.32 * ( 2.8 / max(0.8, Wind_Speed) )^0.22
  </div>

  <h4>3. Secondary Organic Aerosol (SOA) Photochemical Formation</h4>
  <p>NO2 and SO2 gases chemically react under sunlight to nucleate into fine particulate mass:</p>
  <div class="formula-box">
    SOA Formation = ( NO2 * 0.15 + SO2 * 0.15 ) * min(1.2, Ventilation Factor)
  </div>

  <h4>4. Street-Canyon Dynamic Traffic Emission Injection</h4>
  <div class="formula-box">
    Congestion Index = max( 0.0, (FreeFlow_Speed - Current_Speed) / FreeFlow_Speed )<br>
    Traffic Injection = 14.0 * Congestion Index * Ventilation Factor
  </div>

  <h4>5. Final Calibrated Ground PM2.5</h4>
  <div class="formula-box">
    Final PM2.5 = max( 8.0, (Raw_PM25 * Altitudinal Factor * Ventilation Factor * 0.70) + Urban_Baseline + SOA Formation + Traffic Injection )
  </div>

  <h3>5.3 Spatial Inverse Distance Weighting (IDW) & Circular Wind Vectors</h3>
  <p>
    To interpolate continuous pollution across any ward centroid (x0, y0) from surrounding monitoring stations:
  </p>
  <div class="formula-box">
    Z_estimated = Sum( w_i * Z_i ) / Sum( w_i ),   where w_i = 1 / ( Distance_i&sup2; + &epsilon; )
  </div>
  <p>
    <strong>Circular Wind Direction Averaging</strong>: Because compass angles wrap around at 360&deg; = 0&deg;, simple arithmetic averages fail (e.g. average of 350&deg; and 10&deg; is 0&deg;/North, not 180&deg;/South). The engine computes the weighted trigonometric circular mean:
  </p>
  <div class="formula-box">
    S = Sum( w_i * sin(&theta;_i) ),   C = Sum( w_i * cos(&theta;_i) )<br>
    Mean Wind Direction = ( atan2(S, C) * 180 / &pi; + 360 ) mod 360
  </div>

  <h3>5.4 EPA Standard Breakpoint Conversion</h3>
  <table>
    <thead>
      <tr>
        <th>PM2.5 Breakpoint Range (&micro;g/m&sup3;)</th>
        <th>EPA AQI Range</th>
        <th>Category</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>0.0 - 12.0</td><td>0 - 50</td><td><span class="badge badge-success">Good</span></td></tr>
      <tr><td>12.1 - 35.4</td><td>51 - 100</td><td><span class="badge badge-info">Moderate</span></td></tr>
      <tr><td>35.5 - 55.4</td><td>101 - 150</td><td><span class="badge badge-warning">Unhealthy for Sensitive Groups</span></td></tr>
      <tr><td>55.5 - 150.4</td><td>151 - 200</td><td><span class="badge badge-warning">Unhealthy</span></td></tr>
      <tr><td>150.5 - 250.4</td><td>201 - 300</td><td><span class="badge badge-warning">Very Unhealthy</span></td></tr>
      <tr><td>250.5 - 500.4</td><td>301 - 500</td><td><span class="badge badge-warning">Hazardous</span></td></tr>
    </tbody>
  </table>

  <!-- FOOTER -->
  <div style="margin-top: 24px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 7.5pt; color: #94a3b8; display: flex; justify-content: space-between;">
    <span>VayuBudhi Air Quality Intelligence &copy; 2026</span>
    <span>Document Ref: VB-ML-TELEMETRY-SPEC-2026</span>
  </div>

</body>
</html>
"""

def generate_pdf():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(script_dir)
    temp_html = os.path.join(base_dir, "temp_dossier.html")
    
    with open(temp_html, "w", encoding="utf-8") as f:
        f.write(HTML_CONTENT)
    print(f"Generated HTML template at {temp_html}")

    chrome_candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    ]
    
    chrome_exe = None
    for p in chrome_candidates:
        if os.path.exists(p):
            chrome_exe = p
            break

    if not chrome_exe:
        raise RuntimeError("No headless browser found to convert HTML to PDF.")

    docs_dir = os.path.join(base_dir, "docs")
    os.makedirs(docs_dir, exist_ok=True)
    out_pdf_docs = os.path.join(docs_dir, "VayuBudhi_ML_and_Telemetry_Guide.pdf")
    out_pdf_downloads = os.path.expanduser("~/Downloads/VayuBudhi_ML_and_Telemetry_Guide.pdf")

    cmd = [
        chrome_exe,
        "--headless",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        "--no-pdf-header-footer",
        f"--print-to-pdf={out_pdf_docs}",
        temp_html
    ]

    print(f"Executing browser: {chrome_exe}")
    res = subprocess.run(cmd, capture_output=True, text=True)
    print("Browser return code:", res.returncode)

    if os.path.exists(out_pdf_docs):
        shutil.copyfile(out_pdf_docs, out_pdf_downloads)
        print("Successfully generated clean PDF:")
        print(f"  1. {out_pdf_docs}")
        print(f"  2. {out_pdf_downloads}")
        print(f"  Size: {os.path.getsize(out_pdf_docs)} bytes")
    else:
        print("Failed to generate PDF.")

if __name__ == "__main__":
    generate_pdf()
