'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { useCityContext } from '@/context/CityContext';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, ShieldCheck, ArrowRight, Lock } from 'lucide-react';

const OptimizerPanel = dynamic(() => import('@/components/OptimizerPanel'), { ssr: false });

export default function EnforcePage() {
  const { activeCity, cityData, liveData, districts } = useCityContext();
  const { hasRole, role } = useAuth();

  const isAuthorized = hasRole(['city_officer', 'super_admin']);

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
          <h2 className="page-title">Enforce</h2>
        </div>
        <div className="page-city-badge">{activeCity}</div>
      </div>
      <div className="page-content">
        {isAuthorized ? (
          <OptimizerPanel
            city={activeCity}
            cityData={cityData}
            liveData={liveData}
            districts={districts}
            onSetMonitoringLocation={() => {}}
          />
        ) : (
          <div className="officer-gate-card">
            <div className="officer-gate-icon-wrap">
              <ShieldAlert size={36} />
            </div>
            <h3 className="officer-gate-title">
              Officer Authorization Required
            </h3>
            <p className="officer-gate-desc">
              The <strong>Google OR-Tools Municipal Fleet Enforcement & Sprinkler Dispatch</strong> portal is strictly restricted to verified Municipal Officers (GHMC Environmental Wing) and Central System Administrators. Public citizens have read-only access to ambient city maps and health advisories.
            </p>
            <div className="officer-gate-actions">
              <p>Use Staff sign in at the top of the page with your assigned account.</p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Current Role: <span style={{ fontWeight: 600, color: '#f59e0b' }}>{role}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
