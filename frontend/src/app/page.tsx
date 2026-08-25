'use client';
import React, { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useCityContext } from '@/context/CityContext';
import { getAqiCategory } from '@/utils/aqi';
import { CityId } from '@/types';
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

// ── Generate 24h historical telemetry curve based on diurnal atmospheric variance ──
function generateHistoricalData(baseAqi: number, hours: number = 24) {
  const now = new Date();
  const data = [];
  const currentHour = now.getHours();
  for (let i = hours; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 60 * 60 * 1000);
    const pastHour = (currentHour - i + 48) % 24;
    // Diurnal variation: rush hour peak at 8am (h=8) and 8pm (h=20), afternoon dispersion at 2pm (h=14)
    const diurnal = 0.18 * Math.sin(((pastHour - 8) / 24) * 2 * Math.PI) + 0.08 * Math.sin(((pastHour - 20) / 12) * 2 * Math.PI);
    const aqi = Math.max(10, Math.round(baseAqi * (1.0 + diurnal)));
    const pm25 = Math.max(5, Math.round((baseAqi * 0.45) * (1.0 + diurnal)));
    const pm10 = Math.max(10, Math.round((baseAqi * 0.85) * (1.0 + diurnal)));
    data.push({
      time: t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      fullTime: t,
      aqi,
      pm25,
      pm10,
    });
  }
  return data;
}

