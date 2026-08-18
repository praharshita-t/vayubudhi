import type { RoadRoutePlan, RouteSegment, RouteStop } from '../types/index';

/**
 * Service to calculate real road-following navigation routes using OSRM (Open Source Routing Machine)
 * with robust local fallback for offline/air-gapped operations.
 */

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';
const REQUEST_TIMEOUT_MS = 6000;

interface OSRMRouteResponse {
  code: string;
  routes?: Array<{
    geometry: {
      coordinates: [number, number][]; // [lon, lat]
      type: string;
    };
    distance: number; // meters
    duration: number; // seconds
  }>;
}

/**
 * Fetches road-following geometry between two coordinate points via OSRM.
 */
export async function fetchRoadSegment(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  fromName: string = 'Origin',
  toName: string = 'Destination'
): Promise<{
  geometry: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  isFallback: boolean;
}> {
  const url = `${OSRM_BASE_URL}/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OSRM HTTP status ${response.status}`);
    }

    const data: OSRMRouteResponse = await response.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const primary = data.routes[0];
      return {
        geometry: primary.geometry.coordinates,
        distanceMeters: primary.distance,
        durationSeconds: primary.duration,
        isFallback: false,
      };
    } else {
      throw new Error(`OSRM return code: ${data.code}`);
    }
  } catch (error) {
    console.warn(`[RoutingService] OSRM fetch failed for ${fromName} -> ${toName}, using direct fallback:`, error);
    return computeFallbackDirectSegment(startLat, startLon, endLat, endLon);
  }
}

/**
 * Builds the complete multi-stop road enforcement route.
 * Follows: Depot -> Stop 1 -> Stop 2 -> Stop 3 -> Stop 4 -> Stop 5
 */
export async function buildRoadEnforcementPlan(
  cityName: string,
  depot: { name: string; lat: number; lon: number },
  orderedStops: RouteStop[]
): Promise<RoadRoutePlan> {
  if (!orderedStops || orderedStops.length === 0) {
    return {
      routeId: `plan_${Date.now()}`,
      cityName,
      depot,
      stops: [],
      segments: [],
      fullGeometry: [[depot.lon, depot.lat]],
      totalDistanceKm: 0,
      totalDurationMin: 0,
      isRoadFollowing: true,
    };
  }

  const segments: RouteSegment[] = [];
  let combinedGeometry: [number, number][] = [];
  let totalMeters = 0;
  let totalSeconds = 0;
  let hasAnyFallback = false;

  // 1. First segment: Depot -> Priority 1
  const firstStop = orderedStops[0];
  const leg0 = await fetchRoadSegment(
    depot.lat,
    depot.lon,
    firstStop.lat,
    firstStop.lon,
    depot.name,
    firstStop.stationName || 'Priority 1'
  );

  if (leg0.isFallback) hasAnyFallback = true;
  totalMeters += leg0.distanceMeters;
  totalSeconds += leg0.durationSeconds;
  combinedGeometry = combinedGeometry.concat(leg0.geometry);

  segments.push({
    fromId: 'DEPOT',
    toId: firstStop.source_id || 'STOP_1',
    fromName: depot.name,
    toName: firstStop.stationName || 'Priority 1',
    distanceMeters: leg0.distanceMeters,
    durationSeconds: leg0.durationSeconds,
    distanceFormatted: formatDistance(leg0.distanceMeters),
    durationFormatted: formatDuration(leg0.durationSeconds),
    geometry: leg0.geometry,
    isFallback: leg0.isFallback,
  });

  // Enrich first stop with distance from depot
  const enrichedStops: RouteStop[] = [{
    ...firstStop,
    distanceFromPrev: formatDistance(leg0.distanceMeters),
    durationFromPrev: formatDuration(leg0.durationSeconds),
  }];

  // 2. Subsequent segments: Stop (i) -> Stop (i + 1)
  for (let i = 0; i < orderedStops.length - 1; i++) {
    const fromStop = orderedStops[i];
    const toStop = orderedStops[i + 1];

    const leg = await fetchRoadSegment(
      fromStop.lat,
      fromStop.lon,
      toStop.lat,
      toStop.lon,
      fromStop.stationName || `Stop #${i + 1}`,
      toStop.stationName || `Stop #${i + 2}`
    );

    if (leg.isFallback) hasAnyFallback = true;
    totalMeters += leg.distanceMeters;
    totalSeconds += leg.durationSeconds;
    // Skip duplicate connecting point
    combinedGeometry = combinedGeometry.concat(leg.geometry.slice(1));

    segments.push({
      fromId: fromStop.source_id || `STOP_${i + 1}`,
      toId: toStop.source_id || `STOP_${i + 2}`,
      fromName: fromStop.stationName || `Priority #${i + 1}`,
      toName: toStop.stationName || `Priority #${i + 2}`,
      distanceMeters: leg.distanceMeters,
      durationSeconds: leg.durationSeconds,
      distanceFormatted: formatDistance(leg.distanceMeters),
      durationFormatted: formatDuration(leg.durationSeconds),
      geometry: leg.geometry,
      isFallback: leg.isFallback,
    });

    enrichedStops.push({
      ...toStop,
      distanceFromPrev: formatDistance(leg.distanceMeters),
      durationFromPrev: formatDuration(leg.durationSeconds),
    });
  }

  const totalDistanceKm = parseFloat((totalMeters / 1000).toFixed(1));
  const totalDurationMin = Math.round(totalSeconds / 60);

  return {
    routeId: `enforcement_route_${cityName.toLowerCase()}_${Date.now().toString().slice(-4)}`,
    cityName,
    depot,
    stops: enrichedStops,
    segments,
    fullGeometry: combinedGeometry,
    totalDistanceKm,
    totalDurationMin,
    highestPriorityStop: enrichedStops[0],
    isRoadFollowing: !hasAnyFallback,
  };
}

/**
 * Fallback geometry using Haversine calculation and urban speed estimate (25 km/h).
 */
function computeFallbackDirectSegment(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): {
  geometry: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  isFallback: boolean;
} {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const directDistance = R * c;

  // Road distance is typically 1.3x Euclidean in cities
  const estimatedRoadMeters = directDistance * 1.32;
  // Estimated urban average speed: 25 km/h = 6.94 m/s
  const durationSec = Math.round(estimatedRoadMeters / 6.94);

  // Generate 5 intermediate points for smooth curve rendering
  const coords: [number, number][] = [];
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps;
    const lat = lat1 + (lat2 - lat1) * frac;
    const lon = lon1 + (lon2 - lon1) * frac;
    coords.push([lon, lat]);
  }

  return {
    geometry: coords,
    distanceMeters: estimatedRoadMeters,
    durationSeconds: durationSec,
    isFallback: true,
  };
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours}h ${remainMins}m`;
  }
  return `${Math.max(1, mins)} min`;
}
