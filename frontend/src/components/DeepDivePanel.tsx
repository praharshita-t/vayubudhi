import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function DeepDivePanel({ district, city, onReset }: { district: any, city: string, onReset: () => void }) {
  const [attribution, setAttribution] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // When the district changes, make a live API call to our Random Forest Attribution Model!
  useEffect(() => {
    if (!district) return;
    
    setLoading(true);
    const payload = {
      station_id: district.id,
      timestamp: new Date().toISOString(),
      pm25: district.pm25,
      pm10: district.pm10,
      temp: district.temp,
      humidity: district.humidity,
      pressure: district.pressure,
      wind_speed: district.wind_speed,
      pblh: district.pblh
    };

    fetch('http://127.0.0.1:8000/api/attribution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        setAttribution(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch ML attribution", err);
        setLoading(false);
      });
  }, [district]);

  const [simulatedAqi, setSimulatedAqi] = useState<number | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  const runIntervention = () => {
    setSimLoading(true);
    // Simulate a 40% reduction in traffic/PM/NO2
    const payload = {
      station_id: district.id,
      timestamp: new Date().toISOString(),
      pm25: district.pm25 * 0.6,
      pm10: district.pm10 * 0.6,
      temp: district.temp,
      humidity: district.humidity,
      pressure: district.pressure,
      wind_speed: district.wind_speed,
      pblh: district.pblh
    };

    fetch('http://127.0.0.1:8000/api/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        setSimulatedAqi(data.point);
        setSimLoading(false);
      })
      .catch(err => {
        console.error("Failed to simulate", err);
        setSimLoading(false);
      });
  };

  if (!district) return null;

  return (
    <div style={{ padding: '20px', color: '#c9d1d9' }}>
      <button 
        onClick={onReset}
        style={{ background: 'transparent', border: '1px solid #30363d', color: '#8b949e', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', marginBottom: '15px', fontSize: '0.8rem' }}
      >
        ← Back to City Map
      </button>
      <h2 style={{ color: 'white', marginBottom: '5px', fontSize: '1.4rem' }}>{district.name}</h2>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Hyperlocal ML Analysis
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '25px' }}>
        <div style={{ padding: '15px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '5px' }}>PREDICTED AQI</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-red)' }}>{district.aqi}</div>
        </div>
        <div style={{ padding: '15px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '5px' }}>METEOROLOGY</div>
          <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>Temp: <span style={{ color: 'white' }}>{district.temp}°C</span></div>
          <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>Wind: <span style={{ color: 'white' }}>{district.wind_speed} m/s</span></div>
          <div style={{ fontSize: '0.9rem' }}>PBLH: <span style={{ color: 'white' }}>{district.pblh} m</span></div>
        </div>
      </div>

      <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '15px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '8px' }}>
        Live Source Attribution
      </h3>
      
      {loading ? (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 10px' }} />
          Executing Random Forest...
        </div>
      ) : attribution ? (
        <div>
          <p style={{ fontSize: '0.85rem', marginBottom: '15px' }}>
            Based on current physics, the model identifies <strong style={{color: 'white'}}>{attribution.prediction_set.join(', ')}</strong> as the primary polluter(s) with {(attribution.confidence * 100).toFixed(1)}% statistical confidence.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(attribution.probabilities).sort((a: any, b: any) => b[1] - a[1]).map(([source, prob]: any) => (
              <div key={source}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                  <span style={{ textTransform: 'capitalize', color: 'white' }}>{source.replace('_', ' ')}</span>
                  <span>{(prob * 100).toFixed(1)}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#1c2128', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${prob * 100}%`, 
                    height: '100%', 
                    background: attribution.prediction_set.includes(source) ? 'var(--accent-red)' : 'var(--accent-cyan)' 
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ color: 'var(--accent-red)' }}>Failed to load attribution model.</p>
      )}
      
      <div style={{ marginTop: '40px', padding: '15px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)' }}>
        <h4 style={{ color: '#ef4444', marginBottom: '10px' }}>Simulate Intervention</h4>
        <p style={{ fontSize: '0.8rem', marginBottom: '15px' }}>Test the impact of a targeted traffic and construction ban in this zone:</p>
        
        {simulatedAqi ? (
          <div style={{ padding: '15px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.8rem', color: '#22c55e', marginBottom: '5px' }}>PROJECTED AQI AFTER BAN</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#22c55e' }}>{Math.round(simulatedAqi)}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>
              A reduction of {district.aqi - Math.round(simulatedAqi)} AQI points.
            </div>
            <button onClick={() => setSimulatedAqi(null)} style={{ marginTop: '10px', padding: '6px 12px', background: 'transparent', border: '1px solid #22c55e', color: '#22c55e', borderRadius: '4px', cursor: 'pointer' }}>
              Reset
            </button>
          </div>
        ) : (
          <button 
            onClick={runIntervention}
            disabled={simLoading}
            style={{ 
              width: '100%', padding: '10px', background: '#ef4444', color: 'white', 
              border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer',
              opacity: simLoading ? 0.7 : 1
            }}>
            {simLoading ? 'Simulating...' : 'Initiate Traffic Diversion'}
          </button>
        )}
      </div>
    </div>
  );
}
