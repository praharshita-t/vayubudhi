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
const BOUNDS = {
  minLat: 28.42,
  maxLat: 28.82,
  minLon: 76.90,
  maxLon: 77.42,
};

// Inverse Distance Weighting interpolation
function idwInterpolate(lat: number, lon: number, power: number = 2): { aqi: number; pm25: number } {
  let wSum = 0;
  let aqiSum = 0;
  let pm25Sum = 0;

  for (const s of delhiStations) {
    const dx = (s.lon - lon) * 85; // rough km conversion at Delhi's latitude
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

// Check if a point is roughly inside Delhi NCT boundary (ellipse approximation)
function isInsideDelhi(lat: number, lon: number): boolean {
  const cx = 77.17;
  const cy = 28.62;
  const rx = 0.22;
  const ry = 0.18;
  const dx = (lon - cx) / rx;
  const dy = (lat - cy) / ry;
  return (dx * dx + dy * dy) <= 1.0;
}

export function generateHexGridData(): HexDataPoint[] {
  const points: HexDataPoint[] = [];
  const step = 0.024; // ~2.6km grid spacing

  for (let lat = BOUNDS.minLat; lat <= BOUNDS.maxLat; lat += step) {
    // Offset every other row for hex-like packing
    const rowOffset = (Math.round((lat - BOUNDS.minLat) / step) % 2 === 0) ? 0 : step / 2;
    for (let lon = BOUNDS.minLon + rowOffset; lon <= BOUNDS.maxLon; lon += step) {
      if (!isInsideDelhi(lat, lon)) continue;

      const { aqi, pm25 } = idwInterpolate(lat, lon);
      // Add slight random noise for visual variety
      const noisyAqi = Math.max(20, aqi + Math.round((Math.random() - 0.5) * 30));

      points.push({
        lat,
        lon,
        aqi: noisyAqi,
        pm25,
      });
    }
  }

  return points;
}

export const hexGridData = generateHexGridData();
