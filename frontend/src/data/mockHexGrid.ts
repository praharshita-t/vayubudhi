/**
 * Generate a dense grid of synthetic AQI data points across Delhi NCR.
 * Uses inverse-distance-weighting (IDW) from the 20 real stations
 * to produce ~600 points that fill the city for 3D hex visualization.
 */
import { delhiStations } from './mockStations';

export interface HexDataPoint {
  lat: number;
  lon: number;
  aqi: number;
  pm25: number;
}

// Delhi bounding box
const DELHI_BOUNDS = { minLat: 28.42, maxLat: 28.82, minLon: 76.90, maxLon: 77.42, cx: 77.17, cy: 28.62, rx: 0.22, ry: 0.18 };
// Mumbai bounding box (approx)
const MUMBAI_BOUNDS = { minLat: 18.85, maxLat: 19.30, minLon: 72.75, maxLon: 73.00, cx: 72.85, cy: 19.08, rx: 0.15, ry: 0.20 };
// Bengaluru bounding box (approx)
const BLR_BOUNDS = { minLat: 12.80, maxLat: 13.15, minLon: 77.45, maxLon: 77.75, cx: 77.59, cy: 12.97, rx: 0.15, ry: 0.15 };

import { cityStations } from './mockStations';

// Inverse Distance Weighting interpolation
function idwInterpolate(lat: number, lon: number, stations: any[], power: number = 2): { aqi: number; pm25: number } {
  let wSum = 0;
  let aqiSum = 0;
  let pm25Sum = 0;

  for (const s of stations) {
    const dx = (s.lon - lon) * 85; 
    const dy = (s.lat - lat) * 111;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.01) return { aqi: s.aqi, pm25: s.pm25 };

    const w = 1 / Math.pow(dist, power);
    wSum += w;
    aqiSum += w * s.aqi;
    pm25Sum += w * s.pm25;
  }

  return {
    aqi: Math.round(aqiSum / wSum),
    pm25: Math.round(pm25Sum / wSum),
  };
}

function isInsideEllipse(lat: number, lon: number, bounds: any): boolean {
  const dx = (lon - bounds.cx) / bounds.rx;
  const dy = (lat - bounds.cy) / bounds.ry;
  return (dx * dx + dy * dy) <= 1.0;
}

export function generateHexGridData(city: string): HexDataPoint[] {
  const points: HexDataPoint[] = [];
  const step = 0.024; // ~2.6km grid spacing
  
  let bounds = DELHI_BOUNDS;
  if (city === 'Mumbai') bounds = MUMBAI_BOUNDS;
  if (city === 'Bengaluru') bounds = BLR_BOUNDS;
  
  const stations = cityStations[city] || cityStations['Delhi'];

  for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += step) {
    const rowOffset = (Math.round((lat - bounds.minLat) / step) % 2 === 0) ? 0 : step / 2;
    for (let lon = bounds.minLon + rowOffset; lon <= bounds.maxLon; lon += step) {
      if (!isInsideEllipse(lat, lon, bounds)) continue;

      const { aqi, pm25 } = idwInterpolate(lat, lon, stations);
      const noisyAqi = Math.max(20, aqi + Math.round((Math.random() - 0.5) * 30));

      points.push({ lat, lon, aqi: noisyAqi, pm25 });
    }
  }

  return points;
}

export const hexGridDataDelhi = generateHexGridData('Delhi');
export const hexGridDataMumbai = generateHexGridData('Mumbai');
export const hexGridDataBlr = generateHexGridData('Bengaluru');

export const cityHexGridData: Record<string, HexDataPoint[]> = {
  'Delhi': hexGridDataDelhi,
  'Mumbai': hexGridDataMumbai,
  'Bengaluru': hexGridDataBlr,
};
