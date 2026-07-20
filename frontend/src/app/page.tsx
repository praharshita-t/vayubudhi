'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SimulatorPanel from '@/components/SimulatorPanel';
import ForecastPanel from '@/components/ForecastPanel';
import OptimizerPanel from '@/components/OptimizerPanel';
import AdvisoryPanel from '@/components/AdvisoryPanel';
import { cityStations, getAqiCategory, Station } from '@/data/mockStations';

// Dynamic import for Map to avoid SSR issues with Mapbox/Canvas
const CityMap = dynamic(() => import('@/components/CityMap'), { ssr: false });

type TabId = 'simulate' | 'forecast' | 'enforce' | 'advisory';
type CityId = 'Delhi' | 'Mumbai' | 'Bengaluru' | 'My Location';

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'simulate', label: 'Simulate', icon: '🔥' },
  { id: 'forecast', label: 'Forecast', icon: '📈' },
  { id: 'enforce', label: 'Enforce', icon: '⚙️' },
  { id: 'advisory', label: 'Advisory', icon: '💬' },
];

function LiveClock() {
  const [time, setTime] = useState('--:--:--');
  React.useEffect(() => {
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


export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('simulate');
  const [alertStation, setAlertStation] = useState<Station | null>(null);
  const [activeCity, setActiveCity] = useState<CityId>('Delhi');
  
  // Geolocation states
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [liveData, setLiveData] = useState<any>(null);
  const [liveLoading, setLiveLoading] = useState<boolean>(false);

  // Geolocate user when option selected
  useEffect(() => {
    if (activeCity === 'My Location') {
      if (navigator.geolocation) {
        setLiveLoading(true);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserCoords({
              lat: position.coords.latitude,
              lon: position.coords.longitude,
            });
          },
          (error) => {
            console.error('Geolocation error:', error);
            alert('Failed to get location. Defaulting to Delhi.');
            setActiveCity('Delhi');
            setLiveLoading(false);
          }
        );
      } else {
        alert('Geolocation is not supported by your browser. Defaulting to Delhi.');
        setActiveCity('Delhi');
      }
    }
  }, [activeCity]);

  // Fetch live Open-Meteo & ML prediction data when coordinates are available
  useEffect(() => {
    if (activeCity === 'My Location' && userCoords) {
      setLiveLoading(true);
      fetch(`http://127.0.0.1:8000/api/live?lat=${userCoords.lat}&lon=${userCoords.lon}`)
        .then((res) => res.json())
        .then((data) => {
          setLiveData(data);
          setLiveLoading(false);
        })
        .catch((err) => {
          console.error('Failed to fetch live surroundings data:', err);
          setLiveLoading(false);
        });
    }
  }, [activeCity, userCoords]);

  // Compute live metrics
  const stations = cityStations[activeCity] || [];
  
  let avgAqi = 0;
  let worstStationName = 'N/A';
  let worstStationAqi = 0;
  let alertCount = 0;

  if (activeCity === 'My Location') {
    if (liveData) {
      avgAqi = Math.round(liveData.forecast.point);
      worstStationName = 'Local GPS';
      worstStationAqi = Math.round(liveData.forecast.point);
      alertCount = liveData.forecast.point > 200 ? 1 : 0;
    } else {
      avgAqi = 0;
      worstStationName = 'Locating...';
      worstStationAqi = 0;
      alertCount = 0;
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
    <div className="dashboard">
      {/* ── Header ── */}
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
            <option value="Mumbai">Mumbai</option>
            <option value="Bengaluru">Bengaluru</option>
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

      {/* ── Body ── */}
      <div className="dashboard-body">
        {/* Map */}
        <CityMap 
          alertStation={alertStation} 
          city={activeCity} 
          userCoords={userCoords} 
          liveData={liveData} 
          liveLoading={liveLoading} 
        />

        {/* Sidebar */}
        <aside className="sidebar">
          {/* Tabs */}
          <div className="sidebar-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="sidebar-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ display: activeTab === 'simulate' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
              <SimulatorPanel onAlert={setAlertStation} />
            </div>
            <div style={{ display: activeTab === 'forecast' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
              <ForecastPanel city={activeCity} userCoords={userCoords} liveData={liveData} />
            </div>
            <div style={{ display: activeTab === 'enforce' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
              <OptimizerPanel />
            </div>
            <div style={{ display: activeTab === 'advisory' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
              <AdvisoryPanel city={activeCity} userCoords={userCoords} liveData={liveData} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
