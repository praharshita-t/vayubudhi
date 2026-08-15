'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { useCityContext } from '@/context/CityContext';

const ForecastPanel = dynamic(() => import('@/components/ForecastPanel'), { ssr: false });

export default function ForecastPage() {
  const { activeCity, userCoords, liveData, cityData } = useCityContext();

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-title">Forecast</h1>
        <div className="page-city-badge">{activeCity}</div>
      </div>
      <div className="page-content">
        <ForecastPanel city={activeCity} userCoords={userCoords} liveData={liveData} cityData={cityData} hoveredLocation={null} />
      </div>
    </div>
  );
}
