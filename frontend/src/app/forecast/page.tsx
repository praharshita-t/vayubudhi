'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { useCityContext } from '@/context/CityContext';

import { CityId } from '@/types';

const ForecastPanel = dynamic(() => import('@/components/ForecastPanel'), { ssr: false });

export default function ForecastPage() {
  const { activeCity, setActiveCity, userCoords, liveData, cityData } = useCityContext();

  return (
    <div className="page-wrapper">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1 className="page-title">{activeCity} Forecast</h1>
          <select
            value={activeCity}
            onChange={(e) => setActiveCity(e.target.value as CityId)}
            style={{ marginLeft: '20px', padding: '5px', borderRadius: '5px', background: '#1c2128', color: 'white', border: '1px solid #30363d', fontSize: '0.85rem' }}
          >
            <option value="Delhi">Delhi NCR</option>
            <option value="Hyderabad">Hyderabad</option>
            <option value="Bengaluru">Bengaluru</option>
          </select>
        </div>
        <div className="page-city-badge">{activeCity}</div>
      </div>
      <div className="page-content">
        <ForecastPanel city={activeCity} userCoords={userCoords} liveData={liveData} cityData={cityData} hoveredLocation={null} />
      </div>
    </div>
  );
}
