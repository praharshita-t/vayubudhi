'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { useCityContext } from '@/context/CityContext';

const SimulatorPanel = dynamic(() => import('@/components/SimulatorPanel'), { ssr: false });

export default function SimulatePage() {
  const { activeCity, cityData, liveData } = useCityContext();

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
        <SimulatorPanel onAlert={() => {}} city={activeCity} cityData={cityData} liveData={liveData} />
      </div>
    </div>
  );
}
