import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import type { RouteStop, Station, District } from '../types/index';
import { computeDistricts } from '../data/districts';

export const CARTO_DARK_MATTER_STYLE =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

interface DarkMapProps {
  city: string;
  stations: Station[];
  routeStops: RouteStop[];
  selectedStop: RouteStop | null;
  onSelectStop?: (stop: RouteStop) => void;
}

const CITY_COORDS: Record<string, [number, number]> = {
  Delhi: [77.2090, 28.6139],
  Hyderabad: [78.4867, 17.3850],
  Guwahati: [91.7362, 26.1444],
};

/**
 * Renders a line segment between two projected points using a rotated/scaled View.
 * This avoids needing react-native-svg which requires a native build.
 */
const RouteLine: React.FC<{
  from: { left: number; top: number };
  to: { left: number; top: number };
  color?: string;
  dashed?: boolean;
  thickness?: number;
}> = ({ from, to, color = '#3B82F6', dashed = false, thickness = 2 }) => {
  const dx = to.left - from.left;
  const dy = to.top - from.top;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  if (length < 1) return null;

  if (dashed) {
    // Render dashed line as a series of small segments
    const dashLength = 6;
    const gapLength = 4;
    const segments: React.ReactNode[] = [];
    let offset = 0;
    let segIndex = 0;

    while (offset < length) {
      const segLen = Math.min(dashLength, length - offset);
      const segLeft = from.left + (dx / length) * offset;
      const segTop = from.top + (dy / length) * offset;

      segments.push(
        <View
          key={`dash-${segIndex}`}
          style={{
            position: 'absolute',
            left: segLeft,
            top: segTop - thickness / 2,
            width: segLen,
            height: thickness,
            backgroundColor: color,
            borderRadius: thickness / 2,
            transform: [{ rotate: `${angle}deg` }],
            transformOrigin: 'left center',
            opacity: 0.85,
          }}
        />
      );
      offset += dashLength + gapLength;
      segIndex++;
    }

    return <>{segments}</>;
  }

  return (
    <View
      style={{
        position: 'absolute',
        left: from.left,
        top: from.top - thickness / 2,
        width: length,
        height: thickness,
        backgroundColor: color,
        borderRadius: thickness / 2,
        transform: [{ rotate: `${angle}deg` }],
        transformOrigin: 'left center',
        opacity: 0.7,
      }}
    />
  );
};

