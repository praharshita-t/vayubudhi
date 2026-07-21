import hyderabadGeoData from './hyderabadDistrictsGeo.json';
import guwahatiGeoData from './guwahatiDistrictsGeo.json';

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
  temp: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  pblh: number;
}

function idwForDistrict(centroid: [number, number], stations: any[]): Omit<District, 'id' | 'name' | 'polygon' | 'centroid'> {
  const [cLon, cLat] = centroid;
  let wSum = 0;
  let aqiS = 0, pm25S = 0, pm10S = 0, no2S = 0, so2S = 0, coS = 0, o3S = 0;
  let tempS = 0, humS = 0, pressS = 0, windS = 0, pblhS = 0;

  if (!stations || stations.length === 0) {
    return { aqi: 0, pm25: 0, pm10: 0, no2: 0, so2: 0, co: 0, o3: 0, temp: 30, humidity: 50, pressure: 1010, wind_speed: 2, pblh: 800 };
  }

  for (const s of stations) {
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

  return {
    aqi: Math.round(aqiS / wSum),
    pm25: Math.round(pm25S / wSum),
    pm10: Math.round(pm10S / wSum),
    no2: Math.round(no2S / wSum),
    so2: Math.round(so2S / wSum),
    co: Math.round((coS / wSum) * 10) / 10,
    o3: Math.round(o3S / wSum),
    temp: Math.round((tempS / wSum) * 10) / 10,
    humidity: Math.round(humS / wSum),
    pressure: Math.round(pressS / wSum),
    wind_speed: Math.round((windS / wSum) * 10) / 10,
    pblh: Math.round(pblhS / wSum),
  };
}

export function computeHyderabadDistricts(stations: any[]): District[] {
  return hyderabadGeoData.map((d: any) => {
    const values = idwForDistrict(d.centroid as [number, number], stations);
    return {
      id: d.id,
      name: d.name,
      polygon: d.polygon as [number, number][],
      centroid: d.centroid as [number, number],
      ...values,
    };
  });
}

export function computeGuwahatiDistricts(stations: any[]): District[] {
  return guwahatiGeoData.map((d: any) => {
    const values = idwForDistrict(d.centroid as [number, number], stations);
    return {
      id: d.id,
      name: d.name,
      polygon: d.polygon as [number, number][],
      centroid: d.centroid as [number, number],
      ...values,
    };
  });
}
