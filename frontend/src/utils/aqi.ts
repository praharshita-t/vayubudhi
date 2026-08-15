export function getAqiCategory(aqi: number): { label: string; color: string; bg: string } {
  if (aqi <= 50)  return { label: 'Good', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' };
  if (aqi <= 100) return { label: 'Satisfactory', color: '#84cc16', bg: 'rgba(132,204,22,0.15)' };
  if (aqi <= 200) return { label: 'Moderate', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
  if (aqi <= 300) return { label: 'Poor', color: '#f97316', bg: 'rgba(249,115,22,0.15)' };
  if (aqi <= 400) return { label: 'Very Poor', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
  return { label: 'Severe', color: '#dc2626', bg: 'rgba(220,38,38,0.15)' };
}

export function pm25ToAqi(pm25: number): number {
  if (pm25 <= 30) return (50/30) * pm25;
  if (pm25 <= 60) return 50 + ((100-51)/(60-31)) * (pm25 - 31);
  if (pm25 <= 90) return 100 + ((200-101)/(90-61)) * (pm25 - 61);
  if (pm25 <= 120) return 200 + ((300-201)/(120-91)) * (pm25 - 91);
  if (pm25 <= 250) return 300 + ((400-301)/(250-121)) * (pm25 - 121);
  return 400 + ((500-401)/(500-251)) * Math.min(pm25 - 251, 249);
}
