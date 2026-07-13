/**
 * Mock 72-hour AQI forecast data with conformal prediction intervals.
 * Simulates XGBoost + MAPIE output at 3-hour resolution.
 */

export interface ForecastPoint {
  hour: number;       // hours from now (0..72)
  label: string;      // formatted time label
  point: number;      // point forecast AQI
  lower: number;      // 90% conformal lower bound
  upper: number;      // 90% conformal upper bound
  vi: number;         // Ventilation Index (PBLH × wind speed)
}

// Generates a realistic 72-hour forecast curve with diurnal patterns
function generateForecast(): ForecastPoint[] {
  const points: ForecastPoint[] = [];
  const baseHour = new Date().getHours();

  for (let h = 0; h <= 72; h += 3) {
    const futureHour = (baseHour + h) % 24;
    const day = Math.floor(h / 24);

    // Diurnal AQI pattern: peaks at 8AM and 8PM, dips at 3PM
    const diurnalFactor =
      1.0 +
      0.35 * Math.sin(((futureHour - 8) / 24) * 2 * Math.PI) +
      0.15 * Math.sin(((futureHour - 20) / 12) * 2 * Math.PI);

    // Base AQI decays slightly over 72h (weather improvement scenario)
    const baseLine = 220 - day * 18;
    const point = Math.round(baseLine * diurnalFactor + (Math.random() - 0.5) * 20);

    // Conformal bands widen with horizon (uncertainty grows)
    const bandWidth = 25 + h * 0.8;
    const lower = Math.max(0, Math.round(point - bandWidth));
    const upper = Math.round(point + bandWidth);

    // Ventilation Index: anti-correlated with AQI (low VI = high AQI)
    const vi = Math.round(8000 - point * 22 + (Math.random() - 0.5) * 500);

    const dayLabel = day === 0 ? 'Today' : day === 1 ? 'Tomorrow' : `Day ${day + 1}`;
    const timeStr = `${futureHour.toString().padStart(2, '0')}:00`;

    points.push({
      hour: h,
      label: `${dayLabel} ${timeStr}`,
      point: Math.max(30, point),
      lower: Math.max(10, lower),
      upper,
      vi: Math.max(200, vi),
    });
  }
  return points;
}

export const forecastData = generateForecast();

// RMSE validation metrics
export const validationMetrics = {
  rmse_24h: 18.3,
  rmse_48h: 27.1,
  rmse_72h: 38.6,
  persistence_24h: 26.8,
  persistence_48h: 34.9,
  persistence_72h: 44.2,
  improvement_24h: 31.7,
  improvement_48h: 22.3,
  improvement_72h: 12.7,
  conformal_coverage: 91.2,
};
