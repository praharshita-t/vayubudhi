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
  aqi: number;
  source: string;
  status: string;
  temp?: number;
  humidity?: number;
  pressure?: number;
  wind_speed?: number;
  pblh?: number;
}

export type CityId = 'Delhi' | 'Hyderabad' | 'Guwahati' | 'My Location' | string;
