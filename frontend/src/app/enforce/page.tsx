'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { useCityContext } from '@/context/CityContext';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, Lock } from 'lucide-react';

const OptimizerPanel = dynamic(() => import('@/components/OptimizerPanel'), { ssr: false });

export default function EnforcePage() {
  const { activeCity, cityData, liveData, districts } = useCityContext();
  const { hasRole, role, isAuthenticated } = useAuth();

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
              The <strong>Google OR-Tools Municipal Fleet Enforcement & Sprinkler Dispatch</strong> portal is strictly restricted to verified Municipal Officers (GHMC Environmental Wing) and Central System Administrators. Use the Sign in control in the header with your provisioned staff credentials.
            </p>
            <div className="officer-gate-actions">
              <div className="officer-gate-login-hint">
                <Lock size={16} />
                <span>
                  {isAuthenticated
                    ? `Signed in as ${role.replace('_', ' ')} — this role cannot open Enforce.`
                    : 'Sign in from the header as a city officer or admin to unlock this page.'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
