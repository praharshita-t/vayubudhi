'use client';
import React, { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useCityContext } from '@/context/CityContext';
import { getAqiCategory } from '@/utils/aqi';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ── Health recommendations by AQI band ──
function getHealthInfo(aqi: number) {
  if (aqi <= 50) return {
    icon: '✅', title: 'Air quality is Good',
    message: 'Air quality is satisfactory. No health risks. Enjoy outdoor activities freely.',
    bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', color: '#22c55e'
  };
  if (aqi <= 100) return {
    icon: '🟢', title: 'Air quality is Satisfactory',
    message: 'Acceptable quality. Unusually sensitive individuals should consider limiting prolonged outdoor exertion.',
    bg: 'rgba(132,204,22,0.1)', border: 'rgba(132,204,22,0.3)', color: '#84cc16'
  };
  if (aqi <= 200) return {
    icon: '⚠️', title: 'Air quality is Moderate',
    message: 'Breathing discomfort possible for sensitive groups. Children, elderly, and those with respiratory conditions should limit outdoor time.',
    bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', color: '#f59e0b'
  };
  if (aqi <= 300) return {
    icon: '🟠', title: 'Air quality is Poor',
    message: 'Breathing discomfort likely for most people on prolonged exposure. Avoid heavy outdoor exertion. Use an N95 mask outdoors.',
    bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', color: '#f97316'
  };
  if (aqi <= 400) return {
    icon: '🔴', title: 'Air quality is Very Poor',
    message: 'Health alert: everyone may experience serious effects. Avoid all outdoor physical activity. Keep windows closed. Use air purifiers indoors.',
    bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#ef4444'
  };
  return {
    icon: '🚨', title: 'Air quality is Severe — Emergency',
    message: 'Hazardous conditions. Everyone should avoid going outdoors. Serious respiratory and cardiovascular effects expected. Use N95 masks if you must step outside.',
    bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.3)', color: '#dc2626'
  };
}

// ── Pollutant safe limits (India NAAQS 24h avg) ──
const POLLUTANT_LIMITS: Record<string, { limit: number; unit: string; label: string }> = {
  pm25: { limit: 60, unit: 'µg/m³', label: 'PM2.5' },
  pm10: { limit: 100, unit: 'µg/m³', label: 'PM10' },
  no2:  { limit: 80, unit: 'ppb', label: 'NO₂' },
  so2:  { limit: 80, unit: 'ppb', label: 'SO₂' },
  co:   { limit: 4, unit: 'mg/m³', label: 'CO' },
  o3:   { limit: 100, unit: 'ppb', label: 'O₃' },
};

// ── Generate synthetic historical data (to be replaced with real API) ──
function generateHistoricalData(baseAqi: number, hours: number = 24) {
  const now = new Date();
  const data = [];
  for (let i = hours; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 60 * 60 * 1000);
    const variation = Math.sin(i * 0.26) * 18 + Math.sin(i * 0.8) * 10 + (Math.random() - 0.5) * 20;
    const aqi = Math.max(10, Math.round(baseAqi + variation));
    data.push({
      time: t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      fullTime: t,
      aqi,
    });
  }
  return data;
}

// ── Generate 24h forecast sparkline data ──
function generateForecastData(baseAqi: number) {
  const data = [];
  let aqi = baseAqi;
  for (let i = 1; i <= 24; i++) {
    const change = (Math.random() - 0.45) * 12;
    aqi = Math.max(10, Math.round(aqi + change));
    data.push({ hour: `+${i}h`, aqi });
  }
  return data;
}

function aqiBarColor(aqi: number): string {
  if (aqi <= 50) return '#22c55e';
  if (aqi <= 100) return '#84cc16';
  if (aqi <= 200) return '#f59e0b';
  if (aqi <= 300) return '#f97316';
  if (aqi <= 400) return '#ef4444';
  return '#dc2626';
}

function pollutantColor(value: number, limit: number): string {
  const ratio = value / limit;
  if (ratio <= 0.5) return '#22c55e';
  if (ratio <= 1.0) return '#f59e0b';
  if (ratio <= 1.5) return '#f97316';
  return '#ef4444';
}

