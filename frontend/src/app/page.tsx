'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { delhiStations, getAqiCategory, Station } from '@/data/mockStations';

// Dynamic imports to avoid SSR hydration mismatches (dynamic clocks, charts, etc.)
const DelhiMap = dynamic(() => import('@/components/DelhiMap'), { ssr: false });
const SimulatorPanel = dynamic(() => import('@/components/SimulatorPanel'), { ssr: false });
const ForecastPanel = dynamic(() => import('@/components/ForecastPanel'), { ssr: false });
const OptimizerPanel = dynamic(() => import('@/components/OptimizerPanel'), { ssr: false });
const AdvisoryPanel = dynamic(() => import('@/components/AdvisoryPanel'), { ssr: false });

type TabId = 'simulate' | 'forecast' | 'enforce' | 'advisory';

const tabs: { id: TabId; label: string }[] = [
  { id: 'simulate', label: 'Simulate' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'enforce', label: 'Enforce' },
  { id: 'advisory', label: 'Advisory' },
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

  // Compute live metrics
  const avgAqi = Math.round(delhiStations.reduce((s, st) => s + st.aqi, 0) / delhiStations.length);
  const maxStation = delhiStations.reduce((max, st) => st.aqi > max.aqi ? st : max, delhiStations[0]);
  const alertCount = delhiStations.filter(s => s.status === 'alert').length;
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
        </div>

        <div className="header-metrics">
          <div className="metric-item">
            <span className="metric-label">City Avg AQI</span>
            <span className="metric-value" style={{ color: avgCat.color }}>{avgAqi}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Worst Station</span>
            <span className="metric-value" style={{ color: 'var(--accent-red)' }}>{maxStation.name} ({maxStation.aqi})</span>
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
        <DelhiMap alertStation={alertStation} />

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
              <SimulatorPanel onAlert={setAlertStation} />
            </div>
            <div style={{ display: activeTab === 'forecast' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
              <ForecastPanel />
            </div>
            <div style={{ display: activeTab === 'enforce' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
              <OptimizerPanel />
            </div>
            <div style={{ display: activeTab === 'advisory' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
              <AdvisoryPanel />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
