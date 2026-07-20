/**
 * Delhi NCT Revenue Districts — real boundary polygons from OpenStreetMap + IDW AQI.
 * Boundaries sourced from OSM via Overpass API (admin_level=5 within Delhi).
 * Simplified with Douglas-Peucker for performance.
 */
import { delhiStations } from './mockStations';
import districtGeoData from './delhiDistrictsGeo.json';

export interface District {
  id: string;
  name: string;
  polygon: [number, number][]; // closed ring of [lon, lat]
  centroid: [number, number];
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  co: number;
  o3: number;
}

// ── Inverse-distance weighting to compute per-district values ──
function idwForDistrict(centroid: [number, number]): Omit<District, 'id' | 'name' | 'polygon' | 'centroid'> {
  const [cLon, cLat] = centroid;
  let wSum = 0;
  let aqiS = 0, pm25S = 0, pm10S = 0, no2S = 0, so2S = 0, coS = 0, o3S = 0;

  for (const s of delhiStations) {
    const dx = (s.lon - cLon) * 85;
    const dy = (s.lat - cLat) * 111;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.01) {
      return { aqi: s.aqi, pm25: s.pm25, pm10: s.pm10, no2: s.no2, so2: s.so2, co: s.co, o3: s.o3 };
    }
    const w = 1 / Math.pow(dist, 2);
    wSum += w;
    aqiS += w * s.aqi;
    pm25S += w * s.pm25;
    pm10S += w * s.pm10;
    no2S += w * s.no2;
    so2S += w * s.so2;
    coS += w * s.co;
    o3S += w * s.o3;
  }

  return {
    aqi: Math.round(aqiS / wSum),
    pm25: Math.round(pm25S / wSum),
    pm10: Math.round(pm10S / wSum),
    no2: Math.round(no2S / wSum),
    so2: Math.round(so2S / wSum),
    co: Math.round((coS / wSum) * 10) / 10,
    o3: Math.round(o3S / wSum),
  };
}

export const delhiDistricts: District[] = districtGeoData.map((d: any) => {
  const values = idwForDistrict(d.centroid as [number, number]);
  return {
    id: d.id,
    name: d.name,
    polygon: d.polygon as [number, number][],
    centroid: d.centroid as [number, number],
    ...values,
  };
});
