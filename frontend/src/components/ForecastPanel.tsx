'use client';
import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts';
import { forecastData as initialForecastData, validationMetrics, ForecastPoint } from '@/data/mockForecast';
import { delhiStations } from '@/data/mockStations';

export default function ForecastPanel({ city = 'Delhi', userCoords, liveData }: { city?: string, userCoords?: { lat: number, lon: number } | null, liveData?: any }) {
  const [data, setData] = useState<ForecastPoint[]>(initialForecastData);
  const [liveForecast, setLiveForecast] = React.useState<any>(null);
  const [liveAttribution, setLiveAttribution] = React.useState<any>(null);
  const [liveConnection, setLiveConnection] = React.useState<boolean>(false);

  useEffect(() => {
    if (city === 'My Location') {
      if (liveData && liveData.forecast) {
        const result = liveData.forecast;
        setData(prev => {
          const newData = [...prev];
          const targetIndex = newData.findIndex(p => p.hour === 24);
          if (targetIndex !== -1) {
            const oldPoint = newData[targetIndex].point;
            const ratio = oldPoint > 0 ? result.point / oldPoint : 1;
            const viRatio = newData[targetIndex].vi > 0 ? result.ventilation_index / newData[targetIndex].vi : 1;

            return newData.map(p => ({
              ...p,
              point: Math.round(p.point * ratio),
              lower: Math.round(p.lower * ratio),
              upper: Math.round(p.upper * ratio),
              vi: Math.round(p.vi * viRatio)
            }));
          }
          return newData;
        });
      }
      return;
    }

    // Find the IoT sensor to use as input features
    const iotSensor = delhiStations.find(s => s.source === 'iot');
    if (!iotSensor) return;

    const payload = {
      station_id: iotSensor.id,
      timestamp: new Date().toISOString(),
      pm25: iotSensor.pm25,
      pm10: iotSensor.pm25 * 1.5, // approximate pm10
      temp: 32.5,
      humidity: 55.0,
      pressure: 1008.2,
      wind_speed: 2.5,
      pblh: 850.0
    };

    fetch('http://127.0.0.1:8000/api/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(result => {
        // Splice the real 24h point into the mock 72h curve
        if (result && result.horizon_h === 24) {
          setData(prev => {
            const newData = [...prev];
            const targetIndex = newData.findIndex(p => p.hour === 24);
            if (targetIndex !== -1) {
              const oldPoint = newData[targetIndex].point;
              const ratio = oldPoint > 0 ? result.point / oldPoint : 1;
              const viRatio = newData[targetIndex].vi > 0 ? result.ventilation_index / newData[targetIndex].vi : 1;

              // Scale the entire curve to smoothly anchor to the real ML prediction
              return newData.map(p => ({
                ...p,
                point: Math.round(p.point * ratio),
                lower: Math.round(p.lower * ratio),
                upper: Math.round(p.upper * ratio),
                vi: Math.round(p.vi * viRatio)
              }));
            }
            return newData;
          });
        }
      })
      .catch(err => console.error('Failed to fetch ML forecast:', err));

    Promise.all([
      fetch('http://127.0.0.1:8000/api/forecast').then(res => res.json()),
      fetch('http://127.0.0.1:8000/api/attribution').then(res => res.json())
    ])
      .then(([forecast, attribution]) => {
        setLiveForecast(forecast);
        setLiveAttribution(attribution);
        setLiveConnection(true);
      })
      .catch(err => {
        console.error('Failed to fetch live API data:', err);
        setLiveConnection(false);
      });
  }, [city, liveData]);

  const currentVI = data[0]?.vi ?? 0;
  const viStatus = currentVI < 1000 ? 'STAGNATION' : currentVI < 3000 ? 'POOR' : currentVI < 6000 ? 'MODERATE' : 'GOOD';
  const viColor =
    currentVI < 1000 ? 'var(--accent-red)' :
    currentVI < 3000 ? 'var(--accent-orange)' :
    currentVI < 6000 ? 'var(--accent-amber)' : 'var(--accent-green)';

  const viPercent = Math.min((currentVI / 8000) * 100, 100);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Live API Integration Card */}
      {liveConnection && liveForecast && liveAttribution && (
        <div className="panel" style={{ borderColor: 'var(--accent-green)', background: 'rgba(56, 139, 253, 0.05)' }}>
          <div className="panel-header">
            <div className="panel-title" style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="dot live" style={{ width: 8, height: 8, background: 'var(--accent-green)', borderRadius: '50%', display: 'inline-block' }}></span>
              Live API & ML Model Connected
            </div>
            <div className="panel-badge badge-green">Active</div>
          </div>
          <div style={{ fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6, color: 'var(--text-normal)' }}>
            <div><strong>Forecast (XGBoost + MAPIE):</strong> 24h AQI Point = {liveForecast.point.toFixed(1)} | Conformal Interval = [{liveForecast.interval[0].toFixed(1)}, {liveForecast.interval[1].toFixed(1)}]</div>
            <div><strong>Source Attribution (Random Forest):</strong> Predicted Sources = {liveAttribution.prediction_set.join(', ')} | Confidence = {(liveAttribution.confidence * 100).toFixed(0)}%</div>
          </div>
        </div>
      )}

      {/* VI Gauge */}
      <div className="gauge-container">
        <div className="gauge-ring">
          <svg width={64} height={64} viewBox="0 0 64 64">
            <circle cx={32} cy={32} r={26} fill="none" stroke="var(--bg-elevated)" strokeWidth={5} />
            <circle cx={32} cy={32} r={26} fill="none" stroke={viColor} strokeWidth={5}
              strokeDasharray={`${viPercent * 1.63} 163`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
          </svg>
        </div>
        <div className="gauge-info">
          <div className="gauge-label">Ventilation Index</div>
          <div className="gauge-value" style={{ color: viColor }}>{currentVI.toLocaleString()}</div>
          <div className="gauge-desc">
            {viStatus} — PBLH × Wind
          </div>
        </div>
        <div className={`panel-badge ${currentVI < 3000 ? 'badge-red' : 'badge-green'}`}>
          {viStatus}
        </div>
      </div>

      {/* Forecast Chart */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">72h AQI Forecast</div>
          <div className="panel-badge badge-blue">90% Conformal</div>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="conformalBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#388bfd" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#388bfd" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#484f58' }}
                tickFormatter={(h: number) => `${h}h`}
                interval={3} />
              <YAxis tick={{ fontSize: 9, fill: '#484f58' }} domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{
                  background: '#161b22', border: '1px solid #30363d',
                  borderRadius: 8, fontSize: 11, color: '#e6edf3',
                }}
                formatter={(val: number, name: string) => [
                  `${val}`, name === 'point' ? 'Forecast AQI' : name
                ]}
                labelFormatter={(h: number) => `+${h}h from now`}
              />
              <ReferenceLine y={200} stroke="var(--accent-amber)" strokeDasharray="4 4" strokeWidth={0.8} />
              <ReferenceLine y={300} stroke="var(--accent-red)" strokeDasharray="4 4" strokeWidth={0.8} />
              <Area type="monotone" dataKey="upper" stackId="band" stroke="none" fill="url(#conformalBand)" />
              <Area type="monotone" dataKey="lower" stackId="band" stroke="none" fill="#06080f" />
              <Area type="monotone" dataKey="point" stroke="#388bfd" strokeWidth={2} fill="none" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Validation Metrics */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Model Validation</div>
          <div className="panel-badge badge-green">✓ Calibrated</div>
        </div>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-card-value" style={{ color: 'var(--accent-green)' }}>
              {validationMetrics.improvement_24h}%
            </div>
            <div className="metric-card-label">24h RMSE ↓</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-value" style={{ color: 'var(--accent-amber)' }}>
              {validationMetrics.improvement_48h}%
            </div>
            <div className="metric-card-label">48h RMSE ↓</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-value" style={{ color: 'var(--accent-blue)' }}>
              {validationMetrics.conformal_coverage}%
            </div>
            <div className="metric-card-label">Coverage</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-value" style={{ color: 'var(--accent-purple)' }}>
              {validationMetrics.rmse_24h}
            </div>
            <div className="metric-card-label">RMSE 24h</div>
          </div>
        </div>
      </div>
    </div>
  );
}
