export interface Station {
  id: string;
  name: string;
  lat: number;
  lon: number;
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
  aqi: number;
  source: 'iot' | 'caaqms' | string;
  status: 'alert' | 'online' | string;
}

export interface CityDataResponse {
  city: string;
  stations: Station[];
  center_aqi: number;
}

export type ActionType = 'FULL_INSPECTION' | 'VERIFY_FIRST' | 'MONITOR' | string;

export interface RouteStop {
  source_id: string;
  lat: number;
  lon: number;
  eta: string;
  action: ActionType;
  roi: number;
  aqi?: number;
  stationName?: string;
  severity?: number;
  pm25?: number;
  pm10?: number;
  no2?: number;
  so2?: number;
  co?: number;
  o3?: number;
  temp?: number;
  humidity?: number;
  pressure?: number;
  wind_speed?: number;
  pblh?: number;
  ventilation_index?: number;
  dominantSource?: string;
  sourceConfidence?: number;
  populationExposed?: number;
  legalBasis?: string;
  evidenceRationale?: string;
  priorityRank?: number;
  distanceFromPrev?: string;
  durationFromPrev?: string;
  isCompleted?: boolean;
}

export interface RouteSegment {
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  distanceMeters: number;
  durationSeconds: number;
  distanceFormatted: string;
  durationFormatted: string;
  geometry: [number, number][]; // [lon, lat] for MapLibre/GeoJSON standards
  isFallback?: boolean;
}

export interface RoadRoutePlan {
  routeId: string;
  cityName: string;
  depot: {
    name: string;
    lat: number;
    lon: number;
  };
  stops: RouteStop[];
  segments: RouteSegment[];
  fullGeometry: [number, number][]; // Combined road-following [lon, lat]
  totalDistanceKm: number;
  totalDurationMin: number;
  highestPriorityStop?: RouteStop;
  isRoadFollowing: boolean;
}

export interface RoutePlan {
  route_id: string;
  stops: RouteStop[];
}

export interface District {
  id: string;
  name: string;
  polygon: [number, number][];
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

export interface HardwareReading {
  id: string;
  station_id: string;
  timestamp: string;
  pm1: number;
  pm25: number;
  pm4: number;
  pm10: number;
  voc_index: number;
  nox_index: number;
  temp: number;
  humidity: number;
  pressure: number;
  lat?: number;
  lon?: number;
  location_name?: string;
}

export interface SensorAlert {
  id: string;
  station_id: string;
  timestamp: string;
  reading: HardwareReading;
  trigger_reason: string;
  trigger_threshold: number;
  is_acknowledged: boolean;
  severity: 'WARNING' | 'CRITICAL';
}
