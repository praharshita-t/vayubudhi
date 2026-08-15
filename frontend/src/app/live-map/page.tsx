'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useCityContext } from '@/context/CityContext';
import { getAqiCategory } from '@/utils/aqi';
import { Station, CityId } from '@/types';

const CityMap = dynamic(() => import('@/components/CityMap'), { ssr: false });
const DeepDivePanel = dynamic(() => import('@/components/DeepDivePanel'), { ssr: false });

function LiveClock() {
  const [time, setTime] = useState('--:--:--');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span suppressHydrationWarning style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
      {time} IST
    </span>
  );
}

export default function LiveMapPage() {
  const {
    activeCity, setActiveCity,
    cityData, liveData, userCoords, liveLoading,
    stations, districts,
  } = useCityContext();

  const [alertStation, setAlertStation] = useState<Station | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<any>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<any>(null);
  const [monitoringLocation, setMonitoringLocation] = useState<{ lat: number; lon: number; name?: string } | null>(null);

  // Compute commander header metrics
  let avgAqi = 0;
  let worstStationName = 'N/A';
  let worstStationAqi = 0;
  let alertCount = 0;

  if (activeCity === 'My Location') {
    if (liveData) {
      avgAqi = Math.round(liveData.live_aqi);
      worstStationName = 'Local GPS';
      worstStationAqi = Math.round(liveData.live_aqi);
      alertCount = liveData.live_aqi > 200 ? 1 : 0;
    } else {
      worstStationName = 'Locating...';
    }
  } else if (stations.length > 0) {
    avgAqi = Math.round(stations.reduce((s, st) => s + st.aqi, 0) / stations.length);
    const maxStation = stations.reduce((max, st) => st.aqi > max.aqi ? st : max, stations[0]);
    worstStationName = maxStation.name;
    worstStationAqi = maxStation.aqi;
    alertCount = stations.filter(s => s.status === 'alert').length;
  }

  const avgCat = getAqiCategory(avgAqi);

  return (
    <div className="livemap-page">
      {/* ── Commander Header ── */}
      <header className="dashboard-header">
        <div className="header-brand">
          <div className="logo-dot" />
          <h1>VayuBudhi</h1>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>
            Commander Dashboard
          </span>
          <select
            value={activeCity}
            onChange={(e) => setActiveCity(e.target.value as CityId)}
            style={{ marginLeft: '20px', padding: '5px', borderRadius: '5px', background: '#1c2128', color: 'white', border: '1px solid #30363d' }}
          >
            <option value="Delhi">Delhi NCR</option>
            <option value="Hyderabad">Hyderabad</option>
            <option value="Guwahati">Guwahati</option>
            <option disabled style={{ borderTop: '1px solid #30363d', color: '#484f58' }}>── Tier 1 Cities ──</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Bengaluru">Bengaluru</option>
            <option value="Chennai">Chennai</option>
            <option value="Kolkata">Kolkata</option>
            <option value="Pune">Pune</option>
            <option value="Ahmedabad">Ahmedabad</option>
            <option value="Jaipur">Jaipur</option>
            <option value="Lucknow">Lucknow</option>
            <option value="Chandigarh">Chandigarh</option>
            <option value="Thiruvananthapuram">Thiruvananthapuram</option>
            <option disabled style={{ color: '#484f58' }}>── Tier 2 Cities ──</option>
            <option value="Kanpur">Kanpur</option>
            <option value="Nagpur">Nagpur</option>
            <option value="Indore">Indore</option>
            <option value="Bhopal">Bhopal</option>
            <option value="Patna">Patna</option>
            <option value="Vadodara">Vadodara</option>
            <option value="Coimbatore">Coimbatore</option>
            <option value="Visakhapatnam">Visakhapatnam</option>
            <option value="Agra">Agra</option>
            <option value="Varanasi">Varanasi</option>
            <option disabled style={{ color: '#484f58' }}>───────────</option>
            <option value="My Location">📍 My Location</option>
          </select>
        </div>

        <div className="header-metrics">
          <div className="metric-item">
            <span className="metric-label">City Avg AQI</span>
            <span className="metric-value" style={{ color: avgCat.color }}>{avgAqi}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Worst Station</span>
            <span className="metric-value" style={{ color: 'var(--accent-red)' }}>{worstStationName} ({worstStationAqi})</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Active Alerts</span>
            <span className="metric-value" style={{ color: 'var(--accent-amber)' }}>{alertCount}</span>
          </div>
        </div>

        <div className="header-status">
          <div className="status-badge live">
            <div className="dot" />
            Live
          </div>
          <LiveClock />
        </div>
      </header>

      {/* ── Body: Map + optional DeepDive panel ── */}
      <div className={`livemap-body${selectedDistrict ? ' with-panel' : ''}`}>
        <CityMap
          alertStation={alertStation}
          city={activeCity}
          userCoords={userCoords}
          liveData={liveData}
          cityData={cityData}
          liveLoading={liveLoading}
          onHover={setHoveredLocation}
          onClick={(d: any) => {
            setSelectedDistrict(d);
          }}
          selectedDistrictId={selectedDistrict?.id}
          onDistrictsComputed={() => {}}
          monitoringLocation={monitoringLocation}
        />

        {selectedDistrict && (
          <aside className="livemap-deep-panel">
            <DeepDivePanel
              district={selectedDistrict}
              city={activeCity}
              onReset={() => setSelectedDistrict(null)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
