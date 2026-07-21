export function getAqiCategory(aqi: number): { label: string; color: string; bg: string } {
  if (aqi <= 50)  return { label: 'Good', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' };
  if (aqi <= 100) return { label: 'Satisfactory', color: '#84cc16', bg: 'rgba(132,204,22,0.15)' };
  if (aqi <= 200) return { label: 'Moderate', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
  if (aqi <= 300) return { label: 'Poor', color: '#f97316', bg: 'rgba(249,115,22,0.15)' };
  if (aqi <= 400) return { label: 'Very Poor', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
  return { label: 'Severe', color: '#dc2626', bg: 'rgba(220,38,38,0.15)' };
}
