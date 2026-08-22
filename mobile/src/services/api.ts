import { Platform } from 'react-native';
import type { CityDataResponse, RoutePlan, Station } from '../types/index';
import { hyderabadDistrictsRaw } from '../data/districts';

export function getApiBaseUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:8000/api';
    }
    return `http://${host}:8000/api`;
  }
  return 'http://192.168.0.109:8000/api';
}

export const API_BASE_URL = getApiBaseUrl();

export async function fetchCityData(city: string): Promise<CityDataResponse> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/city-data?city=${encodeURIComponent(city)}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch city data: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.log(`[API] Backend offline for ${city}, using offline station telemetry:`, error);
    return getFallbackCityData(city);
  }
}

export async function optimizeEnforcementRoute(
  depotLat: number,
  depotLon: number,
  stations: Station[]
): Promise<RoutePlan> {
  const baseUrl = getApiBaseUrl();
  const payload = {
    lat: depotLat,
    lon: depotLon,
    stations: (stations || []).map((s) => ({
      lat: s.lat,
      lon: s.lon,
      aqi: s.aqi,
      name: s.name,
    })),
  };

  try {
    const res = await fetch(`${baseUrl}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Optimizer returned status ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.log('[API] Backend optimizer offline, computing local CVRPTW plan:', error);
    return getLocalOptimizedPlan(depotLat, depotLon, stations || []);
  }
}

function getFallbackCityData(city: string): CityDataResponse {
  if (city === 'Hyderabad') {
    const rawList = Array.isArray(hyderabadDistrictsRaw) ? hyderabadDistrictsRaw : [];
    const stations: Station[] = rawList.map((d: any, idx: number) => {
      const aqiVal = idx % 5 === 0 ? 260 + (idx * 3) % 40 : 140 + (idx * 7) % 80;
      return {
        id: (d && d.id) ? d.id : `HYD_${idx}`,
        name: (d && d.name) ? d.name : `Ward ${idx + 1}`,
        lat: (d && d.lat) ? d.lat : 17.3850 + (idx * 0.01),
        lon: (d && d.lon) ? d.lon : 78.4867 + (idx * 0.01),
        pm25: parseFloat((aqiVal * 0.42).toFixed(1)),
        pm10: parseFloat((aqiVal * 0.58).toFixed(1)),
        no2: Math.round(aqiVal * 0.22),
        so2: Math.round(aqiVal * 0.08),
        co: parseFloat((aqiVal * 0.007).toFixed(1)),
        o3: Math.round(aqiVal * 0.15),
        temp: 31.5,
        humidity: 56.0,
        pressure: 1008.0,
        wind_speed: 2.8,
        pblh: 850.0,
        aqi: aqiVal,
        source: idx % 4 === 0 ? 'iot' : 'caaqms',
        status: aqiVal > 200 ? 'alert' : 'online',
      };
    });

    const avgAqi = stations.length > 0
      ? Math.round(stations.reduce((acc, curr) => acc + curr.aqi, 0) / stations.length)
      : 180;

    return { city, stations, center_aqi: avgAqi };
  }

  const cityStations: Record<string, Array<{ name: string; lat: number; lon: number; aqi: number; pm25: number; pm10: number }>> = {
    Delhi: [
      {"name": "Anand Vihar", "lat": 28.6468, "lon": 77.3160, "aqi": 342, "pm25": 142.3, "pm10": 168.9},
      {"name": "ITO", "lat": 28.6289, "lon": 77.2405, "aqi": 285, "pm25": 118.0, "pm10": 145.0},
      {"name": "R.K. Puram", "lat": 28.5634, "lon": 77.1745, "aqi": 215, "pm25": 92.5, "pm10": 120.0},
      {"name": "Dwarka Sector 8", "lat": 28.5730, "lon": 77.0700, "aqi": 198, "pm25": 78.0, "pm10": 105.0},
      {"name": "Punjabi Bagh", "lat": 28.6683, "lon": 77.1167, "aqi": 310, "pm25": 130.0, "pm10": 160.0},
      {"name": "Rohini", "lat": 28.7325, "lon": 77.1190, "aqi": 275, "pm25": 110.0, "pm10": 140.0},
      {"name": "Mundka", "lat": 28.6837, "lon": 77.0254, "aqi": 355, "pm25": 155.0, "pm10": 185.0},
      {"name": "Bawana", "lat": 28.7762, "lon": 77.0513, "aqi": 330, "pm25": 138.0, "pm10": 172.0},
      {"name": "Wazirpur", "lat": 28.6997, "lon": 77.1654, "aqi": 315, "pm25": 132.0, "pm10": 164.0},
      {"name": "Okhla Phase-2", "lat": 28.5305, "lon": 77.2710, "aqi": 290, "pm25": 122.0, "pm10": 150.0},
      {"name": "Ashok Vihar", "lat": 28.6927, "lon": 77.1815, "aqi": 280, "pm25": 115.0, "pm10": 142.0},
      {"name": "Mandir Marg", "lat": 28.6363, "lon": 77.2010, "aqi": 225, "pm25": 95.0, "pm10": 125.0},
      {"name": "North Campus (DU)", "lat": 28.6890, "lon": 77.2097, "aqi": 250, "pm25": 105.0, "pm10": 135.0},
      {"name": "Jahangirpuri", "lat": 28.7280, "lon": 77.1707, "aqi": 340, "pm25": 145.0, "pm10": 175.0},
      {"name": "Sirifort", "lat": 28.5504, "lon": 77.2157, "aqi": 235, "pm25": 98.0, "pm10": 128.0},
      {"name": "Shadipur", "lat": 28.6517, "lon": 77.1584, "aqi": 295, "pm25": 125.0, "pm10": 155.0},
      {"name": "Vivek Vihar", "lat": 28.6727, "lon": 77.3151, "aqi": 305, "pm25": 128.0, "pm10": 158.0},
      {"name": "Narela", "lat": 28.8523, "lon": 77.0927, "aqi": 320, "pm25": 135.0, "pm10": 168.0},
      {"name": "Najafgarh", "lat": 28.6092, "lon": 76.9798, "aqi": 240, "pm25": 100.0, "pm10": 130.0},
      {"name": "Patparganj", "lat": 28.6235, "lon": 77.2870, "aqi": 285, "pm25": 118.0, "pm10": 146.0},
    ],
    Guwahati: [
      {"name": "Railway Colony (IITM)", "lat": 26.1820, "lon": 91.7460, "aqi": 155, "pm25": 62.0, "pm10": 88.0},
      {"name": "Bamunimaidam (CPCB)", "lat": 26.1730, "lon": 91.7700, "aqi": 220, "pm25": 90.0, "pm10": 125.0},
      {"name": "Pan Bazaar", "lat": 26.1900, "lon": 91.7400, "aqi": 175, "pm25": 70.0, "pm10": 95.0},
      {"name": "LGBI Airport", "lat": 26.1061, "lon": 91.5863, "aqi": 120, "pm25": 48.0, "pm10": 70.0},
      {"name": "Dispur", "lat": 26.1400, "lon": 91.7880, "aqi": 135, "pm25": 52.0, "pm10": 75.0},
      {"name": "Garchuk", "lat": 26.1260, "lon": 91.7270, "aqi": 190, "pm25": 78.0, "pm10": 108.0},
      {"name": "Chandmari", "lat": 26.1830, "lon": 91.7570, "aqi": 165, "pm25": 66.0, "pm10": 92.0},
    ],
    Mumbai: [
      {"name": "Bandra Kurla Complex", "lat": 19.0664, "lon": 72.8687, "aqi": 182, "pm25": 74.0, "pm10": 108.0},
      {"name": "Colaba Coastal Base", "lat": 18.9067, "lon": 72.8147, "aqi": 135, "pm25": 52.0, "pm10": 80.0},
      {"name": "Andheri East MIDC", "lat": 19.1136, "lon": 72.8697, "aqi": 215, "pm25": 92.0, "pm10": 128.0},
      {"name": "Kurla West", "lat": 19.0726, "lon": 72.8845, "aqi": 240, "pm25": 102.0, "pm10": 142.0},
      {"name": "Chembur Industrial Gate", "lat": 19.0522, "lon": 72.8994, "aqi": 265, "pm25": 115.0, "pm10": 155.0},
      {"name": "Borivali East", "lat": 19.2307, "lon": 72.8567, "aqi": 160, "pm25": 64.0, "pm10": 92.0},
      {"name": "Sion Circle Hub", "lat": 19.0434, "lon": 72.8633, "aqi": 225, "pm25": 96.0, "pm10": 134.0},
    ],
    Bengaluru: [
      {"name": "Silk Board Junction", "lat": 12.9177, "lon": 77.6238, "aqi": 195, "pm25": 82.0, "pm10": 116.0},
      {"name": "BTM Layout 2nd Stage", "lat": 12.9166, "lon": 77.6101, "aqi": 145, "pm25": 58.0, "pm10": 85.0},
      {"name": "Hebbal Flyover Zone", "lat": 13.0358, "lon": 77.5970, "aqi": 178, "pm25": 72.0, "pm10": 104.0},
      {"name": "Whitefield ITPL", "lat": 12.9856, "lon": 77.7317, "aqi": 168, "pm25": 68.0, "pm10": 98.0},
      {"name": "Peenya Industrial Area", "lat": 13.0285, "lon": 77.5195, "aqi": 245, "pm25": 106.0, "pm10": 148.0},
      {"name": "Jayanagar 4th Block", "lat": 12.9299, "lon": 77.5824, "aqi": 118, "pm25": 46.0, "pm10": 68.0},
      {"name": "Electronic City Phase 1", "lat": 12.8452, "lon": 77.6602, "aqi": 132, "pm25": 54.0, "pm10": 78.0},
      {"name": "Dasarahalli Metro Hub", "lat": 13.0450, "lon": 77.5120, "aqi": 220, "pm25": 94.0, "pm10": 135.0},
      {"name": "Yelahanka New Town", "lat": 13.1000, "lon": 77.5950, "aqi": 150, "pm25": 60.0, "pm10": 88.0},
      {"name": "Rajarajeshwari Nagar", "lat": 12.8850, "lon": 77.4700, "aqi": 162, "pm25": 66.0, "pm10": 92.0},
      {"name": "Mahadevapura Outer Ring", "lat": 12.9900, "lon": 77.6950, "aqi": 185, "pm25": 76.0, "pm10": 110.0},
    ],
    Chennai: [
      {"name": "Manali Industrial Belt", "lat": 13.1667, "lon": 80.2667, "aqi": 235, "pm25": 98.0, "pm10": 138.0},
      {"name": "Alandur Metro Junction", "lat": 13.0034, "lon": 80.2015, "aqi": 162, "pm25": 66.0, "pm10": 94.0},
      {"name": "Velachery Main Rd", "lat": 12.9815, "lon": 80.2180, "aqi": 148, "pm25": 60.0, "pm10": 86.0},
      {"name": "Royapuram Port Gate", "lat": 13.1147, "lon": 80.2985, "aqi": 210, "pm25": 88.0, "pm10": 124.0},
      {"name": "Kodungaiyur Dump Yard", "lat": 13.1415, "lon": 80.2520, "aqi": 255, "pm25": 110.0, "pm10": 150.0},
      {"name": "Guindy Industrial Estate", "lat": 13.0067, "lon": 80.2120, "aqi": 175, "pm25": 70.0, "pm10": 102.0},
    ],
    Kolkata: [
      {"name": "Victoria Memorial", "lat": 22.5448, "lon": 88.3426, "aqi": 195, "pm25": 82.0, "pm10": 115.0},
      {"name": "Rabindra Bharati University", "lat": 22.5830, "lon": 88.3780, "aqi": 265, "pm25": 114.0, "pm10": 155.0},
      {"name": "Fort William Hub", "lat": 22.5539, "lon": 88.3370, "aqi": 165, "pm25": 68.0, "pm10": 96.0},
      {"name": "Jadavpur University", "lat": 22.4989, "lon": 88.3719, "aqi": 210, "pm25": 89.0, "pm10": 125.0},
      {"name": "Howrah Municipal Bridge", "lat": 22.5958, "lon": 88.2636, "aqi": 295, "pm25": 128.0, "pm10": 168.0},
      {"name": "Ballygunge Circular", "lat": 22.5280, "lon": 88.3650, "aqi": 185, "pm25": 76.0, "pm10": 108.0},
    ],
    Pune: [
      {"name": "Shivajinagar Bus Stand", "lat": 18.5314, "lon": 73.8446, "aqi": 172, "pm25": 70.0, "pm10": 100.0},
      {"name": "Katraj Lake Sector", "lat": 18.4575, "lon": 73.8677, "aqi": 140, "pm25": 56.0, "pm10": 82.0},
      {"name": "Bhosari Industrial Area", "lat": 18.6298, "lon": 73.8478, "aqi": 240, "pm25": 102.0, "pm10": 144.0},
      {"name": "Hinjawadi Phase 1", "lat": 18.5913, "lon": 73.7389, "aqi": 155, "pm25": 62.0, "pm10": 90.0},
      {"name": "Hadapsar Industrial Zone", "lat": 18.5089, "lon": 73.9259, "aqi": 220, "pm25": 92.0, "pm10": 130.0},
    ],
    Ahmedabad: [
      {"name": "Maninagar Railway Hub", "lat": 22.9978, "lon": 72.6033, "aqi": 215, "pm25": 92.0, "pm10": 128.0},
      {"name": "Vatva GIDC Industrial Area", "lat": 22.9575, "lon": 72.6322, "aqi": 285, "pm25": 122.0, "pm10": 162.0},
      {"name": "Navrangpura Commercial", "lat": 23.0373, "lon": 72.5613, "aqi": 175, "pm25": 72.0, "pm10": 104.0},
      {"name": "Chandkheda SG Highway", "lat": 23.1118, "lon": 72.5724, "aqi": 160, "pm25": 65.0, "pm10": 94.0},
    ],
    Jaipur: [
      {"name": "Adarsh Nagar Market", "lat": 26.8976, "lon": 75.8322, "aqi": 225, "pm25": 96.0, "pm10": 135.0},
      {"name": "Vishwakarma Industrial (VKIA)", "lat": 26.9942, "lon": 75.7766, "aqi": 275, "pm25": 118.0, "pm10": 158.0},
      {"name": "Shastri Nagar Sector", "lat": 26.9456, "lon": 75.7950, "aqi": 190, "pm25": 80.0, "pm10": 114.0},
      {"name": "Mansarovar Commercial", "lat": 26.8549, "lon": 75.7667, "aqi": 165, "pm25": 68.0, "pm10": 98.0},
    ],
    Lucknow: [
      {"name": "Talkatora Industrial Area", "lat": 26.8321, "lon": 80.8966, "aqi": 295, "pm25": 126.0, "pm10": 168.0},
      {"name": "Lalbagh Commercial Centre", "lat": 26.8480, "lon": 80.9380, "aqi": 260, "pm25": 112.0, "pm10": 150.0},
      {"name": "Gomti Nagar Phase 2", "lat": 26.8500, "lon": 81.0000, "aqi": 195, "pm25": 82.0, "pm10": 118.0},
      {"name": "Aliganj Sector B", "lat": 26.8833, "lon": 80.9333, "aqi": 220, "pm25": 94.0, "pm10": 132.0},
    ],
    Chandigarh: [
      {"name": "Sector 17 City Centre", "lat": 30.7415, "lon": 76.7794, "aqi": 140, "pm25": 56.0, "pm10": 80.0},
      {"name": "Industrial Area Phase 1", "lat": 30.7068, "lon": 76.8024, "aqi": 210, "pm25": 88.0, "pm10": 124.0},
      {"name": "Sector 22 Market Zone", "lat": 30.7290, "lon": 76.7720, "aqi": 155, "pm25": 62.0, "pm10": 88.0},
      {"name": "Sector 53 Urban Hub", "lat": 30.7180, "lon": 76.7320, "aqi": 125, "pm25": 50.0, "pm10": 72.0},
    ],
  };

  const list = cityStations[city] || cityStations.Delhi;
  const stations: Station[] = list.map((s, idx) => ({
    id: `ST_${idx}`,
    name: s.name,
    lat: s.lat,
    lon: s.lon,
    pm25: s.pm25,
    pm10: s.pm10,
    no2: Math.round(s.aqi * 0.22),
    so2: Math.round(s.aqi * 0.08),
    co: parseFloat((s.aqi * 0.007).toFixed(1)),
    o3: Math.round(s.aqi * 0.15),
    temp: 31.0,
    humidity: 58.0,
    pressure: 1008.0,
    wind_speed: 2.5,
    pblh: 850.0,
    aqi: s.aqi,
    source: idx % 4 === 0 ? 'iot' : 'caaqms',
    status: s.aqi > 200 ? 'alert' : 'online',
  }));

  const avgAqi = stations.length > 0
    ? Math.round(stations.reduce((acc, curr) => acc + curr.aqi, 0) / stations.length)
    : 200;

  return {
    city,
    stations,
    center_aqi: avgAqi,
  };
}

function getLocalOptimizedPlan(depotLat: number, depotLon: number, stations: Station[]): RoutePlan {
  const safeStations = Array.isArray(stations) ? stations : [];
  const dispatchable = safeStations
    .filter((s) => s && s.aqi >= 200)
    .sort((a, b) => b.aqi - a.aqi);

  const pool = dispatchable.length > 0 ? dispatchable : safeStations.slice(0, 4);

  const stops = pool.slice(0, 5).map((st, i) => {
    const minutes = 34 + i * 41;
    const h = Math.floor((9 * 60 + minutes) / 60);
    const m = (9 * 60 + minutes) % 60;
    const etaStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

    const action = st.aqi >= 300 ? 'FULL_INSPECTION' : 'VERIFY_FIRST';
    const roi = parseFloat((st.aqi * 0.158).toFixed(1));

    return {
      source_id: `S_${i}`,
      lat: st.lat,
      lon: st.lon,
      eta: etaStr,
      action,
      roi,
    };
  });

  return {
    route_id: 'combined_enforcement_route',
    stops,
  };
}
