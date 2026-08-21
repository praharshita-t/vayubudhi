'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { useCityContext } from '@/context/CityContext';

const OptimizerPanel = dynamic(() => import('@/components/OptimizerPanel'), { ssr: false });

export default function EnforcePage() {
  const { activeCity, cityData, liveData, districts } = useCityContext();

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
          <h2 className="page-title">Enforce</h2>
        </div>
        <div className="page-city-badge">{activeCity}</div>
      </div>
      <div className="page-content">
        <OptimizerPanel city={activeCity} cityData={cityData} liveData={liveData} districts={districts} onSetMonitoringLocation={() => {}} />
      </div>
    </div>
  );
}