export const DarkMap: React.FC<DarkMapProps> = ({
  city,
  stations = [],
  routeStops = [],
  selectedStop,
  onSelectStop,
}) => {
  const width = Dimensions.get('window').width - 32;
  const height = 280;

  const centerCoord = CITY_COORDS[city] || CITY_COORDS.Delhi;
  const safeStations = Array.isArray(stations) ? stations : [];
  const safeRouteStops = Array.isArray(routeStops) ? routeStops : [];
  const districts: District[] = computeDistricts(city, safeStations);

  const lats = safeStations.map((s) => s.lat).filter((v) => typeof v === 'number');
  const lons = safeStations.map((s) => s.lon).filter((v) => typeof v === 'number');

  const minLat = lats.length ? Math.min(...lats) - 0.03 : 28.5;
  const maxLat = lats.length ? Math.max(...lats) + 0.03 : 28.8;
  const minLon = lons.length ? Math.min(...lons) - 0.03 : 77.0;
  const maxLon = lons.length ? Math.max(...lons) + 0.04 : 77.4;

  const project = (lat: number, lon: number) => {
    const x = ((lon - minLon) / (maxLon - minLon || 0.001)) * (width - 50) + 15;
    const y = ((maxLat - lat) / (maxLat - minLat || 0.001)) * (height - 60) + 15;
    return {
      left: Math.max(8, Math.min(width - 40, x)),
      top: Math.max(8, Math.min(height - 40, y)),
    };
  };

  const depotPos = project(centerCoord[1], centerCoord[0]);

  const getAqiColor = (aqi: number) => {
    if (aqi > 300) return '#ef4444';
    if (aqi > 200) return '#f97316';
    if (aqi > 100) return '#eab308';
    return '#22c55e';
  };

  // Build the route path: Depot → Stop 1 → Stop 2 → ... → Stop N
  const routePoints: Array<{ left: number; top: number }> = [];
  if (safeRouteStops.length > 0) {
    routePoints.push(depotPos); // Start from depot
    for (const stop of safeRouteStops) {
      routePoints.push(project(stop.lat, stop.lon));
    }
  }

  return (
    <View style={styles.container}>
      {/* Map Header */}
      <View style={styles.mapHeader}>
        <View style={styles.badgeRow}>
          <View style={styles.liveDot} />
          <Text style={styles.headerText}>MapLibre • CARTO Dark Matter</Text>
        </View>
        <Text style={styles.coordSub}>
          {city} • {districts.length > 0 ? `${districts.length} Districts` : ''} ({safeStations.length} Monitored Wards)
        </Text>
      </View>

      {/* Tactical Canvas Container */}
      <View style={[styles.canvasArea, { width, height }]}>
        <View style={[styles.gridHLine, { top: '25%' }]} />
        <View style={[styles.gridHLine, { top: '50%' }]} />
        <View style={[styles.gridHLine, { top: '75%' }]} />
        <View style={[styles.gridVLine, { left: '25%' }]} />
        <View style={[styles.gridVLine, { left: '50%' }]} />
        <View style={[styles.gridVLine, { left: '75%' }]} />

        {/* District Ambient Cells */}
        {districts.slice(0, 8).map((d, i) => {
          const pos = project(d.centroid[1], d.centroid[0]);
          return (
            <View
              key={d.id || i}
              style={[
                styles.districtZone,
                {
                  left: pos.left - 25,
                  top: pos.top - 25,
                  backgroundColor: getAqiColor(d.aqi) + '18',
                  borderColor: getAqiColor(d.aqi) + '40',
                },
              ]}
            >
              <Text style={styles.districtNameTag} numberOfLines={1}>
                {d.name}
              </Text>
            </View>
          );
        })}

        {/* ━━━ OR-Tools Optimized Route Polyline ━━━ */}
        {routePoints.length >= 2 &&
          routePoints.map((point, idx) => {
            if (idx === 0) return null; // skip first, we draw from prev→current
            const prevPoint = routePoints[idx - 1];
            return (
              <RouteLine
                key={`route-seg-${idx}`}
                from={prevPoint}
                to={point}
                color="#3B82F6"
                dashed={true}
                thickness={2}
              />
            );
          })}

        {/* Monitored Station Nodes */}
        {safeStations.map((st) => {
          const pos = project(st.lat, st.lon);
          const color = getAqiColor(st.aqi);
          return (
            <View key={st.id} style={[styles.stationNode, { left: pos.left, top: pos.top }]}>
              <View style={[styles.stationHalo, { backgroundColor: color + '30' }]} />
              <View style={[styles.stationDot, { backgroundColor: color }]} />
            </View>
          );
        })}

        {/* Central Dispatch Depot */}
        <View style={[styles.depotMarker, { left: depotPos.left, top: depotPos.top }]}>
          <View style={styles.depotBox}>
            <Text style={styles.depotText}>DEPOT</Text>
          </View>
        </View>

        {/* Numbered Priority Route Stops */}
        {safeRouteStops.map((stop, index) => {
          const pos = project(stop.lat, stop.lon);
          const isSelected = selectedStop?.source_id === stop.source_id;
          const stopColor = stop.action === 'FULL_INSPECTION' ? '#ef4444' : '#f59e0b';

          return (
            <TouchableOpacity
              key={stop.source_id || `stop-${index}`}
              style={[styles.stopMarker, { left: pos.left - 10, top: pos.top - 12 }]}
              onPress={() => onSelectStop && onSelectStop(stop)}
              activeOpacity={0.8}
            >
              {isSelected && (
                <View style={[styles.selectedPulse, { backgroundColor: stopColor + '40' }]} />
              )}
              <View style={[styles.stopPin, { backgroundColor: stopColor }]}>
                <Text style={styles.stopPinNum}>{index + 1}</Text>
              </View>
              <View style={styles.stopNameTag}>
                <Text style={styles.stopNameText} numberOfLines={1}>
                  {stop.stationName || `Stop #${index + 1}`}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Map Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.legendText}>Depot</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>Full Inspection</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
          <Text style={styles.legendText}>Verify First</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.legendText}>OR-Tools Route</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0e1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
    marginBottom: 16,
  },
  mapHeader: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  headerText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  coordSub: {
    color: '#64748b',
    fontSize: 10.5,
    marginTop: 2,
  },
  canvasArea: {
    backgroundColor: '#0d131f',
    position: 'relative',
    overflow: 'hidden',
  },
  gridHLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#1c273c',
  },
  gridVLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#1c273c',
  },
  districtZone: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  districtNameTag: {
    color: '#94a3b8',
    fontSize: 8,
    fontWeight: '600',
    opacity: 0.8,
  },
  stationNode: {
    position: 'absolute',
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationHalo: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  stationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  depotMarker: {
    position: 'absolute',
    zIndex: 10,
  },
  depotBox: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  depotText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  stopMarker: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 20,
  },
  selectedPulse: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  stopPin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  stopPinNum: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  stopNameTag: {
    backgroundColor: '#090d16cc',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginTop: 2,
    maxWidth: 70,
  },
  stopNameText: {
    color: '#f1f5f9',
    fontSize: 8.5,
    fontWeight: '700',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    backgroundColor: '#080c14',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLine: {
    width: 14,
    height: 3,
    borderRadius: 2,
  },
  legendText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
});
export default DarkMap;
