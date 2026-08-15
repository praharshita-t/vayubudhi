'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { useCityContext } from '@/context/CityContext';

const AdvisoryPanel = dynamic(() => import('@/components/AdvisoryPanel'), { ssr: false });

export default function AdvisoryPage() {
  const { activeCity, userCoords, liveData, cityData } = useCityContext();

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-title">Advisory</h1>
        <div className="page-city-badge">{activeCity}</div>
      </div>
      <div className="page-content">
        <AdvisoryPanel city={activeCity} userCoords={userCoords} liveData={liveData} cityData={cityData} />
      </div>
    </div>
  );
}
