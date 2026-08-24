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
  wind_dir?: number;
  pblh?: number;
  districtName?: string;
}

export type CityId = 'Delhi' | 'Hyderabad' | 'Guwahati' | 'My Location' | string;

export interface RecommendedDeployment {
  districtId: string;
  name: string;
  priorityScore: number;
  dominantSource: 'Traffic' | 'Industrial' | 'Dust';
  reason: string;
  benefit: string;
  rank: number;
  aqi: number;
}
