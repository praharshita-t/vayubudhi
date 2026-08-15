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
        <h1 className="page-title">Enforce</h1>
        <div className="page-city-badge">{activeCity}</div>
      </div>
      <div className="page-content">
        <OptimizerPanel city={activeCity} cityData={cityData} liveData={liveData} districts={districts} onSetMonitoringLocation={() => {}} />
      </div>
    </div>
  );
}