export default function HomePage() {
  const { activeCity, cityData, liveData, stations, districts, liveLoading } = useCityContext();
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  // Compute aggregate metrics from stations
  const avgAqi = useMemo(() => {
    if (stations.length === 0) return 0;
    return Math.round(stations.reduce((s, st) => s + st.aqi, 0) / stations.length);
  }, [stations]);

  const avgPm25 = useMemo(() => {
    if (stations.length === 0) return 0;
    return Math.round(stations.reduce((s, st) => s + st.pm25, 0) / stations.length);
  }, [stations]);

  const avgPm10 = useMemo(() => {
    if (stations.length === 0) return 0;
    return Math.round(stations.reduce((s, st) => s + st.pm10, 0) / stations.length);
  }, [stations]);

  const avgPollutants = useMemo(() => {
    if (stations.length === 0) return { no2: 0, so2: 0, co: 0, o3: 0, pm25: 0, pm10: 0 };
    const n = stations.length;
    return {
      pm25: Math.round(stations.reduce((s, st) => s + st.pm25, 0) / n),
      pm10: Math.round(stations.reduce((s, st) => s + st.pm10, 0) / n),
      no2: Math.round(stations.reduce((s, st) => s + st.no2, 0) / n),
      so2: Math.round(stations.reduce((s, st) => s + st.so2, 0) / n),
      co: +(stations.reduce((s, st) => s + st.co, 0) / n).toFixed(1),
      o3: Math.round(stations.reduce((s, st) => s + st.o3, 0) / n),
    };
  }, [stations]);

  // Weather: avg from stations that have weather data
  const weather = useMemo(() => {
    const withWeather = stations.filter((s: any) => s.temp !== undefined);
    if (withWeather.length === 0) return null;
    const n = withWeather.length;
    return {
      temp: +(withWeather.reduce((s: number, st: any) => s + (st.temp ?? 0), 0) / n).toFixed(1),
      humidity: Math.round(withWeather.reduce((s: number, st: any) => s + (st.humidity ?? 0), 0) / n),
      wind_speed: +(withWeather.reduce((s: number, st: any) => s + (st.wind_speed ?? 0), 0) / n).toFixed(1),
      pressure: Math.round(withWeather.reduce((s: number, st: any) => s + (st.pressure ?? 0), 0) / n),
    };
  }, [stations]);

  const historicalData = useMemo(() => generateHistoricalData(avgAqi), [avgAqi]);
  const forecastData = useMemo(() => generateForecastData(avgAqi), [avgAqi]);

  const minPoint = useMemo(() => historicalData.reduce((m, d) => d.aqi < m.aqi ? d : m, historicalData[0]), [historicalData]);
  const maxPoint = useMemo(() => historicalData.reduce((m, d) => d.aqi > m.aqi ? d : m, historicalData[0]), [historicalData]);

  const forecastEnd = forecastData[forecastData.length - 1]?.aqi ?? avgAqi;
  const trendUp = forecastEnd > avgAqi;

  const aqiCat = getAqiCategory(avgAqi);
  const healthInfo = getHealthInfo(avgAqi);
  const scalePosition = Math.min(100, Math.max(0, (avgAqi / 500) * 100));

  // Sort districts for leaderboard
  const sortedDistricts = useMemo(() => {
    return [...districts].sort((a, b) => a.aqi - b.aqi);
  }, [districts]);

  const best5 = sortedDistricts.slice(0, 5);
  const worst5 = [...sortedDistricts].reverse().slice(0, 5);

  if (liveLoading && stations.length === 0) {
    return (
      <div className="home-page">
        <div className="home-loading">
          <div className="home-loading-spinner" />
          <div>Loading air quality data for {activeCity}...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-inner">
        {/* Live badge */}
        <div className="home-live-badge">
          <div className="dot" /> Live
        </div>

        {/* Title */}
        <h1 className="home-title">{activeCity} Air Quality Index (AQI) | Air Pollution</h1>
        <p className="home-subtitle">Real-time PM2.5, PM10 air pollution level in {activeCity}</p>
        <p className="home-timestamp" suppressHydrationWarning>
          Last Updated: {now.toLocaleDateString('en-IN')} {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })} (Local Time)
        </p>

        {/* ═══ Section 1: Hero AQI Card ═══ */}
        <div className="home-hero">
          <div className="home-hero-left">
            <div className="home-aqi-indicator">
              <div className="dot" style={{ background: aqiCat.color }} /> Live AQI
            </div>
            <div className="home-aqi-value" style={{ color: aqiCat.color }}>{avgAqi}</div>
            <div className="home-aqi-unit">AQI (India)</div>
          </div>

          <div className="home-hero-right">
            <div className="home-aqi-status" style={{ background: aqiCat.bg, color: aqiCat.color, border: `1px solid ${aqiCat.color}40` }}>
              <span className="home-aqi-status-label">Air Quality is</span>
              {aqiCat.label}
            </div>
            <div className="home-pm-values">
              <div className="home-pm-item">
                <div className="home-pm-label">PM2.5</div>
                <span className="home-pm-val">{avgPm25}</span>
                <span className="home-pm-unit">µg/m³</span>
              </div>
              <div className="home-pm-item">
                <div className="home-pm-label">PM10</div>
                <span className="home-pm-val">{avgPm10}</span>
                <span className="home-pm-unit">µg/m³</span>
              </div>
            </div>
          </div>

          {/* AQI Scale Bar */}
          <div className="home-scale">
            <div className="home-scale-bar-wrapper">
              <div className="home-scale-bar">
                <div style={{ background: '#22c55e' }} />
                <div style={{ background: '#84cc16' }} />
                <div style={{ background: '#eab308' }} />
                <div style={{ background: '#f59e0b' }} />
                <div style={{ background: '#f97316' }} />
                <div style={{ background: '#ef4444' }} />
                <div style={{ background: '#dc2626' }} />
              </div>
              <div className="home-scale-marker" style={{ left: `${scalePosition}%` }} />
            </div>
            <div className="home-scale-labels">
              <span>Good</span><span>Satisfactory</span><span>Moderate</span><span>Poor</span><span>Very Poor</span><span>Severe</span>
            </div>
            <div className="home-scale-numbers">
              <span>0</span><span>50</span><span>100</span><span>200</span><span>300</span><span>400</span><span>500+</span>
            </div>
          </div>
        </div>

        {/* ═══ Section 5: Health Impact Banner ═══ */}
        <div className="home-health-banner" style={{ background: healthInfo.bg, borderColor: healthInfo.border, color: healthInfo.color }}>
          <span className="home-health-icon">{healthInfo.icon}</span>
          <div>
            <div className="home-health-title">{healthInfo.title}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{healthInfo.message}</div>
          </div>
        </div>

        {/* ═══ Section 3: Pollutant Breakdown ═══ */}
        <div className="home-section-title">Pollutant Breakdown</div>
        <div className="home-grid-6">
          {Object.entries(POLLUTANT_LIMITS).map(([key, info]) => {
            const value = (avgPollutants as any)[key] ?? 0;
            const pct = Math.min(100, (value / info.limit) * 100);
            const clr = pollutantColor(value, info.limit);
            return (
              <div className="home-pollutant-card" key={key}>
                <div className="home-pollutant-name">{info.label}</div>
                <div className="home-pollutant-value" style={{ color: clr }}>{value}</div>
                <span className="home-pollutant-unit">{info.unit}</span>
                <div className="home-pollutant-bar">
                  <div className="home-pollutant-bar-fill" style={{ width: `${pct}%`, background: clr }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══ Section 4 + 7: Weather & Forecast Sparkline ═══ */}
        <div className="home-grid-2">
          {/* Weather */}
          <div className="home-card">
            <div className="home-card-title">Weather Conditions</div>
            {weather ? (
              <div className="home-weather-grid">
                <div className="home-weather-item">
                  <div>
                    <div className="home-weather-label" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Temperature</div>
                    <div className="home-weather-val">{weather.temp}°C</div>
                  </div>
                </div>
                <div className="home-weather-item">
                  <div>
                    <div className="home-weather-label" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Humidity</div>
                    <div className="home-weather-val">{weather.humidity}%</div>
                  </div>
                </div>
                <div className="home-weather-item">
                  <div>
                    <div className="home-weather-label" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Wind Speed</div>
                    <div className="home-weather-val">{weather.wind_speed} m/s</div>
                  </div>
                </div>
                <div className="home-weather-item">
                  <div>
                    <div className="home-weather-label" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Pressure</div>
                    <div className="home-weather-val">{weather.pressure} hPa</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Weather data unavailable</div>
            )}
          </div>

          {/* 24h Forecast Sparkline */}
          <div className="home-card">
            <div className="home-card-title">24h AQI Forecast</div>
            <div style={{ width: '100%', height: 100 }}>
              <ResponsiveContainer>
                <AreaChart data={forecastData}>
                  <defs>
                    <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={aqiCat.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={aqiCat.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="aqi" stroke={aqiCat.color} fill="url(#forecastGrad)" strokeWidth={2} dot={false} />
                  <XAxis dataKey="hour" hide />
                  <YAxis hide domain={['dataMin - 20', 'dataMax + 20']} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-primary)', borderRadius: 8, fontSize: '0.75rem', color: 'var(--text-primary)' }}
                    itemStyle={{ color: 'var(--accent-blue)', fontWeight: 700 }}
                    labelStyle={{ color: 'var(--text-secondary)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="home-forecast-trend">
              <span className="home-trend-arrow" style={{ color: trendUp ? '#ef4444' : '#22c55e' }}>
                {trendUp ? '↗' : '↘'}
              </span>
              <span className="home-trend-text" style={{ color: trendUp ? '#ef4444' : '#22c55e' }}>
                {trendUp ? 'Worsening trend' : 'Improving trend'} — predicted {forecastEnd} AQI in 24h
              </span>
            </div>
          </div>
        </div>

        {/* ═══ Section 2: Historical AQI Graph ═══ */}
        <div className="home-historical">
          <div className="home-historical-header">
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2 }}>AQI Graph</div>
              <div className="home-historical-title">Historical Air Quality Data</div>
            </div>
            <div className="home-historical-controls">
              <button className={`home-chart-toggle ${chartType === 'line' ? 'active' : ''}`} onClick={() => setChartType('line')}>📈</button>
              <button className={`home-chart-toggle ${chartType === 'bar' ? 'active' : ''}`} onClick={() => setChartType('bar')}>📊</button>
              <span className="home-chart-select">24 Hours</span>
              <span className="home-chart-select">AQI (India)</span>
            </div>
          </div>
          <div className="home-historical-subtitle">{activeCity}</div>

          {/* Min/Max badges */}
          <div className="home-minmax-row">
            <div className="home-minmax-badge" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <span className="home-minmax-value" style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>{minPoint.aqi}</span>
              <div className="home-minmax-info">
                <span className="home-minmax-label" style={{ color: '#22c55e' }}>↓ Min. AQI</span>
                <span className="home-minmax-time">⏱ {minPoint.time}</span>
              </div>
            </div>
            <div className="home-minmax-badge" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <span className="home-minmax-value" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>{maxPoint.aqi}</span>
              <div className="home-minmax-info">
                <span className="home-minmax-label" style={{ color: '#ef4444' }}>↑ Max. AQI</span>
                <span className="home-minmax-time">⏱ {maxPoint.time}</span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="home-chart-wrapper">
            <ResponsiveContainer>
              {chartType === 'bar' ? (
                <BarChart data={historicalData}>
                  <XAxis dataKey="time" tick={{ fill: '#8b949e', fontSize: 10 }} interval={2} />
                  <YAxis tick={{ fill: '#8b949e', fontSize: 10 }} domain={[0, 'dataMax + 30']} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-primary)', borderRadius: 8, fontSize: '0.75rem', color: 'var(--text-primary)' }}
                    itemStyle={{ color: 'var(--accent-blue)', fontWeight: 700 }}
                    labelStyle={{ color: 'var(--text-secondary)' }}
                  />
                  <Bar dataKey="aqi" radius={[3, 3, 0, 0]}>
                    {historicalData.map((entry, i) => (
                      <Cell key={i} fill={aqiBarColor(entry.aqi)} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <LineChart data={historicalData}>
                  <XAxis dataKey="time" tick={{ fill: '#8b949e', fontSize: 10 }} interval={2} />
                  <YAxis tick={{ fill: '#8b949e', fontSize: 10 }} domain={[0, 'dataMax + 30']} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-primary)', borderRadius: 8, fontSize: '0.75rem', color: 'var(--text-primary)' }}
                    itemStyle={{ color: 'var(--accent-blue)', fontWeight: 700 }}
                    labelStyle={{ color: 'var(--text-secondary)' }}
                  />
                  <Line type="monotone" dataKey="aqi" stroke={aqiCat.color} strokeWidth={2.5} dot={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* ═══ Section 6: District Leaderboard ═══ */}
        {sortedDistricts.length > 0 && (
          <div className="home-leaderboard">
            <div className="home-leaderboard-section">
              <div className="home-leaderboard-title">🟢 Cleanest Districts</div>
              {best5.map((d, i) => (
                <div className="home-leaderboard-item" key={d.id}>
                  <span className="home-leaderboard-rank">{i + 1}</span>
                  <span className="home-leaderboard-name">{d.name}</span>
                  <span className="home-leaderboard-aqi" style={{ color: getAqiCategory(d.aqi).color }}>{d.aqi}</span>
                </div>
              ))}
            </div>
            <div className="home-leaderboard-section">
              <div className="home-leaderboard-title">🔴 Most Polluted Districts</div>
              {worst5.map((d, i) => (
                <div className="home-leaderboard-item" key={d.id}>
                  <span className="home-leaderboard-rank">{i + 1}</span>
                  <span className="home-leaderboard-name">{d.name}</span>
                  <span className="home-leaderboard-aqi" style={{ color: getAqiCategory(d.aqi).color }}>{d.aqi}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
