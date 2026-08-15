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
        <h1 className="page-title">Simulate</h1>
        <div className="page-city-badge">{activeCity}</div>
      </div>
      <div className="page-content">
        <SimulatorPanel onAlert={() => {}} city={activeCity} cityData={cityData} liveData={liveData} />
      </div>
    </div>
  );
}
