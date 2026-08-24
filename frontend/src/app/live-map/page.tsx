'use client';
import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useCityContext } from '@/context/CityContext';
import { getAqiCategory } from '@/utils/aqi';
import { recommendDeployments } from '@/utils/mcda';
import { Station, CityId, RecommendedDeployment } from '@/types';

const CityMap = dynamic(() => import('@/components/CityMap'), { ssr: false });
const DeepDivePanel = dynamic(() => import('@/components/DeepDivePanel'), { ssr: false });
const AdvisoryPanel = dynamic(() => import('@/components/AdvisoryPanel'), { ssr: false });

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
  const [advisoryOpen, setAdvisoryOpen] = useState(false);

  React.useEffect(() => {
    setSelectedDistrict(null);
  }, [activeCity]);

  const recommendedDeployments: RecommendedDeployment[] = useMemo(() => {
    if (!selectedDistrict || districts.length === 0) return [];
    return recommendDeployments(districts, selectedDistrict.id, 5).map((rec) => ({
      districtId: rec.district.id,
      name: rec.district.name,
      priorityScore: rec.priorityScore,
      dominantSource: rec.dominantSource,
      reason: rec.reason,
      benefit: rec.benefit,
      rank: rec.rank,
      aqi: rec.district.aqi,
    }));
  }, [selectedDistrict, districts]);

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
          <img src="/logo-emblem.png" alt="VayuBudhi" className="header-logo-emblem" />
          <div className="header-brand-title-wrap">
            <h1>VayuBudhi</h1>
            <span className="header-since-badge">SINCE 2026</span>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
            Commander Dashboard
          </span>
          <select
            value={activeCity}
            onChange={(e) => setActiveCity(e.target.value as CityId)}
            style={{ marginLeft: '20px', padding: '5px', borderRadius: '5px', background: '#1c2128', color: 'white', border: '1px solid #30363d' }}
          >
            <option value="Delhi">Delhi NCR</option>
            <option value="Hyderabad">Hyderabad</option>
            <option value="Bengaluru">Bengaluru</option>
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
          recommendedDeployments={recommendedDeployments}
        />

        {selectedDistrict && (
          <aside className="livemap-deep-panel">
            <DeepDivePanel
              district={selectedDistrict}
              city={activeCity}
              onReset={() => setSelectedDistrict(null)}
              recommendedDeployments={recommendedDeployments}
            />
          </aside>
        )}
      </div>

      {/* ── Floating Advisory FAB + Popup ── */}
      <button
        className={`advisory-fab${advisoryOpen ? ' active' : ''}`}
        onClick={() => setAdvisoryOpen(!advisoryOpen)}
        aria-label="Toggle Advisory"
        title="Citizen Advisory"
      >
        {advisoryOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
            <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
        )}
        {!advisoryOpen && <span className="advisory-fab-badge">AI</span>}
      </button>

      {advisoryOpen && (
        <div className="advisory-popup">
          <div className="advisory-popup-header">
            <span>Citizen Advisory</span>
            <button
              className="advisory-popup-close"
              onClick={() => setAdvisoryOpen(false)}
              aria-label="Close Advisory"
            >
              ✕
            </button>
          </div>
          <div className="advisory-popup-body">
            <AdvisoryPanel city={activeCity} userCoords={userCoords} liveData={liveData} cityData={cityData} />
          </div>
        </div>
      )}
    </div>
  );
}
