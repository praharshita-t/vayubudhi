/**
 * Mock CAAQMS station data for Delhi NCR.
 * Real coordinates of actual government monitoring stations.
 */

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
  source: 'caaqms' | 'iot';
  status: 'online' | 'offline' | 'alert';
}

export const delhiStations: Station[] = [
  { id: 'ST01', name: 'Anand Vihar', lat: 28.6469, lon: 77.3164, pm25: 285, pm10: 340, no2: 78, so2: 22, co: 3.2, o3: 18, aqi: 338, source: 'caaqms', status: 'alert' },
  { id: 'ST02', name: 'ITO', lat: 28.6289, lon: 77.2406, pm25: 198, pm10: 245, no2: 92, so2: 18, co: 2.8, o3: 22, aqi: 248, source: 'caaqms', status: 'alert' },
  { id: 'ST03', name: 'Mandir Marg', lat: 28.6362, lon: 77.2008, pm25: 145, pm10: 182, no2: 55, so2: 12, co: 1.9, o3: 35, aqi: 195, source: 'caaqms', status: 'online' },
  { id: 'ST04', name: 'RK Puram', lat: 28.5635, lon: 77.1724, pm25: 172, pm10: 210, no2: 68, so2: 15, co: 2.3, o3: 28, aqi: 222, source: 'caaqms', status: 'alert' },
  { id: 'ST05', name: 'Punjabi Bagh', lat: 28.6687, lon: 77.1205, pm25: 162, pm10: 198, no2: 61, so2: 14, co: 2.1, o3: 30, aqi: 212, source: 'caaqms', status: 'online' },
  { id: 'ST06', name: 'DTU', lat: 28.7499, lon: 77.1171, pm25: 118, pm10: 155, no2: 42, so2: 9, co: 1.5, o3: 40, aqi: 168, source: 'caaqms', status: 'online' },
  { id: 'ST07', name: 'Ashok Vihar', lat: 28.6816, lon: 77.1753, pm25: 155, pm10: 192, no2: 58, so2: 13, co: 2.0, o3: 32, aqi: 205, source: 'caaqms', status: 'online' },
  { id: 'ST08', name: 'Dwarka Sec 8', lat: 28.5921, lon: 77.0460, pm25: 95, pm10: 128, no2: 35, so2: 8, co: 1.2, o3: 45, aqi: 142, source: 'caaqms', status: 'online' },
  { id: 'ST09', name: 'IGI Airport T3', lat: 28.5562, lon: 77.0873, pm25: 108, pm10: 140, no2: 48, so2: 10, co: 1.6, o3: 38, aqi: 158, source: 'caaqms', status: 'online' },
  { id: 'ST10', name: 'Nehru Nagar', lat: 28.5680, lon: 77.2509, pm25: 188, pm10: 228, no2: 72, so2: 16, co: 2.5, o3: 25, aqi: 238, source: 'caaqms', status: 'alert' },
  { id: 'ST11', name: 'Siri Fort', lat: 28.5506, lon: 77.2178, pm25: 132, pm10: 165, no2: 50, so2: 11, co: 1.7, o3: 36, aqi: 182, source: 'caaqms', status: 'online' },
  { id: 'ST12', name: 'Mundka', lat: 28.6843, lon: 77.0319, pm25: 142, pm10: 175, no2: 45, so2: 18, co: 1.8, o3: 33, aqi: 192, source: 'caaqms', status: 'online' },
  { id: 'ST13', name: 'Wazirpur', lat: 28.6996, lon: 77.1654, pm25: 210, pm10: 255, no2: 65, so2: 28, co: 2.6, o3: 20, aqi: 260, source: 'caaqms', status: 'alert' },
  { id: 'ST14', name: 'Patparganj', lat: 28.6237, lon: 77.2874, pm25: 175, pm10: 215, no2: 70, so2: 15, co: 2.2, o3: 26, aqi: 225, source: 'caaqms', status: 'alert' },
  { id: 'ST15', name: 'Okhla Phase-2', lat: 28.5308, lon: 77.2713, pm25: 165, pm10: 200, no2: 62, so2: 20, co: 2.1, o3: 29, aqi: 215, source: 'caaqms', status: 'online' },
  { id: 'ST16', name: 'Bawana', lat: 28.7762, lon: 77.0511, pm25: 195, pm10: 240, no2: 48, so2: 25, co: 2.4, o3: 22, aqi: 245, source: 'caaqms', status: 'alert' },
  { id: 'ST17', name: 'Jahangirpuri', lat: 28.7254, lon: 77.1680, pm25: 178, pm10: 218, no2: 56, so2: 16, co: 2.3, o3: 27, aqi: 228, source: 'caaqms', status: 'online' },
  { id: 'ST18', name: 'Shadipur', lat: 28.6514, lon: 77.1595, pm25: 148, pm10: 185, no2: 58, so2: 13, co: 1.9, o3: 31, aqi: 198, source: 'caaqms', status: 'online' },
  { id: 'ST19', name: 'Vivek Vihar', lat: 28.6724, lon: 77.3151, pm25: 225, pm10: 270, no2: 75, so2: 20, co: 2.9, o3: 19, aqi: 275, source: 'caaqms', status: 'alert' },
  { id: 'IOT01', name: 'VayuBudhi Sensor α', lat: 28.6350, lon: 77.2250, pm25: 252, pm10: 295, no2: 82, so2: 19, co: 3.0, o3: 16, aqi: 302, source: 'iot', status: 'alert' },
];

export function getAqiCategory(aqi: number): { label: string; color: string; bg: string } {
  if (aqi <= 50)  return { label: 'Good', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' };
  if (aqi <= 100) return { label: 'Satisfactory', color: '#84cc16', bg: 'rgba(132,204,22,0.15)' };
  if (aqi <= 200) return { label: 'Moderate', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
  if (aqi <= 300) return { label: 'Poor', color: '#f97316', bg: 'rgba(249,115,22,0.15)' };
  if (aqi <= 400) return { label: 'Very Poor', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
  return { label: 'Severe', color: '#dc2626', bg: 'rgba(220,38,38,0.15)' };
}
