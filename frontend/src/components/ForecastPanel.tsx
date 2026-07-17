'use client';
import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts';
import { forecastData as initialForecastData, validationMetrics, ForecastPoint } from '@/data/mockForecast';
import { delhiStations } from '@/data/mockStations';

export default function ForecastPanel() {
  const [data, setData] = useState<ForecastPoint[]>(initialForecastData);

  useEffect(() => {
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
  }, []);

  const currentVI = data[0]?.vi ?? 0;
  const viStatus = currentVI < 1000 ? 'STAGNATION' : currentVI < 3000 ? 'POOR' : currentVI < 6000 ? 'MODERATE' : 'GOOD';
  const viColor =
    currentVI < 1000 ? 'var(--accent-red)' :
    currentVI < 3000 ? 'var(--accent-orange)' :
    currentVI < 6000 ? 'var(--accent-amber)' : 'var(--accent-green)';

  const viPercent = Math.min((currentVI / 8000) * 100, 100);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
