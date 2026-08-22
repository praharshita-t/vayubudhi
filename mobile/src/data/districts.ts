import type { District, Station } from '../types/index';

const delhiGeoDataRaw = require('./delhiDistrictsGeo.json');
const hyderabadGeoDataRaw = require('./hyderabadDistrictsGeo.json');
const bengaluruGeoDataRaw = require('./bengaluruDistrictsGeo.json');
const guwahatiGeoDataRaw = require('./guwahatiDistrictsGeo.json');
const hyderabadDistrictsRawData = require('./hyderabad_districts.json');

function ensureArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.default)) return data.default;
  return [];
}

export const hyderabadDistrictsRaw: any[] = ensureArray(hyderabadDistrictsRawData);

function idwForDistrict(centroid: [number, number], stations: Station[]): Omit<District, 'id' | 'name' | 'polygon' | 'centroid'> {
  if (!centroid || !Array.isArray(centroid) || centroid.length < 2) {
    return { aqi: 0, pm25: 0, pm10: 0, no2: 0, so2: 0, co: 0, o3: 0, temp: 30, humidity: 50, pressure: 1010, wind_speed: 2, pblh: 800 };
  }

  const [cLon, cLat] = centroid;
  let wSum = 0;
  let aqiS = 0, pm25S = 0, pm10S = 0, no2S = 0, so2S = 0, coS = 0, o3S = 0;
  let tempS = 0, humS = 0, pressS = 0, windS = 0, pblhS = 0;

  const safeStations = Array.isArray(stations) ? stations : [];
  if (safeStations.length === 0) {
    return { aqi: 0, pm25: 0, pm10: 0, no2: 0, so2: 0, co: 0, o3: 0, temp: 30, humidity: 50, pressure: 1010, wind_speed: 2, pblh: 800 };
  }

  for (const s of safeStations) {
    if (!s || typeof s.lon !== 'number' || typeof s.lat !== 'number') continue;
    const dx = (s.lon - cLon) * 85;
    const dy = (s.lat - cLat) * 111;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.01) {
      return { 
        aqi: s.aqi || 0, pm25: s.pm25 || 0, pm10: s.pm10 || 0, no2: s.no2 || 40, so2: s.so2 || 12, co: s.co || 1.5, o3: s.o3 || 30,
        temp: s.temp || 30, humidity: s.humidity || 50, pressure: s.pressure || 1010, wind_speed: s.wind_speed || 2, pblh: s.pblh || 800
      };
    }
    const w = 1 / Math.pow(dist, 2);
    wSum += w;
    aqiS += w * (s.aqi || 0);
    pm25S += w * (s.pm25 || 0);
    pm10S += w * (s.pm10 || 0);
    no2S += w * (s.no2 || 40);
    so2S += w * (s.so2 || 12);
    coS += w * (s.co || 1.5);
    o3S += w * (s.o3 || 30);
    tempS += w * (s.temp || 30);
    humS += w * (s.humidity || 50);
    pressS += w * (s.pressure || 1010);
    windS += w * (s.wind_speed || 2);
    pblhS += w * (s.pblh || 800);
  }

  const denominator = wSum > 0 ? wSum : 1;

  return {
    aqi: Math.round(aqiS / denominator),
    pm25: Math.round(pm25S / denominator),
    pm10: Math.round(pm10S / denominator),
    no2: Math.round(no2S / denominator),
    so2: Math.round(so2S / denominator),
    co: Math.round((coS / denominator) * 10) / 10,
    o3: Math.round(o3S / denominator),
    temp: Math.round((tempS / denominator) * 10) / 10,
    humidity: Math.round(humS / denominator),
    pressure: Math.round(pressS / denominator),
    wind_speed: Math.round((windS / denominator) * 10) / 10,
    pblh: Math.round(pblhS / denominator),
  };
}

