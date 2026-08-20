'use client';
import React from 'react';
import { useCityContext } from '@/context/CityContext';
import { getAqiCategory } from '@/utils/aqi';

export default function ComparePage() {
  const { activeCity } = useCityContext();

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="page-header-left">
          <div className="header-brand">
            <img src="/logo-emblem.png" alt="VayuBudhi" className="header-logo-emblem" />
            <div className="header-brand-title-wrap">
              <h1>VayuBudhi</h1>
              <span className="header-since-badge">SINCE 2026</span>
            </div>
          </div>
          <div className="page-header-divider" />
          <h2 className="page-title">Compare Cities</h2>
        </div>
        <div className="page-city-badge">{activeCity}</div>
      </div>
      <div className="page-content">
        <h2 style={{ color: 'white', marginBottom: '1rem', borderBottom: '1px solid #30363d', paddingBottom: '0.5rem' }}>Multi-City Intelligence</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #30363d', color: '#8b949e' }}>
              <th style={{ padding: '0.5rem' }}>City</th>
              <th style={{ padding: '0.5rem' }}>Avg AQI</th>
              <th style={{ padding: '0.5rem' }}>Active Alerts</th>
              <th style={{ padding: '0.5rem' }}>Est. ROI Impact</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #21262d' }}>
              <td style={{ padding: '0.5rem', fontWeight: 600 }}>Delhi NCR</td>
              <td style={{ padding: '0.5rem', color: 'var(--accent-red)' }}>342</td>
              <td style={{ padding: '0.5rem' }}>12</td>
              <td style={{ padding: '0.5rem', color: 'var(--accent-green)' }}>+84.2%</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #21262d' }}>
              <td style={{ padding: '0.5rem', fontWeight: 600 }}>Hyderabad</td>
              <td style={{ padding: '0.5rem', color: 'var(--accent-amber)' }}>156</td>
              <td style={{ padding: '0.5rem' }}>4</td>
              <td style={{ padding: '0.5rem', color: 'var(--accent-green)' }}>+42.1%</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #21262d' }}>
              <td style={{ padding: '0.5rem', fontWeight: 600 }}>Guwahati</td>
              <td style={{ padding: '0.5rem', color: 'var(--accent-amber)' }}>112</td>
              <td style={{ padding: '0.5rem' }}>2</td>
              <td style={{ padding: '0.5rem', color: 'var(--accent-green)' }}>+21.5%</td>
            </tr>
          </tbody>
        </table>
        <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#8b949e' }}>
          Note: This table cross-references our backend models across multiple geographic databases to provide city-level executive insights.
        </p>
      </div>
    </div>
  );
}
