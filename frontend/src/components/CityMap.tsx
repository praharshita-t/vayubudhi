'use client';
import React, { useState, useMemo, useCallback } from 'react';
import { getAqiCategory } from '@/utils/aqi';
import { Station } from '@/app/page';
import { computeDelhiDistricts, District } from '@/data/delhiDistricts';
import { computeHyderabadDistricts, computeGuwahatiDistricts } from '@/data/otherDistricts';

export interface HexDataPoint {
  lat: number;
  lon: number;
  aqi: number;
  pm25: number;
}

// deck.gl imports
import DeckGL from '@deck.gl/react';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ColumnLayer, PolygonLayer, ScatterplotLayer, TextLayer, BitmapLayer } from '@deck.gl/layers';

const CITY_CENTERS: Record<string, {longitude: number, latitude: number, zoom: number}> = {
  'Delhi': { longitude: 77.17, latitude: 28.62, zoom: 11 },
  'Mumbai': { longitude: 72.85, latitude: 19.08, zoom: 10.5 },
  'Bengaluru': { longitude: 77.59, latitude: 12.97, zoom: 11 },
  'Hyderabad': { longitude: 78.48, latitude: 17.38, zoom: 11 },
  'Guwahati': { longitude: 91.73, latitude: 26.14, zoom: 11 },
};

const getInitialViewState = (city: string, userCoords?: { lat: number, lon: number } | null) => {
  if (city === 'My Location' && userCoords) {
    return {
      longitude: userCoords.lon,
      latitude: userCoords.lat,
      zoom: 12,
      pitch: 55,
      bearing: -20,
      minZoom: 9,
      maxZoom: 15,
    };
  }
  const center = CITY_CENTERS[city] || CITY_CENTERS['Delhi'];
  return {
    longitude: center.longitude,
    latitude: center.latitude,
    zoom: center.zoom,
    pitch: 55,
    bearing: -20,
    minZoom: 9,
    maxZoom: 15,
  };
};

// AQI → Color mapping with reduced alpha for translucent overlay
function aqiToColor(aqi: number, alpha: number = 120): [number, number, number, number] {
  if (aqi <= 50)  return [34, 197, 94, alpha];      // green
  if (aqi <= 100) return [132, 204, 22, alpha];      // lime
  if (aqi <= 150) return [234, 179, 8, alpha];       // yellow
  if (aqi <= 200) return [245, 158, 11, alpha];      // amber
  if (aqi <= 250) return [249, 115, 22, alpha];      // orange
  if (aqi <= 300) return [239, 68, 68, alpha];       // red
  if (aqi <= 400) return [220, 38, 38, alpha];       // dark red
  return [185, 28, 28, alpha];                       // deep red
}

function aqiToHeight(aqi: number): number {
  return Math.max(50, aqi * 15);
}

