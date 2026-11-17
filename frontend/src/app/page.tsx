'use client';
import React, { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useCityContext } from '@/context/CityContext';
import { getAqiCategory } from '@/utils/aqi';
import { CityId } from '@/types';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ── Health recommendations by AQI band ──
// ── Health recommendations by AQI band ──
function getHealthInfo(aqi: number, standard: string = 'IN_NAQI') {
  if (standard === 'US_EPA') {
    if (aqi <= 50) return {
      icon: '✅', title: 'Air quality is Good',
      message: 'Air quality is satisfactory, and air pollution poses little or no risk. Ideal for outdoor activity.',
      bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', color: '#22c55e'
    };
    if (aqi <= 100) return {
      icon: '🟢', title: 'Air quality is Moderate',
      message: 'Air quality is acceptable. Unusually sensitive individuals should consider limiting prolonged outdoor exertion.',
      bg: 'rgba(132,204,22,0.1)', border: 'rgba(132,204,22,0.3)', color: '#84cc16'
    };
    if (aqi <= 150) return {
      icon: '⚠️', title: 'Unhealthy for Sensitive Groups',
      message: 'Sensitive groups (children, elderly, people with asthma/heart disease) may experience health effects. General public not likely affected.',
      bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', color: '#f59e0b'
    };
    if (aqi <= 200) return {
      icon: '🟠', title: 'Air quality is Unhealthy',
      message: 'Some members of the general public may experience health effects; sensitive groups may experience more serious health effects. Reduce heavy exertion.',
      bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', color: '#f97316'
    };
    if (aqi <= 300) return {
      icon: '🔴', title: 'Air quality is Very Unhealthy',
      message: 'Health alert: Increased risk of adverse health effects for everyone. Avoid prolonged or heavy exertion outdoors. Keep windows closed.',
      bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#ef4444'
    };
    return {
      icon: '🚨', title: 'Air quality is Hazardous',
      message: 'Health warning of emergency conditions: everyone is more likely to be affected. Remain indoors, use air purifiers, and wear N95 masks if outdoors.',
      bg: 'rgba(126,34,206,0.15)', border: 'rgba(126,34,206,0.35)', color: '#a855f7'
    };
  }

  // India NAQI (CPCB 2014)
  if (aqi <= 50) return {
    icon: '✅', title: 'Air quality is Good',
    message: 'Air quality is satisfactory. Minimal health impact. Enjoy outdoor activities freely.',
    bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', color: '#22c55e'
  };
  if (aqi <= 100) return {
    icon: '🟢', title: 'Air quality is Satisfactory',
    message: 'Acceptable quality. Minor breathing discomfort to sensitive people.',
    bg: 'rgba(132,204,22,0.1)', border: 'rgba(132,204,22,0.3)', color: '#84cc16'
  };
  if (aqi <= 200) return {
    icon: '⚠️', title: 'Air quality is Moderate',
    message: 'Breathing discomfort to people with lung disease (such as asthma) and discomfort to people with heart disease, children, and older adults.',
    bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', color: '#f59e0b'
  };
  if (aqi <= 300) return {
    icon: '🟠', title: 'Air quality is Poor',
    message: 'Breathing discomfort to most people on prolonged exposure. Avoid heavy outdoor exertion. Use an N95 mask outdoors.',
    bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', color: '#f97316'
  };
  if (aqi <= 400) return {
    icon: '🔴', title: 'Air quality is Very Poor',
    message: 'Respiratory illness on prolonged exposure. Significant effect for people with lung or heart diseases. Keep windows closed.',
    bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#ef4444'
  };
  return {
    icon: '🚨', title: 'Air quality is Severe — Emergency',
    message: 'Affects healthy people and seriously impacts those with existing diseases. Everyone should avoid going outdoors. Emergency action recommended.',
    bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.3)', color: '#dc2626'
  };
}

// ── Pollutant safe limits (India NAAQS 24h avg) ──
const POLLUTANT_LIMITS: Record<string, { limit: number; unit: string; label: string }> = {
  pm25: { limit: 60, unit: 'µg/m³', label: 'PM2.5' },
  pm10: { limit: 100, unit: 'µg/m³', label: 'PM10' },
  no2:  { limit: 80, unit: 'µg/m³', label: 'NO₂' },
  so2:  { limit: 80, unit: 'µg/m³', label: 'SO₂' },
  co:   { limit: 4, unit: 'mg/m³', label: 'CO' },
  o3:   { limit: 100, unit: 'µg/m³', label: 'O₃' },
};