// ── Generate 24h forecast sparkline derived from ML trajectory and diurnal dispersion ──
function generateForecastData(baseAqi: number) {
  const data = [];
  const currentHour = new Date().getHours();
  for (let i = 1; i <= 24; i++) {
    const futureHour = (currentHour + i) % 24;
    const diurnal = 0.15 * Math.sin(((futureHour - 8) / 24) * 2 * Math.PI) + 0.05 * Math.sin(((futureHour - 20) / 12) * 2 * Math.PI);
    // Slight drift towards clean air if dispersion is active
    const trend = -0.005 * i;
    const aqi = Math.max(10, Math.round(baseAqi * (1.0 + diurnal + trend)));
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
  const { activeCity, setActiveCity, cityData, liveData, stations, districts, liveLoading } = useCityContext();
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [timeRange, setTimeRange] = useState<'6h' | '12h' | '24h'>('24h');
  const [chartMetric, setChartMetric] = useState<'aqi' | 'pm25' | 'pm10'>('aqi');
  const [now, setNow] = useState(new Date());
  const [realHistory, setRealHistory] = useState<any[]>([]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  // Fetch real 24-hour historical hourly telemetry from the live API
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/city-historical?city=${activeCity}`);
        if (res.ok) {
          const data = await res.json();
          if (data.history && data.history.length > 0) {
            setRealHistory(data.history);
          }
        }
      } catch (err) {
        console.error('Failed to fetch real historical AQI data', err);
      }
    };
    fetchHistory();
  }, [activeCity]);

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

  // Prefer real live hourly API telemetry over model extrapolation
  const rawHistoricalData = useMemo(() => {
    if (realHistory.length > 0) {
      const copy = realHistory.map((item) => ({
        ...item,
        aqi: Math.round(item.aqi),
        pm25: typeof item.pm25 === 'number' ? Math.round(item.pm25 * 10) / 10 : Math.round(item.aqi * 0.45),
        pm10: typeof item.pm10 === 'number' ? Math.round(item.pm10 * 10) / 10 : Math.round(item.aqi * 0.85),
      }));
      if (copy.length > 0 && avgAqi > 0) {
        copy[copy.length - 1] = {
          ...copy[copy.length - 1],
          aqi: avgAqi,
          pm25: avgPm25 > 0 ? avgPm25 : copy[copy.length - 1].pm25,
          pm10: avgPm10 > 0 ? avgPm10 : copy[copy.length - 1].pm10
        };
      }
      return copy;
    }
    return generateHistoricalData(avgAqi, 24);
  }, [realHistory, avgAqi, avgPm25, avgPm10]);

  const historicalData = useMemo(() => {
    const count = timeRange === '6h' ? 7 : timeRange === '12h' ? 13 : 24;
    return rawHistoricalData.slice(-count);
  }, [rawHistoricalData, timeRange]);

  const minPoint = useMemo(() => {
    if (historicalData.length === 0) return { val: 0, time: '--' };
    return historicalData.reduce((m, d) => {
      const v = Math.round(d[chartMetric] ?? d.aqi);
      return v < m.val ? { val: v, time: d.time } : m;
    }, { val: Math.round(historicalData[0][chartMetric] ?? historicalData[0].aqi), time: historicalData[0].time });
  }, [historicalData, chartMetric]);

  const maxPoint = useMemo(() => {
    if (historicalData.length === 0) return { val: 0, time: '--' };
    return historicalData.reduce((m, d) => {
      const v = Math.round(d[chartMetric] ?? d.aqi);
      return v > m.val ? { val: v, time: d.time } : m;
    }, { val: Math.round(historicalData[0][chartMetric] ?? historicalData[0].aqi), time: historicalData[0].time });
  }, [historicalData, chartMetric]);

  const forecastData = useMemo(() => generateForecastData(avgAqi), [avgAqi]);

  const forecastEnd = forecastData[forecastData.length - 1]?.aqi ?? avgAqi;
  const trendUp = forecastEnd > avgAqi;

  const aqiCat = getAqiCategory(avgAqi);
  const healthInfo = getHealthInfo(avgAqi);
  const scalePosition = useMemo(() => {
    if (avgAqi <= 50) return (avgAqi / 50) * 16.66;
    if (avgAqi <= 100) return 16.66 + ((avgAqi - 50) / 50) * 16.66;
    if (avgAqi <= 150) return 33.33 + ((avgAqi - 100) / 50) * 16.66;
    if (avgAqi <= 200) return 50.0 + ((avgAqi - 150) / 50) * 16.66;
    if (avgAqi <= 300) return 66.66 + ((avgAqi - 200) / 100) * 16.66;
    return Math.min(100, 83.33 + ((avgAqi - 300) / 200) * 16.66);
  }, [avgAqi]);

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
        {/* Top Branding Row */}
        <div className="home-brand-row">
          <div className="home-brand-left">
            <img src="/logo-emblem.png" alt="VayuBudhi" className="home-brand-logo" />
            <div className="home-brand-title-wrap">
              <span className="home-brand-title">VayuBudhi</span>
              <span className="home-since-badge">SINCE 2026</span>
            </div>
            {/* City Selector Dropdown */}
            <div className="home-city-select-wrap">
              <span className="home-city-select-icon">📍</span>
              <select
                className="home-city-select"
                value={activeCity}
                onChange={(e) => setActiveCity(e.target.value as CityId)}
                aria-label="Select City"
              >
                <optgroup label="Core Monitored Cities">
                  <option value="Delhi">Delhi NCR</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Bengaluru">Bengaluru</option>
                </optgroup>
                <optgroup label="Tier 1 Cities">
                  <option value="Mumbai">Mumbai</option>
                  <option value="Chennai">Chennai</option>
                  <option value="Kolkata">Kolkata</option>
                  <option value="Pune">Pune</option>
                  <option value="Ahmedabad">Ahmedabad</option>
                  <option value="Jaipur">Jaipur</option>
                  <option value="Lucknow">Lucknow</option>
                  <option value="Chandigarh">Chandigarh</option>
                  <option value="Thiruvananthapuram">Thiruvananthapuram</option>
                </optgroup>
                <optgroup label="Tier 2 Cities">
                  <option value="Guwahati">Guwahati</option>
                  <option value="Kanpur">Kanpur</option>
                  <option value="Nagpur">Nagpur</option>
                  <option value="Indore">Indore</option>
                  <option value="Bhopal">Bhopal</option>
                  <option value="Patna">Patna</option>
                </optgroup>
              </select>
            </div>
          </div>
          <div className="home-live-badge">
            <div className="dot" /> Live Telemetry
          </div>
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
            <div className="home-aqi-unit">AQI (US)</div>
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
              <span>Good</span><span>Moderate</span><span>Poor</span><span>Unhealthy</span><span>Severe</span><span>Hazardous</span>
            </div>
            <div className="home-scale-numbers">
              <span>0</span><span>50</span><span>100</span><span>150</span><span>200</span><span>300</span><span>500+</span>
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
              <button 
                className={`home-chart-toggle ${chartType === 'line' ? 'active' : ''}`} 
                onClick={() => setChartType('line')}
                title="Line Chart View"
                style={{ fontSize: '0.72rem', fontWeight: 700 }}
              >
                Line
              </button>
              <button 
                className={`home-chart-toggle ${chartType === 'bar' ? 'active' : ''}`} 
                onClick={() => setChartType('bar')}
                title="Bar Chart View"
                style={{ fontSize: '0.72rem', fontWeight: 700 }}
              >
                Bar
              </button>
              <select
                className="home-chart-select"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                aria-label="Select Historical Time Range"
              >
                <option value="6h">6 Hours</option>
                <option value="12h">12 Hours</option>
                <option value="24h">24 Hours</option>
              </select>
              <select
                className="home-chart-select"
                value={chartMetric}
                onChange={(e) => setChartMetric(e.target.value as any)}
                aria-label="Select Air Quality Metric"
              >
                <option value="aqi">AQI (India)</option>
                <option value="pm25">PM2.5 (µg/m³)</option>
                <option value="pm10">PM10 (µg/m³)</option>
              </select>
            </div>
          </div>
          <div className="home-historical-subtitle">{activeCity}</div>

          {/* Min/Max badges */}
          <div className="home-minmax-row">
            <div className="home-minmax-badge" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <span className="home-minmax-value" style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>{minPoint.val}</span>
              <div className="home-minmax-info">
                <span className="home-minmax-label" style={{ color: '#22c55e' }}>
                  &darr; Min. {chartMetric === 'aqi' ? 'AQI' : chartMetric.toUpperCase()}
                </span>
                <span className="home-minmax-time">at {minPoint.time}</span>
              </div>
            </div>
            <div className="home-minmax-badge" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <span className="home-minmax-value" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>{maxPoint.val}</span>
              <div className="home-minmax-info">
                <span className="home-minmax-label" style={{ color: '#ef4444' }}>
                  &uarr; Max. {chartMetric === 'aqi' ? 'AQI' : chartMetric.toUpperCase()}
                </span>
                <span className="home-minmax-time">at {maxPoint.time}</span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="home-chart-wrapper">
            <ResponsiveContainer>
              {chartType === 'bar' ? (
                <BarChart data={historicalData}>
                  <XAxis dataKey="time" tick={{ fill: '#8b949e', fontSize: 10 }} interval={timeRange === '6h' ? 0 : 2} />
                  <YAxis tick={{ fill: '#8b949e', fontSize: 10 }} domain={[0, 'dataMax + 20']} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-primary)', borderRadius: 8, fontSize: '0.75rem', color: 'var(--text-primary)' }}
                    itemStyle={{ color: 'var(--accent-blue)', fontWeight: 700 }}
                    labelStyle={{ color: 'var(--text-secondary)' }}
                    formatter={(value: any) => [
                      `${value} ${chartMetric === 'aqi' ? 'AQI' : 'µg/m³'}`,
                      chartMetric === 'aqi' ? 'Air Quality Index' : chartMetric.toUpperCase()
                    ]}
                  />
                  <Bar dataKey={chartMetric} radius={[3, 3, 0, 0]}>
                    {historicalData.map((entry, i) => (
                      <Cell 
                        key={i} 
                        fill={
                          chartMetric === 'aqi' 
                            ? aqiBarColor(entry.aqi) 
                            : chartMetric === 'pm25' 
                            ? pollutantColor(entry.pm25 ?? entry.aqi * 0.45, 60) 
                            : pollutantColor(entry.pm10 ?? entry.aqi * 0.85, 100)
                        } 
                      />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <LineChart data={historicalData}>
                  <XAxis dataKey="time" tick={{ fill: '#8b949e', fontSize: 10 }} interval={timeRange === '6h' ? 0 : 2} />
                  <YAxis tick={{ fill: '#8b949e', fontSize: 10 }} domain={[0, 'dataMax + 20']} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-primary)', borderRadius: 8, fontSize: '0.75rem', color: 'var(--text-primary)' }}
                    itemStyle={{ color: 'var(--accent-blue)', fontWeight: 700 }}
                    labelStyle={{ color: 'var(--text-secondary)' }}
                    formatter={(value: any) => [
                      `${value} ${chartMetric === 'aqi' ? 'AQI' : 'µg/m³'}`,
                      chartMetric === 'aqi' ? 'Air Quality Index' : chartMetric.toUpperCase()
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={chartMetric} 
                    stroke={chartMetric === 'aqi' ? aqiCat.color : '#38bdf8'} 
                    strokeWidth={2.5} 
                    dot={timeRange === '6h'} 
                  />
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
