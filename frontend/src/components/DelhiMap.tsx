'use client';
import React, { useEffect, useRef, useState } from 'react';
import { delhiStations, getAqiCategory, Station } from '@/data/mockStations';

const DELHI_CENTER: [number, number] = [77.21, 28.63];
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export default function DelhiMap({ alertStation }: { alertStation?: Station | null }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hoveredStation, setHoveredStation] = useState<Station | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Dynamically import mapbox to avoid SSR issues
    import('mapbox-gl').then((mapboxgl) => {
      if (!MAPBOX_TOKEN) {
        // Render a beautiful fallback map
        setMapReady(true);
        return;
      }

      (mapboxgl as any).accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: mapRef.current!,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: DELHI_CENTER,
        zoom: 11,
        pitch: 45,
        bearing: -15,
        antialias: true,
      });

      map.on('load', () => {
        // Add station markers as a GeoJSON source
        const geojson = {
          type: 'FeatureCollection' as const,
          features: delhiStations.map((s) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [s.lon, s.lat] },
            properties: { id: s.id, name: s.name, aqi: s.aqi, source: s.source, status: s.status },
          })),
        };

        map.addSource('stations', { type: 'geojson', data: geojson });

        // Glow circle layer
        map.addLayer({
          id: 'station-glow',
          type: 'circle',
          source: 'stations',
          paint: {
            'circle-radius': ['case', ['==', ['get', 'source'], 'iot'], 18, 12],
            'circle-color': [
              'interpolate', ['linear'], ['get', 'aqi'],
              50, '#22c55e', 100, '#84cc16', 200, '#f59e0b', 300, '#f97316', 400, '#ef4444',
            ],
            'circle-opacity': 0.15,
            'circle-blur': 1,
          },
        });

        // Core dot layer
        map.addLayer({
          id: 'station-dots',
          type: 'circle',
          source: 'stations',
          paint: {
            'circle-radius': ['case', ['==', ['get', 'source'], 'iot'], 7, 5],
            'circle-color': [
              'interpolate', ['linear'], ['get', 'aqi'],
              50, '#22c55e', 100, '#84cc16', 200, '#f59e0b', 300, '#f97316', 400, '#ef4444',
            ],
            'circle-stroke-width': ['case', ['==', ['get', 'source'], 'iot'], 2, 1],
            'circle-stroke-color': 'rgba(255,255,255,0.3)',
          },
        });

        setMapReady(true);
        mapInstance.current = map;
      });
    });

    return () => {
      if (mapInstance.current) mapInstance.current.remove();
    };
  }, []);

  // Flash alert station when simulation triggers
  useEffect(() => {
    if (!alertStation || !mapInstance.current) return;
    const map = mapInstance.current;
    map.flyTo({ center: [alertStation.lon, alertStation.lat], zoom: 14, pitch: 50, duration: 1500 });
  }, [alertStation]);

  return (
    <div className="map-container">
      <div ref={mapRef} className="map-canvas" style={{ width: '100%', height: '100%' }}>
        {/* Fallback canvas when no Mapbox token */}
        {!MAPBOX_TOKEN && (
          <FallbackMap stations={delhiStations} hoveredStation={hoveredStation} onHover={setHoveredStation} alertStation={alertStation} />
        )}
      </div>

      {/* Overlay Stats */}
      <div className="map-overlay-stats">
        <div className="map-stat-chip">
          Stations Online: <span className="chip-value">{delhiStations.filter(s => s.status !== 'offline').length}</span>
        </div>
        <div className="map-stat-chip">
          Alerts Active: <span className="chip-value" style={{ color: 'var(--accent-red)' }}>{delhiStations.filter(s => s.status === 'alert').length}</span>
        </div>
        <div className="map-stat-chip">
          IoT Nodes: <span className="chip-value" style={{ color: 'var(--accent-cyan)' }}>{delhiStations.filter(s => s.source === 'iot').length}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="map-legend">
        <div className="legend-item"><div className="legend-dot" style={{ background: '#22c55e' }} />Good</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#f59e0b' }} />Moderate</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#ef4444' }} />Severe</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--accent-cyan)', boxShadow: '0 0 6px var(--accent-cyan)' }} />IoT</div>
      </div>

      {/* Hover tooltip */}
      {hoveredStation && (
        <div style={{
          position: 'absolute', bottom: 50, right: 12,
          background: 'rgba(13,17,23,0.92)', backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)',
          padding: '10px 14px', zIndex: 10, minWidth: 180,
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: 4 }}>{hoveredStation.name}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            AQI: <span style={{ color: getAqiCategory(hoveredStation.aqi).color, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{hoveredStation.aqi}</span>
            {' '}• PM2.5: {hoveredStation.pm25} • PM10: {hoveredStation.pm10}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Ratio: {(hoveredStation.pm25 / Math.max(hoveredStation.pm10, 1)).toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Fallback SVG Map (no Mapbox token required) ── */
function FallbackMap({ stations, hoveredStation, onHover, alertStation }: {
  stations: Station[];
  hoveredStation: Station | null;
  onHover: (s: Station | null) => void;
  alertStation?: Station | null;
}) {
  // Project lat/lon to SVG coordinates within Delhi bounding box
  const bounds = { minLat: 28.40, maxLat: 28.85, minLon: 76.85, maxLon: 77.45 };
  const project = (lat: number, lon: number): [number, number] => {
    const x = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * 100;
    const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * 100;
    return [x, y];
  };

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', background: '#0d1117' }}>
      {/* Grid lines */}
      {Array.from({ length: 11 }, (_, i) => (
        <React.Fragment key={`grid-${i}`}>
          <line x1={i * 10} y1={0} x2={i * 10} y2={100} stroke="#1c2333" strokeWidth={0.15} />
          <line x1={0} y1={i * 10} x2={100} y2={i * 10} stroke="#1c2333" strokeWidth={0.15} />
        </React.Fragment>
      ))}
      {/* Delhi boundary approximation */}
      <ellipse cx={50} cy={50} rx={38} ry={42} fill="none" stroke="#21262d" strokeWidth={0.3} strokeDasharray="1,1" />
      {/* Station dots */}
      {stations.map((s) => {
        const [cx, cy] = project(s.lat, s.lon);
        const cat = getAqiCategory(s.aqi);
        const isIoT = s.source === 'iot';
        const isAlert = alertStation?.id === s.id;
        return (
          <g key={s.id}
            onMouseEnter={() => onHover(s)}
            onMouseLeave={() => onHover(null as unknown as Station)}
            style={{ cursor: 'pointer' }}
          >
            {/* Glow */}
            <circle cx={cx} cy={cy} r={isIoT ? 3.5 : 2} fill={cat.color} opacity={0.15} />
            {isAlert && <circle cx={cx} cy={cy} r={5} fill="none" stroke={cat.color} strokeWidth={0.3} opacity={0.6}>
              <animate attributeName="r" from="3" to="7" dur="1.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.8" to="0" dur="1.2s" repeatCount="indefinite" />
            </circle>}
            {/* Core dot */}
            <circle cx={cx} cy={cy} r={isIoT ? 1.2 : 0.8} fill={cat.color} stroke="rgba(255,255,255,0.25)" strokeWidth={0.15} />
            {/* IoT label */}
            {isIoT && (
              <text x={cx + 1.8} y={cy + 0.4} fontSize={1.5} fill="var(--accent-cyan)" fontWeight={600}>IoT</text>
            )}
          </g>
        );
      })}
      {/* Center label */}
      <text x={50} y={96} textAnchor="middle" fontSize={1.8} fill="var(--text-muted)" fontWeight={500}>
        DELHI NCR — {stations.length} Monitoring Stations
      </text>
    </svg>
  );
}