// ── Color formatting helpers ──

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
  const {
    activeCity,
    setActiveCity,
    cityData,
    liveData,
    stations,
    districts,
    liveLoading,
    aqiStandard,
    setAqiStandard,
  } = useCityContext();
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  const [timeRange, setTimeRange] = useState<'6h' | '12h' | '24h'>('24h');
  const [chartMetric, setChartMetric] = useState<'aqi' | 'pm25' | 'pm10'>('aqi');
  const [realHistory, setRealHistory] = useState<any[]>([]);


  // Fetch real 24-hour historical hourly telemetry from the live API
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/city-historical?city=${activeCity}`);
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

  // Compute aggregate metrics from genuine monitored stations only
  const avgAqi = useMemo(() => {
    // If backend provided city-level center AQI for this standard, use it if available
    if (cityData) {
      const cityVal = aqiStandard === 'US_EPA' ? (cityData.center_aqi_us ?? cityData.aqi_us) : (cityData.center_aqi_in ?? cityData.aqi_in);
      if (typeof cityVal === 'number' && cityVal > 0) {
        return Math.round(cityVal);
      }
    }
    const monitored = stations.filter((s: any) => s.monitored !== false);
    const pool = monitored.length > 0 ? monitored : stations;
    const validStations = pool.filter((st: any) => {
      const v = aqiStandard === 'US_EPA' ? (st.aqi_us ?? st.aqi) : (st.aqi_in ?? st.aqi);
      return typeof v === 'number' && !isNaN(v);
    });
    if (validStations.length === 0) return 0;
    return Math.round(
      validStations.reduce((s: number, st: any) => {
        const val = aqiStandard === 'US_EPA' ? (st.aqi_us ?? st.aqi ?? 0) : (st.aqi_in ?? st.aqi ?? 0);
        return s + val;
      }, 0) / validStations.length
    );
  }, [cityData, stations, aqiStandard]);

  const avgPm25 = useMemo(() => {
    const valid = stations.filter((s: any) => s.monitored !== false && typeof s.pm25 === 'number' && !isNaN(s.pm25));
    if (valid.length === 0) return 0;
    return Math.round(valid.reduce((s, st) => s + (st.pm25 ?? 0), 0) / valid.length);
  }, [stations]);

  const avgPm10 = useMemo(() => {
    const valid = stations.filter((s: any) => s.monitored !== false && typeof s.pm10 === 'number' && !isNaN(s.pm10));
    if (valid.length === 0) return 0;
    return Math.round(valid.reduce((s, st) => s + (st.pm10 ?? 0), 0) / valid.length);
  }, [stations]);

  const avgPollutants = useMemo(() => {
    const valid = stations.filter((s: any) => s.monitored !== false);
    if (valid.length === 0) return { no2: 0, so2: 0, co: 0, o3: 0, pm25: 0, pm10: 0 };
    const getAvg = (field: string) => {
      const items = valid.filter((s: any) => typeof s[field] === 'number' && !isNaN(s[field]));
      if (items.length === 0) return 0;
      return items.reduce((acc, it: any) => acc + it[field], 0) / items.length;
    };
    return {
      pm25: Math.round(getAvg('pm25')),
      pm10: Math.round(getAvg('pm10')),
      no2: Math.round(getAvg('no2')),
      so2: Math.round(getAvg('so2')),
      co: +getAvg('co').toFixed(1),
      o3: Math.round(getAvg('o3')),
    };
  }, [stations]);

  // Weather: avg from stations that have weather data
  const weather = useMemo(() => {
    const withWeather = stations.filter((s: any) => ['temp', 'humidity', 'wind_speed', 'pressure'].every((key) => typeof s[key] === 'number'));
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
    // Return empty array when no historical telemetry is logged yet
    return [];
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

  const forecastData = useMemo(() => {
    if (liveData?.forecast?.points && Array.isArray(liveData.forecast.points) && liveData.forecast.points.length >= 3) {
      return [
        { hour: 'Now', aqi: Math.round(avgAqi) },
        { hour: '+24h', aqi: Math.round(liveData.forecast.points[0]) },
        { hour: '+48h', aqi: Math.round(liveData.forecast.points[1]) },
        { hour: '+72h', aqi: Math.round(liveData.forecast.points[2]) }
      ];
    }
    return [
      { hour: 'Now', aqi: Math.round(avgAqi) }
    ];
  }, [liveData, avgAqi]);

  const forecastEnd = forecastData[forecastData.length - 1]?.aqi ?? avgAqi;
  const trendUp = forecastEnd > avgAqi;

  const aqiCat = getAqiCategory(avgAqi, aqiStandard);
  const healthInfo = getHealthInfo(avgAqi, aqiStandard);

  const scalePosition = useMemo(() => {
    if (avgAqi <= 50) return (avgAqi / 50) * 16.66;
    if (avgAqi <= 100) return 16.66 + ((avgAqi - 50) / 50) * 16.66;
    if (avgAqi <= 150) return 33.33 + ((avgAqi - 100) / 50) * 16.66;
    if (avgAqi <= 200) return 50.0 + ((avgAqi - 150) / 50) * 16.66;
    if (avgAqi <= 300) return 66.66 + ((avgAqi - 200) / 100) * 16.66;
    return Math.min(100, 83.33 + ((avgAqi - 300) / 200) * 16.66);
  }, [avgAqi]);

  // Filter and sort only genuinely monitored municipal wards for leaderboard
  const monitoredDistricts = useMemo(() => {
    return districts.filter((d: any) => {
      if (d.monitored === false) return false;
      const v = aqiStandard === 'US_EPA' ? (d.aqi_us ?? d.aqi) : (d.aqi_in ?? d.aqi);
      return typeof v === 'number' && !isNaN(v);
    });
  }, [districts, aqiStandard]);

  const unmonitoredWardsCount = useMemo(() => {
    return districts.filter((d: any) => d.monitored === false).length;
  }, [districts]);

  const sortedDistricts = useMemo(() => {
    return [...monitoredDistricts].sort((a, b) => {
      const aVal = aqiStandard === 'US_EPA' ? (a.aqi_us ?? a.aqi ?? 0) : (a.aqi_in ?? a.aqi ?? 0);
      const bVal = aqiStandard === 'US_EPA' ? (b.aqi_us ?? b.aqi ?? 0) : (b.aqi_in ?? b.aqi ?? 0);
      return aVal - bVal;
    });
  }, [monitoredDistricts, aqiStandard]);

  const best5 = sortedDistricts.slice(0, 5);
  const worst5 = [...sortedDistricts].reverse().slice(0, 5);

  if (stations.length === 0) {
    return (
      <div className="home-page">
        <div className="home-loading">
          {liveLoading && <div className="home-loading-spinner" />}
          <div role="status">{liveLoading
            ? `Loading air quality data for ${activeCity}...`
            : `Air quality data for ${activeCity} is currently unavailable. Please try again later.`}</div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Standard Toggle */}
            <div style={{
              display: 'flex',
              background: 'var(--bg-secondary)',
              borderRadius: 6,
              border: '1px solid var(--border-primary)',
              overflow: 'hidden',
              padding: 2,
            }}>
              <button
                onClick={() => setAqiStandard('IN_NAQI')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  background: aqiStandard === 'IN_NAQI' ? 'var(--accent-primary, #3b82f6)' : 'transparent',
                  color: aqiStandard === 'IN_NAQI' ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.2s',
                }}
              >
                🇮🇳 India NAQI
              </button>
              <button
                onClick={() => setAqiStandard('US_EPA')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  background: aqiStandard === 'US_EPA' ? 'var(--accent-primary, #3b82f6)' : 'transparent',
                  color: aqiStandard === 'US_EPA' ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.2s',
                }}
              >
                🇺🇸 US EPA
              </button>
            </div>
            <div className="home-live-badge">
              <div className="dot" /> Station Observations
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="home-title">{activeCity} Air Quality Index (AQI) | Air Pollution</h1>
        <p className="home-subtitle">
          Latest reported PM2.5, PM10 air pollution level in {activeCity} ({aqiStandard === 'IN_NAQI' ? 'CPCB India NAQI Standard' : 'US EPA 40 CFR Standard'})
        </p>

        <p className="home-timestamp" suppressHydrationWarning>
          Latest station observation: {cityData?.latest_observation_time ? new Date(cityData.latest_observation_time).toLocaleString('en-IN') : 'Timestamp unavailable'} (Local Time)
        </p>

        {/* ═══ Section 1: Hero AQI Card ═══ */}
        <div className="home-hero">
          <div className="home-hero-left">
            <div className="home-aqi-indicator">
              <div className="dot" style={{ background: aqiCat.color }} /> Station AQI
            </div>
            <div className="home-aqi-value" style={{ color: aqiCat.color }}>{avgAqi}</div>
            <div className="home-aqi-unit">AQI ({aqiStandard === 'IN_NAQI' ? 'India NAQI' : 'US EPA'})</div>
          </div>

          <div className="home-hero-right">
            <div className="home-aqi-status" style={{ background: aqiCat.bg, color: aqiCat.color, border: `1px solid ${aqiCat.color}40` }}>
              <span className="home-aqi-status-label">Air Quality is</span>
              {aqiCat.label}
            </div>
            <div className="home-pm-values">
              <div className="home-pm-item">
                <div className="home-pm-label">PM2.5</div>
                <span className="home-pm-val">{stations.some((st) => st.monitored !== false && typeof st.pm25 === 'number') ? avgPm25 : '--'}</span>
                <span className="home-pm-unit">µg/m³</span>
              </div>
              <div className="home-pm-item">
                <div className="home-pm-label">PM10</div>
                <span className="home-pm-val">{stations.some((st) => st.monitored !== false && typeof st.pm10 === 'number') ? avgPm10 : '--'}</span>
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
              {aqiStandard === 'IN_NAQI' ? (
                <><span>Good</span><span>Satisfactory</span><span>Moderate</span><span>Poor</span><span>Very Poor</span><span>Severe</span></>
              ) : (
                <><span>Good</span><span>Moderate</span><span>USG</span><span>Unhealthy</span><span>Very Unhealthy</span><span>Hazardous</span></>
              )}
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
            const available = stations.some((st: any) => st.monitored !== false && typeof st[key] === 'number');
            const value = (avgPollutants as any)[key] ?? 0;
            const pct = Math.min(100, (value / info.limit) * 100);
            const clr = available ? pollutantColor(value, info.limit) : 'var(--text-muted)';
            return (
              <div className="home-pollutant-card" key={key}>
                <div className="home-pollutant-name">{info.label}</div>
                <div className="home-pollutant-value" style={{ color: clr }}>{available ? value : '--'}</div>
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
              <div className="home-leaderboard-title">🟢 Cleanest Municipal Wards ({aqiStandard === 'IN_NAQI' ? 'India NAQI' : 'US EPA'})</div>
              {best5.map((d, i) => {
                const wardAqi = Math.round(aqiStandard === 'US_EPA' ? (d.aqi_us ?? d.aqi ?? 0) : (d.aqi_in ?? d.aqi ?? 0));
                const cat = getAqiCategory(wardAqi, aqiStandard);
                return (
                  <div className="home-leaderboard-item" key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="home-leaderboard-rank">{i + 1}</span>
                      <div>
                        <span className="home-leaderboard-name">{d.name}</span>
                      </div>
                    </div>
                    <span className="home-leaderboard-aqi" style={{ color: cat.color }}>{wardAqi}</span>
                  </div>
                );
              })}
            </div>
            <div className="home-leaderboard-section">
              <div className="home-leaderboard-title">🔴 Most Polluted Municipal Wards ({aqiStandard === 'IN_NAQI' ? 'India NAQI' : 'US EPA'})</div>
              {worst5.map((d, i) => {
                const wardAqi = Math.round(aqiStandard === 'US_EPA' ? (d.aqi_us ?? d.aqi ?? 0) : (d.aqi_in ?? d.aqi ?? 0));
                const cat = getAqiCategory(wardAqi, aqiStandard);
                return (
                  <div className="home-leaderboard-item" key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="home-leaderboard-rank">{i + 1}</span>
                      <div>
                        <span className="home-leaderboard-name">{d.name}</span>
                      </div>
                    </div>
                    <span className="home-leaderboard-aqi" style={{ color: cat.color }}>{wardAqi}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {unmonitoredWardsCount > 0 && (
          <div style={{ textAlign: 'center', marginTop: 14, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            ℹ️ {unmonitoredWardsCount} municipal wards currently have no active CAAQMS center and are excluded from rankings (shaded grey on the live map referencing nearest centers).
          </div>
        )}

      </div>
    </div>
  );
}
