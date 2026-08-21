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
          <h2 className="page-title">{activeCity} Forecast</h2>
          <select
            value={activeCity}
            onChange={(e) => setActiveCity(e.target.value as CityId)}
            style={{ marginLeft: '16px', padding: '5px 10px', borderRadius: '6px', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', fontSize: '0.85rem' }}
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
