'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { useCityContext } from '@/context/CityContext';
import { useSimulation } from '@/context/SimulationContext';

const SimulatorPanel = dynamic(() => import('@/components/SimulatorPanel'), { ssr: false });

export default function SimulatePage() {
  const { activeCity, cityData, liveData } = useCityContext();
  const { alertStation } = useSimulation();

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
          <h2 className="page-title">Simulate</h2>
        </div>
        <div className="page-city-badge">{activeCity}</div>
      </div>
      <div className="page-content">
        {alertStation && (
          <div className="panel" style={{ borderColor: 'var(--accent-green)', marginBottom: 12 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--accent-green)', fontWeight: 700 }}>
              Alert dispatched to {alertStation.name}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>
              AQI {alertStation.aqi} · PM2.5 {alertStation.pm25} µg/m³ — mobile notification fired at dispatch
            </div>
          </div>
        )}
        <SimulatorPanel city={activeCity} cityData={cityData} liveData={liveData} />
      </div>
    </div>
  );
}
