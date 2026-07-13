'use client';
import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts';
import { forecastData, validationMetrics } from '@/data/mockForecast';

export default function ForecastPanel() {
  const currentVI = forecastData[0]?.vi ?? 0;
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
            <AreaChart data={forecastData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
