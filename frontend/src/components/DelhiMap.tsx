'use client';
import React, { useState, useMemo, useCallback } from 'react';
import { delhiStations, getAqiCategory, Station } from '@/data/mockStations';
import { hexGridData, HexDataPoint } from '@/data/mockHexGrid';

// deck.gl imports
import DeckGL from '@deck.gl/react';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ColumnLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { LightingEffect, AmbientLight, DirectionalLight } from '@deck.gl/core';

const DELHI_CENTER = { longitude: 77.17, latitude: 28.62 };

const INITIAL_VIEW_STATE = {
  longitude: DELHI_CENTER.longitude,
  latitude: DELHI_CENTER.latitude,
  zoom: 11,
  pitch: 55,
  bearing: -20,
  minZoom: 9,
  maxZoom: 15,
};

// AQI → Color mapping (green → yellow → orange → red)
function aqiToColor(aqi: number): [number, number, number, number] {
  if (aqi <= 50)  return [34, 197, 94, 220];     // green
  if (aqi <= 100) return [132, 204, 22, 220];     // lime
  if (aqi <= 150) return [234, 179, 8, 220];      // yellow
  if (aqi <= 200) return [245, 158, 11, 220];     // amber
  if (aqi <= 250) return [249, 115, 22, 220];     // orange
  if (aqi <= 300) return [239, 68, 68, 220];      // red
  if (aqi <= 400) return [220, 38, 38, 230];      // dark red
  return [185, 28, 28, 240];                       // deep red
}

// AQI → Height (exponential curve for dramatic visual contrast)
function aqiToHeight(aqi: number): number {
  // Normalize AQI to 0-1 range (capped at 500)
  const t = Math.min(aqi, 500) / 500;
  // Exponential curve: low AQI = very short, high AQI = towering
  return 50 + Math.pow(t, 2.2) * 6000;
}

