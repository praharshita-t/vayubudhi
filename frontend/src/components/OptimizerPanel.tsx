'use client';
import React, { useState } from 'react';

export interface EnforcementRoute {
  route_id: string;
  vehicle_type: 'inspector' | 'van' | 'drone';
  vehicle_label: string;
  total_time_min: number;
  stops: any[];
}

interface MCDADistrictRecommendation {
  district: any;
  priorityScore: number;
  dominantSource: 'Traffic' | 'Industrial' | 'Dust';
  reason: string;
  benefit: string;
}

interface OptimizerPanelProps {
  city?: string;
  cityData?: any;
  liveData?: any;
  districts?: any[];
  onSetMonitoringLocation?: (loc: { lat: number; lon: number; name?: string } | null) => void;
}

const CITY_DEFAULT_CENTERS: Record<string, { lat: number; lon: number }> = {
  'Delhi': { lat: 28.6139, lon: 77.2090 },
  'Hyderabad': { lat: 17.3850, lon: 78.4867 },
  'Guwahati': { lat: 26.1444, lon: 91.7362 }
};

export default function OptimizerPanel({ city = 'Delhi', cityData, liveData, districts = [], onSetMonitoringLocation }: OptimizerPanelProps) {
  const [mcdaRecommendation, setMcdaRecommendation] = useState<MCDADistrictRecommendation | null>(null);
  const [loadingMonitoring, setLoadingMonitoring] = useState<boolean>(false);

  const [liveRoute, setLiveRoute] = React.useState<any>(null);
  const [liveConnection, setLiveConnection] = React.useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);

  // Execute MCDA analysis ONLY when user clicks the "Monitor" button
  const handleRunMonitorAnalysis = () => {
    setLoadingMonitoring(true);

    if (districts.length === 0) {
      setMcdaRecommendation(null);
      setLoadingMonitoring(false);
      return;
    }

    // Rank districts using Multi-Criteria Decision Analysis (MCDA)
    const scoredDistricts = districts.map((dist: any) => {
      const pm25 = dist.pm25 || 0;
      const pm10 = dist.pm10 || 0;
      const aqi = dist.aqi || 0;
      const no2 = dist.no2 || 0;
      const so2 = dist.so2 || 0;
      const co = dist.co || 0;
      const windSpeed = dist.wind_speed || 2.0;
      const humidity = dist.humidity || 50.0;
      const pblh = dist.pblh || 800.0;

      // 1. Severity sub-score
      const pollutantSeverity = Math.min(100, (aqi / 300.0) * 100.0);

      // 2. Pollution Source sub-scores
      const trafficScore = Math.min(100, (no2 / 80.0) * 50.0 + (co / 2.0) * 50.0);
      const industryScore = Math.min(100, (so2 / 40.0) * 50.0 + (pm25 / 60.0) * 50.0);
      const dustScore = Math.min(100, (pm10 / 100.0) * 100.0);

      const maxSourceScore = Math.max(trafficScore, industryScore, dustScore);
      let dominantSource: 'Traffic' | 'Industrial' | 'Dust' = 'Dust';
      if (maxSourceScore === trafficScore) {
        dominantSource = 'Traffic';
      } else if (maxSourceScore === industryScore) {
        dominantSource = 'Industrial';
      }

      // 3. Stagnation / Micro-climate dispersion sub-score
      const stagnationScore = 0.40 * Math.max(0, 100.0 - windSpeed * 10.0) +
                              0.30 * humidity +
                              0.30 * Math.max(0, 100.0 - (pblh / 1000.0) * 100.0);

      // 4. Combined MCDA priority score
      const priorityScore = roundScore(
        0.40 * pollutantSeverity +
        0.35 * maxSourceScore +
        0.25 * stagnationScore
      );

      // Generate context-aware MCDA reason and benefit
      let reason = '';
      let benefit = '';
      if (dominantSource === 'Traffic') {
        reason = `High vehicular emissions load (NO₂: ${no2.toFixed(0)} µg/m³, CO: ${co.toFixed(1)} mg/m³) combined with atmospheric stagnation (wind speed < ${windSpeed.toFixed(1)} km/h) in ${dist.name}.`;
        benefit = `Enables targeted mobile anti-smog gun triggers and real-time transit congestion alerts.`;
      } else if (dominantSource === 'Industrial') {
        reason = `Elevated chemical indicators (SO₂: ${so2.toFixed(0)} µg/m³, PM2.5: ${pm25.toFixed(0)} µg/m³) and low mixing layer (PBLH: ${pblh.toFixed(0)}m) indicating localized stack accumulation in ${dist.name}.`;
        benefit = `Provides high-precision monitoring validation for industrial zone compliance sweeps.`;
      } else {
        reason = `Heavy coarse particulate concentration (PM10: ${pm10.toFixed(0)} µg/m³, AQI: ${aqi}) coupled with dry/windy stagnation in ${dist.name}.`;
        benefit = `Supports immediate mechanical sweepers and construction water spraying dispatches.`;
      }

      return {
        district: dist,
        priorityScore,
        dominantSource,
        reason,
        benefit
      };
    });

    // Sort by MCDA priority score descending
    scoredDistricts.sort((a, b) => b.priorityScore - a.priorityScore);
    const topScored = scoredDistricts[0];

    setMcdaRecommendation(topScored);

    if (topScored && onSetMonitoringLocation) {
      const defaultCenter = CITY_DEFAULT_CENTERS[city] || { lat: 28.6139, lon: 77.2090 };
      const lat = topScored.district.centroid?.[1] || defaultCenter.lat;
      const lon = topScored.district.centroid?.[0] || defaultCenter.lon;

      onSetMonitoringLocation({
        lat,
        lon,
        name: topScored.district.name
      });
    }

    setLoadingMonitoring(false);
  };

  // Fetch CVRPTW Solver Routes
  React.useEffect(() => {
    let payload = null;
    let baseLat = 28.6139;
    let baseLon = 77.2090;

    if (city === 'My Location' && liveData) {
      baseLat = liveData.reading.lat || baseLat;
      baseLon = liveData.reading.lon || baseLon;
      payload = {
        lat: baseLat,
        lon: baseLon,
        stations: [{
          lat: baseLat,
          lon: baseLon,
          aqi: liveData.forecast.points[0],
          name: "My Location"
        }]
      };
    } else if (cityData && cityData.stations && cityData.stations.length > 0) {
      baseLat = cityData.stations[0].lat;
      baseLon = cityData.stations[0].lon;
      payload = {
        lat: baseLat,
        lon: baseLon,
        stations: cityData.stations.map((s: any) => ({
          lat: s.lat,
          lon: s.lon,
          aqi: s.aqi,
          name: s.name
        }))
      };
    }

    if (!payload) return;

    setLoading(true);
    fetch('http://127.0.0.1:8000/api/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        setLiveRoute(data);
        setLiveConnection(true);
      })
      .catch(err => {
        console.error('Failed to fetch live optimized route:', err);
        setLiveConnection(false);
      })
      .finally(() => setLoading(false));
  }, [city, cityData, liveData]);

  const processedLiveRoute = (liveRoute && liveRoute.stops) ? {
    route_id: liveRoute.route_id,
    vehicle_type: 'inspector' as const,
    vehicle_label: 'Live Optimized Inspector Route (OR-Tools)',
    total_time_min: 30,
    stops: liveRoute.stops.map((stop: any) => {
      let stationName = 'Unknown Location';
      if (stop.source_id !== 'depot') {
        try {
          const idx = parseInt(stop.source_id.split('_')[1]);
          if (city === 'My Location' && liveData) {
            stationName = 'My Location';
          } else if (cityData && cityData.stations[idx]) {
            stationName = cityData.stations[idx].name;
          }
        } catch (e) {
          // ignore
        }
      } else {
        stationName = 'Dispatch Center';
      }

      return {
        source_id: stop.source_id,
        ward_name: stationName,
        lat: stop.lat,
        lon: stop.lon,
        eta: stop.eta,
        action: stop.action,
        source_type: 'vehicular',
        confidence: 0.92,
        set_size: 1,
        severity: stop.roi ? 350 : 0,
        population_exposed: 185000,
        roi: stop.roi,
        estimated_aqi_reduction: 18.0,
        compliance_cost: 12000.0,
        legal_basis: 'GRAP Stage III, §4.2'
      };
    })
  } : null;

  const displayRoutes = processedLiveRoute ? [processedLiveRoute] : [];
  const rec = mcdaRecommendation;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {/* ── SECTION 1: DISTRICT MCDA MONITORING STRATEGY ── */}
      <div className="panel" style={{ borderColor: 'var(--accent-cyan)' }}>
        <div className="panel-header" style={{ marginBottom: 10 }}>
          <div>
            <div className="panel-title" style={{ color: 'var(--accent-cyan)', fontSize: '0.95rem', fontWeight: 700 }}>
              Monitoring Strategy
            </div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
              Multi-Criteria Decision Analysis (MCDA) • Regional IDW Interpolation
            </div>
          </div>
          
          <button
            onClick={handleRunMonitorAnalysis}
            disabled={loadingMonitoring}
            style={{
              background: '#3B82F6',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            <span>📡 Monitor</span>
          </button>
        </div>

        {loadingMonitoring ? (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: 16, textAlign: 'center' }}>
            Evaluating Multi-Criteria Decision Analysis (MCDA) scores for {city} districts...
          </div>
        ) : rec ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            
            {/* Recommendation Highlight Card */}
            <div style={{
              background: 'rgba(13, 17, 23, 0.75)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: 8,
              padding: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#3B82F6', fontWeight: 700 }}>
                    Recommended District Sensor Deployment
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                    📍 {rec.district.name}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <div style={{
                    background: 'rgba(234, 179, 8, 0.15)',
                    color: 'var(--accent-amber)',
                    border: '1px solid var(--accent-amber)',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}>
                    Priority Score: {rec.priorityScore.toFixed(1)} / 100
                  </div>
                  <div style={{
                    background: rec.dominantSource === 'Traffic' ? 'rgba(239,68,68,0.15)' : rec.dominantSource === 'Industrial' ? 'rgba(168,85,247,0.15)' : 'rgba(234,179,8,0.15)',
                    color: rec.dominantSource === 'Traffic' ? '#ef4444' : rec.dominantSource === 'Industrial' ? '#a855f7' : '#eab308',
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontSize: '0.6rem',
                    fontWeight: 700
                  }}>
                    Source: {rec.dominantSource}
                  </div>
                </div>
              </div>

              {/* Grid of Environmental Telemetry Metrics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 4,
                background: 'var(--bg-elevated)',
                padding: 8,
                borderRadius: 6,
                marginBottom: 8,
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.52rem', color: 'var(--text-muted)' }}>AQI</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: rec.district.aqi > 200 ? 'var(--accent-red)' : 'var(--accent-amber)' }}>{rec.district.aqi}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.52rem', color: 'var(--text-muted)' }}>PM2.5</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600 }}>{rec.district.pm25?.toFixed(0) || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.52rem', color: 'var(--text-muted)' }}>PM10</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600 }}>{rec.district.pm10?.toFixed(0) || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.52rem', color: 'var(--text-muted)' }}>Wind</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600 }}>{rec.district.wind_speed?.toFixed(1) || 2.0} km/h</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.52rem', color: 'var(--text-muted)' }}>Humidity</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600 }}>{rec.district.humidity?.toFixed(0) || 50}%</div>
                </div>
              </div>

              {/* Justification & Benefit */}
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <div style={{ marginBottom: 4 }}>
                  <strong style={{ color: 'var(--accent-amber)' }}>Reason:</strong> {rec.reason}
                </div>
                <div>
                  <strong style={{ color: 'var(--accent-green)' }}>Expected Monitoring Benefit:</strong> {rec.benefit}
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: 12, textAlign: 'center' }}>
            Click <strong>Monitor</strong> to rank {city} districts using live map interpolation values.
          </div>
        )}
      </div>

      {/* ── SECTION 2: EXISTING OR-TOOLS CVRPTW SOLVER SECTION ── */}
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
          <div className="panel-badge badge-purple">Live API</div>
        </div>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-card-value" style={{ color: 'var(--accent-blue)' }}>{processedLiveRoute ? processedLiveRoute.stops.length : 0}</div>
            <div className="metric-card-label">Dispatched</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-value" style={{ color: 'var(--accent-amber)' }}>{cityData ? cityData.stations.length : 0}</div>
            <div className="metric-card-label">Monitoring</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-value" style={{ color: 'var(--accent-green)' }}>{(185 * (processedLiveRoute?.stops.length || 0))}k</div>
            <div className="metric-card-label">Pop. Covered</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-value" style={{ color: 'var(--accent-cyan)' }}>
              {processedLiveRoute ? (processedLiveRoute.stops.reduce((s: any, c: any) => s + (c.roi || 0), 0) / processedLiveRoute.stops.length).toFixed(1) : 0}x
            </div>
            <div className="metric-card-label">Avg ROI</div>
          </div>
        </div>
      </div>

      {/* Route Cards */}
      {displayRoutes.length === 0 && !loading && (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No optimal enforcement routes could be determined.
        </div>
      )}
      {loading && (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Computing optimal VRPTW routes using OR-Tools...
        </div>
      )}
      {displayRoutes.map((route) => (
        <RouteCard
          key={route.route_id}
          route={route}
          expanded={expandedRoute === route.route_id || displayRoutes.length === 1}
          onToggle={() => setExpandedRoute(expandedRoute === route.route_id ? null : route.route_id)}
        />
      ))}
    </div>
  );
}

function roundScore(val: number): number {
  return Math.min(99.9, Math.max(10.0, Math.round(val * 10) / 10));
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
