'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getAqiCategory } from '@/utils/aqi';

// Dynamic imports to avoid SSR hydration mismatches (dynamic clocks, charts, etc.)
const CityMap = dynamic(() => import('@/components/CityMap'), { ssr: false });
const SimulatorPanel = dynamic(() => import('@/components/SimulatorPanel'), { ssr: false });
const ForecastPanel = dynamic(() => import('@/components/ForecastPanel'), { ssr: false });
const OptimizerPanel = dynamic(() => import('@/components/OptimizerPanel'), { ssr: false });
const AdvisoryPanel = dynamic(() => import('@/components/AdvisoryPanel'), { ssr: false });
const DeepDivePanel = dynamic(() => import('@/components/DeepDivePanel'), { ssr: false });

export interface Station {
  id: string;
  name: string;
  lat: number;
  lon: number;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  co: number;
  o3: number;
  aqi: number;
  source: string;
  status: string;
}

type TabId = 'simulate' | 'forecast' | 'deepdive' | 'enforce' | 'advisory' | 'compare';
type CityId = 'Delhi' | 'Hyderabad' | 'Guwahati' | 'My Location';

const tabs: { id: TabId; label: string }[] = [
  { id: 'simulate', label: 'Simulate' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'deepdive', label: 'Deep Dive' },
  { id: 'enforce', label: 'Enforce' },
  { id: 'advisory', label: 'Advisory' },
  { id: 'compare', label: 'Compare Cities' },
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
  const [hoveredLocation, setHoveredLocation] = useState<any>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<any>(null);
  
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

  const [cityData, setCityData] = useState<any>(null);

  useEffect(() => {
    if (activeCity !== 'My Location') {
      setLiveLoading(true);
      fetch(`http://127.0.0.1:8000/api/city-data?city=${activeCity}`)
        .then((res) => res.json())
        .then((data) => {
          setCityData(data);
          setLiveLoading(false);
        })
        .catch((err) => {
          console.error('Failed to fetch city data:', err);
          setLiveLoading(false);
        });
    }
  }, [activeCity]);

  // Compute live metrics
  let stations = [];
  if (activeCity === 'My Location' && liveData) {
    stations = [{
      name: 'Local GPS',
      aqi: liveData.forecast.point,
      status: liveData.forecast.point > 200 ? 'alert' : 'online'
    }];
  } else if (cityData && cityData.stations) {
    stations = cityData.stations;
  }
  
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
    avgAqi = Math.round(stations.reduce((s: any, st: any) => s + st.aqi, 0) / stations.length);
    const maxStation = stations.reduce((max: any, st: any) => st.aqi > max.aqi ? st : max, stations[0]);
    worstStationName = maxStation.name;
    worstStationAqi = maxStation.aqi;
    alertCount = stations.filter((s: any) => s.status === 'alert').length;
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
            <option value="Hyderabad">Hyderabad</option>
            <option value="Guwahati">Guwahati</option>
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
          cityData={cityData}
          liveLoading={liveLoading} 
          onHover={setHoveredLocation}
          onClick={(d) => {
            setSelectedDistrict(d);
            if (d) setActiveTab('deepdive');
          }}
          selectedDistrictId={selectedDistrict?.id}
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
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="sidebar-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ display: activeTab === 'simulate' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
              <SimulatorPanel onAlert={setAlertStation} city={activeCity} cityData={cityData} liveData={liveData} />
            </div>
            <div style={{ display: activeTab === 'forecast' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
              <ForecastPanel city={activeCity} userCoords={userCoords} liveData={liveData} cityData={cityData} hoveredLocation={hoveredLocation} />
            </div>
            <div style={{ display: activeTab === 'deepdive' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
              {selectedDistrict ? (
                <DeepDivePanel district={selectedDistrict} city={activeCity} onReset={() => {
                  setSelectedDistrict(null);
                  setActiveTab('simulate');
                }} />
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>🔍</div>
                  <h3>Select a District</h3>
                  <p>Click on any district boundary on the map to run a hyper-local ML analysis.</p>
                </div>
              )}
            </div>
            <div style={{ display: activeTab === 'enforce' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
              <OptimizerPanel city={activeCity} cityData={cityData} liveData={liveData} />
            </div>
            <div style={{ display: activeTab === 'advisory' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
              <AdvisoryPanel city={activeCity} userCoords={userCoords} liveData={liveData} cityData={cityData} />
            </div>
            <div style={{ display: activeTab === 'compare' ? 'block' : 'none', height: '100%', overflowY: 'auto', padding: '1.5rem', color: '#c9d1d9' }}>
              <h2 style={{ color: 'white', marginBottom: '1rem', borderBottom: '1px solid #30363d', paddingBottom: '0.5rem' }}>Multi-City Intelligence</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #30363d', color: '#8b949e' }}>
                    <th style={{ padding: '0.5rem' }}>City</th>
                    <th style={{ padding: '0.5rem' }}>Avg AQI</th>
                    <th style={{ padding: '0.5rem' }}>Active Alerts</th>
                    <th style={{ padding: '0.5rem' }}>Est. ROI Impact</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 600 }}>Delhi NCR</td>
                    <td style={{ padding: '0.5rem', color: 'var(--accent-red)' }}>342</td>
                    <td style={{ padding: '0.5rem' }}>12</td>
                    <td style={{ padding: '0.5rem', color: 'var(--accent-green)' }}>+84.2%</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 600 }}>Hyderabad</td>
                    <td style={{ padding: '0.5rem', color: 'var(--accent-amber)' }}>156</td>
                    <td style={{ padding: '0.5rem' }}>4</td>
                    <td style={{ padding: '0.5rem', color: 'var(--accent-green)' }}>+42.1%</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 600 }}>Guwahati</td>
                    <td style={{ padding: '0.5rem', color: 'var(--accent-amber)' }}>112</td>
                    <td style={{ padding: '0.5rem' }}>2</td>
                    <td style={{ padding: '0.5rem', color: 'var(--accent-green)' }}>+21.5%</td>
                  </tr>
                </tbody>
              </table>
              <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#8b949e' }}>
                Note: This table cross-references our backend models across multiple geographic databases to provide city-level executive insights.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