export default function CityMap({ 
  alertStation, 
  city = 'Delhi', 
  userCoords, 
  liveData, 
  cityData,
  liveLoading,
  onHover,
  onClick,
  selectedDistrictId,
  onDistrictsComputed,
  monitoringLocation
}: { 
  alertStation?: Station | null, 
  city?: string, 
  userCoords?: { lat: number, lon: number } | null, 
  liveData?: any, 
  cityData?: any,
  liveLoading?: boolean,
  onHover?: (data: any) => void,
  onClick?: (data: any) => void,
  selectedDistrictId?: string | null,
  onDistrictsComputed?: (districts: any[]) => void,
  monitoringLocation?: { lat: number; lon: number; name?: string } | null
}) {
  const [hoveredHex, setHoveredHex] = useState<HexDataPoint | null>(null);
  const [hoveredDistrict, setHoveredDistrict] = useState<District | null>(null);
  const [hoveredStation, setHoveredStation] = useState<Station | null>(null);
  const [viewState, setViewState] = useState(getInitialViewState(city, userCoords));
  const [showSatellite, setShowSatellite] = useState(false);

  const stations = useMemo(() => {
    if (city === 'My Location' && liveData) {
      return [{
        id: 'USER_GPS',
        name: 'My Location',
        lat: userCoords?.lat ?? 0,
        lon: userCoords?.lon ?? 0,
        pm25: liveData.reading.pm25,
        pm10: liveData.reading.pm10,
        no2: 40, so2: 12, co: 1.5, o3: 30,
        aqi: liveData.live_aqi,
        source: 'iot' as const,
        status: 'online' as const
      }];
    }
    return cityData ? cityData.stations : [];
  }, [city, liveData, cityData, userCoords]);

  const dynamicDistricts = useMemo(() => {
    if (city === 'Delhi') return computeDelhiDistricts(stations);
    if (city === 'Hyderabad') return computeHyderabadDistricts(stations);
    if (city === 'Guwahati') return computeGuwahatiDistricts(stations);
    return [];
  }, [city, stations]);

  React.useEffect(() => {
    if (onDistrictsComputed) {
      onDistrictsComputed(dynamicDistricts);
    }
  }, [dynamicDistricts, onDistrictsComputed]);

  const hexGrid = useMemo(() => {
    if (city === 'My Location' && liveData) {
      return liveData.hex_grid;
    }
    return cityData ? cityData.stations : [];
  }, [city, liveData, cityData]);

  // Handle fly-to on city or coords change
  React.useEffect(() => {
    setViewState((prev: any) => ({
      ...prev,
      ...getInitialViewState(city, userCoords),
      transitionDuration: 1500,
    }));
  }, [city, userCoords]);

  // Handle fly-to on alert
  React.useEffect(() => {
    if (!alertStation) return;
    setViewState((prev: any) => ({
      ...prev,
      longitude: alertStation.lon,
      latitude: alertStation.lat,
      zoom: 13,
      pitch: 0,
      transitionDuration: 1500,
    }));
  }, [alertStation, city]);

  // Build deck.gl layers
  const layers = useMemo(() => {
    // Layer 0: Sentinel-5P NO2 GeoTIFF
    const satelliteLayer = new BitmapLayer({
      id: 'sentinel-no2-layer',
      bounds: [76.84, 28.40, 77.35, 28.88], // Delhi bounding box
      image: '/sentinel_no2.png',
      transparentColor: [0, 0, 0, 0],
      opacity: showSatellite && city === 'Delhi' ? 0.7 : 0,
      transitions: { opacity: 500 }
    });

    // Layer 1: 3D Hexagonal Columns (fallback for cities without districts)
    const columnLayer = new ColumnLayer<HexDataPoint>({
      id: 'aqi-columns',
      data: dynamicDistricts.length === 0 ? hexGrid : [],
      diskResolution: 6,           // 6 sides = hexagon
      radius: 900,                 // hex radius in meters
      extruded: true,
      pickable: true,
      elevationScale: 1,
      getPosition: (d: HexDataPoint) => [d.lon, d.lat],
      getFillColor: (d: HexDataPoint) => aqiToColor(d.aqi, 220),
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

    // Layer 1: District boundary polygons
    const districtLayer = new PolygonLayer<District>({
      id: 'district-polygons',
      data: dynamicDistricts,
      pickable: true,
      stroked: true,
      filled: true,
      extruded: false,
      wireframe: false,
      lineWidthMinPixels: 1.5,
      getPolygon: (d: District) => d.polygon,
      getFillColor: (d: District) => {
        const isSelected = selectedDistrictId === d.id;
        const isHovered = hoveredDistrict && hoveredDistrict.id === d.id;
        
        // Dim unselected districts if a selection exists
        let alpha = 100;
        if (selectedDistrictId && !isSelected) {
          alpha = 20; // dim drastically
        } else if (isHovered || isSelected) {
          alpha = 180; // bright for hover or selected
        }
        
        return aqiToColor(d.aqi, alpha);
      },
      getLineColor: (d: District) => {
        const isSelected = selectedDistrictId === d.id;
        return isSelected ? [255, 255, 255, 200] : [200, 210, 220, 100];
      },
      getLineWidth: (d: District) => (selectedDistrictId === d.id ? 4 : 2),
      updateTriggers: {
        getFillColor: [hoveredDistrict?.id, selectedDistrictId],
        getLineColor: [selectedDistrictId],
        getLineWidth: [selectedDistrictId],
      },
      onHover: (info: any) => setHoveredDistrict(info.object || null),
      onClick: (info: any) => {
        if (info.object && onClick) {
          onClick({ ...info.object, type: 'District' });
          setViewState((prev: any) => ({
            ...prev,
            longitude: info.object.centroid[0],
            latitude: info.object.centroid[1],
            zoom: 12.5,
            pitch: 30,
            transitionDuration: 1200,
          }));
        } else if (!info.object && onClick) {
          onClick(null); // Clear selection when clicking off
        }
      },
      transitions: {
        getFillColor: { duration: 400 },
      },
    });

    // Layer 2: Station glow rings
    const stationGlowLayer = new ScatterplotLayer<Station>({
      id: 'station-glow',
      data: stations,
      pickable: false,
      opacity: 0.25,
      stroked: false,
      filled: true,
      radiusMinPixels: 10,
      radiusMaxPixels: 24,
      getPosition: (d: Station) => [d.lon, d.lat],
      getFillColor: (d: Station) => {
        if (d.source === 'iot') return [57, 210, 192, 80];
        const c = aqiToColor(d.aqi, 220);
        return [c[0], c[1], c[2], 60];
      },
      getRadius: (d: Station) => d.source === 'iot' ? 500 : 300,
    });

    // Helper to determine dominant pollution cause for distinct colored dots
    const getCauseColor = (d: Station): [number, number, number, number] => {
      if (d.source === 'iot') return [57, 210, 192, 255]; // IoT sensors stay cyan
      
      // Calculate a normalized score for each cause based on typical unhealthy thresholds
      const trafficScore = (d.no2 / 80) + (d.co / 2.0); // NO2 and CO
      const industryScore = (d.so2 / 40) + (d.pm25 / 60); // SO2 and fine PM
      const dustScore = (d.pm10 / 100); // Coarse PM
      
      const maxScore = Math.max(trafficScore, industryScore, dustScore);
      
      if (maxScore < 0.3) {
        // Very clean air, default to AQI color (green)
        return aqiToColor(d.aqi, 255);
      }
      
      if (maxScore === trafficScore) {
        return [239, 68, 68, 255]; // Traffic -> Red
      } else if (maxScore === industryScore) {
        return [168, 85, 247, 255]; // Industry -> Purple
      } else {
        return [234, 179, 8, 255]; // Dust -> Yellow
      }
    };

    // Layer 3: Station core dots (Distinct colors for pollution causes)
    const stationDotLayer = new ScatterplotLayer<Station>({
      id: 'station-dots',
      data: stations,
      pickable: true,
      opacity: 1,
      stroked: true,
      filled: true,
      radiusMinPixels: 5,
      radiusMaxPixels: 10,
      lineWidthMinPixels: 2,
      getPosition: (d: Station) => [d.lon, d.lat],
      getFillColor: getCauseColor,
      getLineColor: [255, 255, 255, 120] as [number, number, number, number],
      getRadius: (d: Station) => d.source === 'iot' ? 350 : 200,
      onHover: (info: any) => setHoveredStation(info.object || null),
    });

    // Layer 4: Station name labels (IoT + alert stations only)
    const labelLayer = new TextLayer<Station>({
      id: 'station-labels',
      data: stations.filter((s: Station) => s.source === 'iot' || s.status === 'alert'),
      pickable: false,
      getPosition: (d: Station) => [d.lon, d.lat],
      getText: (d: Station) => d.source === 'iot' ? `IoT  ${d.aqi}` : d.name,
      getSize: 11,
      getColor: (d: Station) => d.source === 'iot' ? [57, 210, 192, 255] : [230, 237, 243, 200],
      getTextAnchor: 'middle' as const,
      getAlignmentBaseline: 'bottom' as const,
      getPixelOffset: [0, -14],
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
          getPosition: (d: any) => [d.lon, d.lat],
          getLineColor: [248, 81, 73, 200],
          getRadius: 800,
        })
      );
    }

    // Layer 6: Single Blue Portable IoT Sensor Deployment Marker
    const monitoringLayers: any[] = [];
    if (monitoringLocation) {
      monitoringLayers.push(
        new ScatterplotLayer({
          id: 'monitoring-deployment-marker',
          data: [monitoringLocation],
          pickable: true,
          opacity: 0.9,
          stroked: true,
          filled: true,
          radiusMinPixels: 9,
          radiusMaxPixels: 15,
          lineWidthMinPixels: 3,
          getPosition: (d: any) => [d.lon, d.lat],
          getFillColor: [59, 130, 246, 240], // Bright Blue (#3B82F6)
          getLineColor: [255, 255, 255, 255], // White border
          getRadius: 400,
        }),
        new TextLayer({
          id: 'monitoring-deployment-label',
          data: [monitoringLocation],
          pickable: false,
          getPosition: (d: any) => [d.lon, d.lat],
          getText: (d: any) => `📡 Deploy Sensor: ${d.name || ''}`,
          getSize: 12,
          getColor: [59, 130, 246, 255],
          getTextAnchor: 'middle' as const,
          getAlignmentBaseline: 'bottom' as const,
          getPixelOffset: [0, -18],
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 700,
          outlineWidth: 3,
          outlineColor: [6, 8, 15, 240],
          billboard: true,
        })
      );
    }

    if (dynamicDistricts.length > 0) {
      return [satelliteLayer, districtLayer, stationGlowLayer, stationDotLayer, labelLayer, ...alertLayers, ...monitoringLayers];
    } else {
      return [satelliteLayer, columnLayer, stationGlowLayer, stationDotLayer, labelLayer, ...alertLayers, ...monitoringLayers];
    }
  }, [alertStation, stations, hexGrid, city, hoveredDistrict, dynamicDistricts, showSatellite, monitoringLocation]);

  const onViewStateChange = useCallback(({ viewState: vs }: any) => {
    setViewState(vs);
  }, []);

  // Build tooltip data
  const tooltipData = hoveredDistrict
    ? {
        name: hoveredDistrict.name,
        aqi: hoveredDistrict.aqi,
        pm25: hoveredDistrict.pm25,
        pm10: hoveredDistrict.pm10,
        no2: hoveredDistrict.no2,
        so2: hoveredDistrict.so2,
        co: hoveredDistrict.co,
        o3: hoveredDistrict.o3,
        temp: hoveredDistrict.temp,
        humidity: hoveredDistrict.humidity,
        pressure: hoveredDistrict.pressure,
        wind_speed: hoveredDistrict.wind_speed,
        pblh: hoveredDistrict.pblh,
        type: 'District',
      }
    : hoveredStation
      ? {
          name: hoveredStation.name,
          aqi: hoveredStation.aqi,
          pm25: hoveredStation.pm25,
          pm10: hoveredStation.pm10,
          no2: hoveredStation.no2,
          so2: hoveredStation.so2,
          co: hoveredStation.co,
          o3: hoveredStation.o3,
          temp: (hoveredStation as any).temp,
          humidity: (hoveredStation as any).humidity,
          pressure: (hoveredStation as any).pressure,
          wind_speed: (hoveredStation as any).wind_speed,
          pblh: (hoveredStation as any).pblh,
          type: hoveredStation.source === 'iot' ? 'IoT Sensor' : 'CAAQMS Station',
        }
      : null;

  const tooltipCat = tooltipData ? getAqiCategory(tooltipData.aqi) : null;

  React.useEffect(() => {
    if (onHover) {
      onHover(tooltipData);
    }
  }, [tooltipData, onHover]);

  return (
    <div className="map-container" style={{ position: 'relative', background: '#080c14' }}>
      <DeckGL
        viewState={viewState}
        onViewStateChange={onViewStateChange}
        controller={true}
        layers={layers}
        style={{ width: '100%', height: '100%' }}
        getTooltip={() => null}
      >
        <Map
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        />
      </DeckGL>

      {/* Overlay Stats & Satellite Toggle */}
      <div className="map-overlay-stats">
        {city === 'Delhi' && (
          <button 
            className={`map-stat-chip ${showSatellite ? 'active' : ''}`}
            onClick={() => setShowSatellite(!showSatellite)}
            style={{ 
              cursor: 'pointer', 
              border: showSatellite ? '1px solid var(--accent-cyan)' : '1px solid var(--border-primary)',
              background: showSatellite ? 'rgba(57,210,192,0.1)' : 'rgba(13,17,23,0.88)'
            }}
          >
            Sentinel-5P NO₂: <span className="chip-value" style={{ color: showSatellite ? 'var(--accent-cyan)' : 'inherit' }}>{showSatellite ? 'ON' : 'OFF'}</span>
          </button>
        )}
        <div className="map-stat-chip">
          Stations Online: <span className="chip-value">{stations.filter((s: Station) => s.status !== 'offline').length}</span>
        </div>
        <div className="map-stat-chip">
          Alerts Active: <span className="chip-value" style={{ color: 'var(--accent-red)' }}>{stations.filter((s: Station) => s.status === 'alert').length}</span>
        </div>
        <div className="map-stat-chip">
          {dynamicDistricts.length > 0 ? (
            <>Districts: <span className="chip-value" style={{ color: 'var(--accent-cyan)' }}>{dynamicDistricts.length}</span></>
          ) : (
            <>Hex Cells: <span className="chip-value" style={{ color: 'var(--accent-cyan)' }}>{hexGrid.length}</span></>
          )}
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
          AQI Severity
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

      {/* Map Legend for Station Dots */}
      <div className="map-legend">
        <div className="legend-item"><div className="legend-dot" style={{ background: '#ef4444' }} />Traffic (NO2)</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#a855f7' }} />Industry (SO2)</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#eab308' }} />Dust (PM10)</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--accent-cyan)', boxShadow: '0 0 6px var(--accent-cyan)' }} />IoT Sensor</div>
      </div>

      {/* Hover tooltip — detailed district/station info */}
      {tooltipData && tooltipCat && (
        <div style={{
          position: 'absolute', bottom: 80, right: 12,
          background: 'rgba(13,17,23,0.94)', backdropFilter: 'blur(14px)',
          border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)',
          padding: '12px 16px', zIndex: 10, minWidth: 220, maxWidth: 280,
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 2 }}>{tooltipData.name}</div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tooltipData.type}</div>

          {/* AQI banner */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
            padding: '6px 10px', borderRadius: 'var(--radius-sm)',
            background: tooltipCat.bg, border: `1px solid ${tooltipCat.color}30`,
          }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: tooltipCat.color }}>{tooltipData.aqi}</span>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: tooltipCat.color }}>{tooltipCat.label}</div>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>Air Quality Index</div>
            </div>
          </div>

          {/* Pollutant grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
            {[
              { label: 'PM2.5', value: tooltipData.pm25, unit: 'µg/m³' },
              { label: 'PM10', value: tooltipData.pm10, unit: 'µg/m³' },
              { label: 'NO₂', value: tooltipData.no2, unit: 'ppb' },
              { label: 'SO₂', value: tooltipData.so2, unit: 'ppb' },
              { label: 'CO', value: tooltipData.co, unit: 'mg/m³' },
              { label: 'O₃', value: tooltipData.o3, unit: 'ppb' },
            ].map((p) => (
              <div key={p.label} style={{
                padding: '4px 6px', background: 'var(--bg-elevated)', borderRadius: 4,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{p.value}</div>
                <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
