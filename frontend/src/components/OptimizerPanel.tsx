'use client';
import React, { useState } from 'react';
import { enforcementRoutes, optimizerSummary, EnforcementRoute } from '@/data/mockRoutes';



export default function OptimizerPanel() {
  const [liveRoute, setLiveRoute] = React.useState<any>(null);
  const [liveConnection, setLiveConnection] = React.useState<boolean>(false);

  React.useEffect(() => {
    fetch('http://127.0.0.1:8000/optimize')
      .then(res => res.json())
      .then(data => {
        setLiveRoute(data);
        setLiveConnection(true);
      })
      .catch(err => {
        console.error('Failed to fetch live optimized route:', err);
        setLiveConnection(false);
      });
  }, []);

  const processedLiveRoute = liveRoute ? {
    route_id: liveRoute.route_id,
    vehicle_type: 'inspector' as const,
    vehicle_label: 'Live Optimized Inspector Route (OR-Tools)',
    total_time_min: 30, // Default duration estimation
    stops: liveRoute.stops.map((stop: any) => ({
      source_id: stop.source_id,
      ward_name: stop.source_id === 'S01' ? 'Anand Vihar (Live)' : 'Vivek Vihar (Live)',
      lat: stop.lat,
      lon: stop.lon,
      eta: stop.eta,
      action: stop.action,
      source_type: 'vehicular',
      confidence: 0.92,
      set_size: 1,
      severity: 350,
      population_exposed: 185000,
      roi: stop.roi,
      estimated_aqi_reduction: 18.0,
      compliance_cost: 12000.0,
      legal_basis: 'GRAP Stage III, §4.2'
    }))
  } : null;

  const [expandedRoute, setExpandedRoute] = useState<string | null>(enforcementRoutes[0]?.route_id ?? null);

  const displayRoutes = processedLiveRoute 
    ? [processedLiveRoute, ...enforcementRoutes] 
    : enforcementRoutes;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Live API Status Badge */}
      {liveConnection && processedLiveRoute && (
        <div style={{ padding: '8px 12px', background: 'rgba(56, 139, 253, 0.05)', borderRadius: 8, border: '1px dashed var(--accent-green)', fontSize: '0.72rem', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="dot live" style={{ width: 8, height: 8, background: 'var(--accent-green)', borderRadius: '50%', display: 'inline-block' }}></span>
          Live Router Engine Connected (OR-Tools VRP Solver Active)
        </div>
      )}

      {/* Summary Bar */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">OR-Tools CVRPTW Solver</div>
          <div className="panel-badge badge-purple">{optimizerSummary.solve_time_ms}ms</div>
        </div>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-card-value" style={{ color: 'var(--accent-blue)' }}>{processedLiveRoute ? optimizerSummary.sources_scheduled + 1 : optimizerSummary.sources_scheduled}</div>
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
      {displayRoutes.map((route) => (
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