export function computeDistricts(city: string, stations: Station[]): District[] {
  let raw: any = null;
  if (city === 'Delhi') raw = delhiGeoDataRaw;
  else if (city === 'Hyderabad') raw = hyderabadGeoDataRaw;
  else if (city === 'Bengaluru') raw = bengaluruGeoDataRaw;
  else if (city === 'Guwahati') raw = guwahatiGeoDataRaw;
  else return [];

  const geoData = ensureArray(raw);
  if (!geoData || geoData.length === 0) return [];

  return geoData.map((d: any) => {
    const centroid = (d && d.centroid) ? (d.centroid as [number, number]) : [77.2090, 28.6139] as [number, number];
    const values = idwForDistrict(centroid, stations);
    return {
      id: (d && d.id) ? d.id : 'D_0',
      name: (d && d.name) ? d.name : 'District',
      polygon: (d && d.polygon) ? (d.polygon as [number, number][]) : [],
      centroid,
      ...values,
    };
  });
}

/**
 * Standard Ray-casting point-in-polygon test.
 * @param point [lon, lat]
 * @param polygon array of [lon, lat] vertices
 */
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  if (!polygon || polygon.length < 3) return false;
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export type SpatialTelemetry = Omit<District, 'polygon' | 'centroid'> & {
  districtName?: string;
  districtId?: string;
};

/**
 * Finds spatial AQI and telemetry at a specific geographic coordinate [lat, lon]
 * using the existing heatmap polygon coverage and underlying IDW interpolation.
 */
export function getSpatialDataAtCoordinate(
  lat: number,
  lon: number,
  districts: District[] = [],
  stations: Station[] = []
): SpatialTelemetry | null {
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
    return null;
  }

  const safeDistricts = Array.isArray(districts) ? districts : [];
  const safeStations = Array.isArray(stations) ? stations : [];

  // 1. Check if the coordinate falls inside any heatmap district polygon
  for (const dist of safeDistricts) {
    if (dist.polygon && dist.polygon.length >= 3) {
      if (isPointInPolygon([lon, lat], dist.polygon)) {
        return {
          id: dist.id,
          name: dist.name,
          districtId: dist.id,
          districtName: dist.name,
          aqi: dist.aqi,
          pm25: dist.pm25,
          pm10: dist.pm10,
          no2: dist.no2,
          so2: dist.so2,
          co: dist.co,
          o3: dist.o3,
          temp: dist.temp,
          humidity: dist.humidity,
          pressure: dist.pressure,
          wind_speed: dist.wind_speed,
          pblh: dist.pblh,
        };
      }
    }
  }

  // 2. If outside all polygons but districts exist, find the nearest district centroid
  if (safeDistricts.length > 0) {
    let closestDist: District | null = null;
    let minDistance = Infinity;

    for (const dist of safeDistricts) {
      if (dist.centroid && Array.isArray(dist.centroid) && dist.centroid.length >= 2) {
        const dx = (dist.centroid[0] - lon) * 85;
        const dy = (dist.centroid[1] - lat) * 111;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < minDistance) {
          minDistance = d;
          closestDist = dist;
        }
      }
    }

    if (closestDist && minDistance < 60) {
      return {
        id: closestDist.id,
        name: closestDist.name,
        districtId: closestDist.id,
        districtName: closestDist.name,
        aqi: closestDist.aqi,
        pm25: closestDist.pm25,
        pm10: closestDist.pm10,
        no2: closestDist.no2,
        so2: closestDist.so2,
        co: closestDist.co,
        o3: closestDist.o3,
        temp: closestDist.temp,
        humidity: closestDist.humidity,
        pressure: closestDist.pressure,
        wind_speed: closestDist.wind_speed,
        pblh: closestDist.pblh,
      };
    }
  }

  // 3. If stations exist, compute spatial IDW at this exact coordinate
  if (safeStations.length > 0) {
    const interpolated = idwForDistrict([lon, lat], safeStations);
    if (interpolated && typeof interpolated.aqi === 'number' && interpolated.aqi > 0) {
      return {
        id: 'SPATIAL_INTERPOLATED',
        name: 'Spatial Grid',
        ...interpolated,
      };
    }
  }

  return null;
}

/**
 * Returns the AQI corresponding to the geographic position from the heatmap/spatial data.
 * Returns null if no spatial data is available.
 */
export function getAQIAtCoordinate(
  lat: number,
  lon: number,
  districts: District[] = [],
  stations: Station[] = []
): number | null {
  const data = getSpatialDataAtCoordinate(lat, lon, districts, stations);
  return data && typeof data.aqi === 'number' ? data.aqi : null;
}