export default function DelhiMap({ alertStation }: { alertStation?: Station | null }) {
  const [hoveredHex, setHoveredHex] = useState<HexDataPoint | null>(null);
  const [hoveredStation, setHoveredStation] = useState<Station | null>(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);

  // Lighting setup for 3D columns
  const lightingEffect = useMemo(() => {
    const ambientLight = new AmbientLight({ color: [255, 255, 255], intensity: 1.2 });
    const dirLight = new DirectionalLight({
      color: [255, 255, 255],
      intensity: 2.0,
      direction: [-3, -9, -1],
    });
    return new LightingEffect({ ambientLight, dirLight });
  }, []);

  // Handle fly-to on alert
  React.useEffect(() => {
    if (!alertStation) return;
    setViewState((prev: typeof INITIAL_VIEW_STATE) => ({
      ...prev,
      longitude: alertStation.lon,
      latitude: alertStation.lat,
      zoom: 13,
      pitch: 55,
      transitionDuration: 1500,
    }));
  }, [alertStation]);

  // Build deck.gl layers
  const layers = useMemo(() => {
    // Layer 1: 3D Hexagonal Columns (the main visual)
    const columnLayer = new ColumnLayer<HexDataPoint>({
      id: 'aqi-columns',
      data: hexGridData,
      diskResolution: 6,           // 6 sides = hexagon
      radius: 900,                 // hex radius in meters
      extruded: true,
      pickable: true,
      elevationScale: 1,
      getPosition: (d: HexDataPoint) => [d.lon, d.lat],
      getFillColor: (d: HexDataPoint) => aqiToColor(d.aqi),
      getElevation: (d: HexDataPoint) => aqiToHeight(d.aqi),
      material: {
        ambient: 0.45,
        diffuse: 0.6,
        shininess: 40,
        specularColor: [60, 64, 70],
      },
      transitions: {
        getElevation: { duration: 800 },
        getFillColor: { duration: 800 },
      },
      onHover: (info: any) => setHoveredHex(info.object || null),
    });

    // Layer 2: Station marker dots (glowing rings)
    const stationGlowLayer = new ScatterplotLayer<Station>({
      id: 'station-glow',
      data: delhiStations,
      pickable: false,
      opacity: 0.25,
      stroked: false,
      filled: true,
      radiusMinPixels: 12,
      radiusMaxPixels: 30,
      getPosition: (d: Station) => [d.lon, d.lat, aqiToHeight(d.aqi) + 50],
      getFillColor: (d: Station) => {
        if (d.source === 'iot') return [57, 210, 192, 80];
        const c = aqiToColor(d.aqi);
        return [c[0], c[1], c[2], 60];
      },
      getRadius: (d: Station) => d.source === 'iot' ? 600 : 400,
    });

    // Layer 3: Station core dots
    const stationDotLayer = new ScatterplotLayer<Station>({
      id: 'station-dots',
      data: delhiStations,
      pickable: true,
      opacity: 1,
      stroked: true,
      filled: true,
      radiusMinPixels: 4,
      radiusMaxPixels: 10,
      lineWidthMinPixels: 1,
      getPosition: (d: Station) => [d.lon, d.lat, aqiToHeight(d.aqi) + 50],
      getFillColor: (d: Station) => {
        if (d.source === 'iot') return [57, 210, 192, 255];
        return aqiToColor(d.aqi);
      },
      getLineColor: [255, 255, 255, 100],
      getRadius: (d: Station) => d.source === 'iot' ? 350 : 200,
      onHover: (info: any) => setHoveredStation(info.object || null),
    });

    // Layer 4: Station name labels
    const labelLayer = new TextLayer<Station>({
      id: 'station-labels',
      data: delhiStations.filter(s => s.source === 'iot' || s.status === 'alert'),
      pickable: false,
      getPosition: (d: Station) => [d.lon, d.lat, aqiToHeight(d.aqi) + 200],
      getText: (d: Station) => d.source === 'iot' ? `IoT ● ${d.aqi}` : d.name,
      getSize: 11,
      getColor: (d: Station) => d.source === 'iot' ? [57, 210, 192, 255] : [230, 237, 243, 200],
      getTextAnchor: 'middle' as const,
      getAlignmentBaseline: 'bottom' as const,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 600,
      outlineWidth: 2,
      outlineColor: [6, 8, 15, 200],
      billboard: true,
    });

    // Layer 5: Alert pulse ring
    const alertLayers: any[] = [];
    if (alertStation) {
      alertLayers.push(
        new ScatterplotLayer({
          id: 'alert-pulse',
          data: [alertStation],
          pickable: false,
          opacity: 0.5,
          stroked: true,
          filled: false,
          radiusMinPixels: 20,
          radiusMaxPixels: 50,
          lineWidthMinPixels: 2,
          getPosition: (d: any) => [d.lon, d.lat, aqiToHeight(d.aqi) + 100],
          getLineColor: [248, 81, 73, 200],
          getRadius: 800,
        })
      );
    }

    return [columnLayer, stationGlowLayer, stationDotLayer, labelLayer, ...alertLayers];
  }, [alertStation]);

  const onViewStateChange = useCallback(({ viewState: vs }: any) => {
    setViewState(vs);
  }, []);

  // Tooltip
  const tooltip = hoveredHex || hoveredStation;
  const tooltipData = hoveredStation
    ? { name: hoveredStation.name, aqi: hoveredStation.aqi, pm25: hoveredStation.pm25, type: hoveredStation.source === 'iot' ? 'IoT Sensor' : 'CAAQMS' }
    : hoveredHex
      ? { name: 'Grid Cell', aqi: hoveredHex.aqi, pm25: hoveredHex.pm25, type: 'Interpolated' }
      : null;

  return (
    <div className="map-container" style={{ position: 'relative', background: '#080c14' }}>
      <DeckGL
        viewState={viewState}
        onViewStateChange={onViewStateChange}
        controller={true}
        layers={layers}
        effects={[lightingEffect]}
        style={{ width: '100%', height: '100%' }}
        getTooltip={() => null}
      >
        <Map
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        />
      </DeckGL>

      {/* Overlay Stats */}
      <div className="map-overlay-stats">
        <div className="map-stat-chip">
          Stations Online: <span className="chip-value">{delhiStations.filter(s => s.status !== 'offline').length}</span>
        </div>
        <div className="map-stat-chip">
          Alerts Active: <span className="chip-value" style={{ color: 'var(--accent-red)' }}>{delhiStations.filter(s => s.status === 'alert').length}</span>
        </div>
        <div className="map-stat-chip">
          Hex Cells: <span className="chip-value" style={{ color: 'var(--accent-cyan)' }}>{hexGridData.length}</span>
        </div>
      </div>

      {/* Color Legend */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12, zIndex: 5,
        background: 'rgba(13,17,23,0.88)', backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
      }}>
        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          AQI Density
        </div>
        <div style={{ display: 'flex', gap: 0, height: 10, borderRadius: 3, overflow: 'hidden', width: 140 }}>
          {['#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444', '#dc2626'].map((c, i) => (
            <div key={i} style={{ flex: 1, background: c }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: '0.55rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          <span>0</span>
          <span>150</span>
          <span>300+</span>
        </div>
      </div>

      {/* Legend icons */}
      <div className="map-legend">
        <div className="legend-item"><div className="legend-dot" style={{ background: '#22c55e' }} />Good</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#f59e0b' }} />Moderate</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#ef4444' }} />Severe</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--accent-cyan)', boxShadow: '0 0 6px var(--accent-cyan)' }} />IoT</div>
      </div>

      {/* Hover tooltip */}
      {tooltipData && (
        <div style={{
          position: 'absolute', bottom: 80, right: 12,
          background: 'rgba(13,17,23,0.92)', backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)',
          padding: '10px 14px', zIndex: 10, minWidth: 180,
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: 4 }}>{tooltipData.name}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4 }}>{tooltipData.type}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            AQI: <span style={{ color: getAqiCategory(tooltipData.aqi).color, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{tooltipData.aqi}</span>
            {' '}• PM2.5: <span style={{ fontFamily: 'var(--font-mono)' }}>{tooltipData.pm25}</span>
          </div>
        </div>
      )}
    </div>
  );
}
