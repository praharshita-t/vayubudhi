'use client';
import React, { useState } from 'react';
import { enforcementRoutes, optimizerSummary, EnforcementRoute } from '@/data/mockRoutes';

const vehicleIcons: Record<string, string> = {
  inspector: '👤',
  drone: '🛸',
  van: '🚐',
};

export default function OptimizerPanel() {
  const [expandedRoute, setExpandedRoute] = useState<string | null>(enforcementRoutes[0]?.route_id ?? null);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Summary Bar */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">OR-Tools CVRPTW Solver</div>
          <div className="panel-badge badge-purple">{optimizerSummary.solve_time_ms}ms</div>
        </div>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-card-value" style={{ color: 'var(--accent-blue)' }}>{optimizerSummary.sources_scheduled}</div>
            <div className="metric-card-label">Dispatched</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-value" style={{ color: 'var(--accent-amber)' }}>{optimizerSummary.sources_monitoring}</div>
            <div className="metric-card-label">Monitoring</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-value" style={{ color: 'var(--accent-green)' }}>{(optimizerSummary.total_population_covered / 1000).toFixed(0)}k</div>
            <div className="metric-card-label">Pop. Covered</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-value" style={{ color: 'var(--accent-cyan)' }}>{optimizerSummary.avg_roi}x</div>
            <div className="metric-card-label">Avg ROI</div>
          </div>
        </div>
      </div>

      {/* Route Cards */}
      {enforcementRoutes.map((route) => (
        <RouteCard
          key={route.route_id}
          route={route}
          expanded={expandedRoute === route.route_id}
          onToggle={() => setExpandedRoute(expandedRoute === route.route_id ? null : route.route_id)}
        />
      ))}
    </div>
  );
}

function RouteCard({ route, expanded, onToggle }: {
  route: EnforcementRoute;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="route-card" onClick={onToggle}>
      <div className="route-card-header">
        <div className="route-vehicle">
          <span>{vehicleIcons[route.vehicle_type] || '📍'}</span>
          <span>{route.vehicle_label}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="panel-badge badge-blue">{route.stops.length} stops</span>
          <span className="panel-badge badge-amber">{route.total_time_min}m</span>
        </div>
      </div>

      {expanded && (
        <div className="route-stops slide-in">
          {route.stops.map((stop, i) => (
            <div key={i} className={`stop-item ${stop.set_size === 1 ? 'high-conf' : 'low-conf'}`}>
              <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: 36 }}>
                {stop.eta}
              </div>
              <div className="stop-info">
                <div className="stop-ward">{stop.ward_name}</div>
                <div className="stop-meta">
                  {stop.source_type} • {(stop.confidence * 100).toFixed(0)}% conf • {stop.action.replace('_', ' ')}
                </div>
                <div className="stop-tags">
                  <span className="tag badge-green">ROI: {stop.roi}x</span>
                  <span className="tag badge-blue">↓{stop.estimated_aqi_reduction} µg/m³</span>
                  <span className="tag badge-amber">{(stop.population_exposed / 1000).toFixed(0)}k pop</span>
                  <span className="tag badge-purple">₹{(stop.compliance_cost / 1000).toFixed(0)}k</span>
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 3, fontStyle: 'italic' }}>
                  {stop.legal_basis}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
