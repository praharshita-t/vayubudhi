import React, { useState, useEffect } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine,
  PieChart, Pie, Legend,
  LineChart, Line
} from 'recharts';

export default function DeepDivePanel({ district, city, onReset }: { district: any, city: string, onReset: () => void }) {
  const [attribution, setAttribution] = useState<any>(null);
  const [fingerprint, setFingerprint] = useState<any>(null);
  const [shap, setShap] = useState<any>(null);
  const [diurnal, setDiurnal] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Simulation states
  const [simTraffic, setSimTraffic] = useState(0);
  const [simDust, setSimDust] = useState(0);
  const [simIndustrial, setSimIndustrial] = useState(0);
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    if (!district) return;
    
    setLoading(true);
    const payload = {
      station_id: district.id,
      timestamp: new Date().toISOString(),
      pm25: district.pm25,
      pm10: district.pm10 || (district.pm25 * 1.5),
      temp: district.temp || 32.5,
      humidity: district.humidity || 55.0,
      pressure: district.pressure || 1008.2,
      wind_speed: district.wind_speed || 2.5,
      pblh: district.pblh || 850.0,
      lat: district.lat || 17.4156,
      lon: district.lon || 78.4736
    };

    // 1. Fetch Attribution & Geospatial Evidence
    fetch('http://127.0.0.1:8000/api/attribution', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(res => res.json())
      .then(data => setAttribution(data))
      .catch(err => console.error("Failed to fetch ML attribution", err));

    // 2. Fetch Fingerprint Radar
    fetch('http://127.0.0.1:8000/api/attribution/fingerprint', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(res => res.json())
      .then(data => setFingerprint(data))
      .catch(err => console.error("Failed to fetch fingerprint", err));

    // 3. Fetch SHAP values
    fetch(`http://127.0.0.1:8000/api/forecast/shap?horizon=24`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(res => res.json())
      .then(data => setShap(data))
      .catch(err => console.error("Failed to fetch SHAP", err));

    // 4. Fetch Diurnal
    fetch(`http://127.0.0.1:8000/api/forecast/diurnal?lat=${payload.lat}&lon=${payload.lon}`, { method: 'POST' })
      .then(res => res.json())
      .then(data => setDiurnal(data))
      .catch(err => console.error("Failed to fetch Diurnal", err));

    setLoading(false);
  }, [district]);

  // Handle Simulation
  useEffect(() => {
    if (!district || (simTraffic === 0 && simDust === 0 && simIndustrial === 0)) {
        setSimResult(null);
        return;
    }
    
    setSimLoading(true);
    // Debounce this in a real app, but for now we just call it
    const timer = setTimeout(() => {
      const baseline = {
        station_id: district.id, timestamp: new Date().toISOString(),
        pm25: district.pm25, pm10: district.pm10 || (district.pm25 * 1.5),
        temp: district.temp || 32.5, humidity: district.humidity || 55.0,
        pressure: district.pressure || 1008.2, wind_speed: district.wind_speed || 2.5, pblh: district.pblh || 850.0
      };
      
      const simulated = { ...baseline };
      simulated.pm25 = simulated.pm25 * (1 - (simTraffic * 0.4 + simDust * 0.3 + simIndustrial * 0.3) / 100);
      simulated.pm10 = simulated.pm10 * (1 - (simTraffic * 0.2 + simDust * 0.7 + simIndustrial * 0.1) / 100);

      fetch('http://127.0.0.1:8000/api/intervention/simulate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseline, simulated })
      })
      .then(res => res.json())
      .then(data => { setSimResult(data); setSimLoading(false); })
      .catch(err => { console.error("Sim failed", err); setSimLoading(false); });
    }, 500);
    return () => clearTimeout(timer);
  }, [simTraffic, simDust, simIndustrial, district]);

  if (!district) return null;

  // Pie chart data derived from sub-indices formula approximation
  const pieData = [
    { name: 'PM2.5', value: district.pm25 * 1.2, fill: 'var(--accent-red)' },
    { name: 'PM10', value: (district.pm10 || district.pm25*1.5) * 0.8, fill: 'var(--accent-orange)' },
    { name: 'NO2', value: 45, fill: 'var(--accent-blue)' },
    { name: 'SO2', value: 20, fill: 'var(--accent-yellow)' },
    { name: 'O3', value: 30, fill: 'var(--accent-cyan)' }
  ];

  return (
    <div className="fade-in" style={{ padding: '0px 20px 20px', color: '#c9d1d9', display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
            <h2 style={{ color: 'white', marginBottom: '2px', fontSize: '1.4rem' }}>{district.name || district.id}</h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hyperlocal ML Intelligence</div>
        </div>
        <button onClick={onReset} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-normal)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s' }}>
          ← Back to Map
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Section 1: Headline Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="panel" style={{ padding: '15px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '5px' }}>CURRENT AQI</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--accent-red)' }}>{district.aqi || Math.round(district.pm25 * 1.3)}</div>
            </div>
            <div className="panel" style={{ padding: '15px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '5px' }}>METEOROLOGY</div>
              <div style={{ fontSize: '0.85rem', marginBottom: '2px' }}>Temp: <span style={{ color: 'white' }}>{district.temp || 32}°C</span></div>
              <div style={{ fontSize: '0.85rem', marginBottom: '2px' }}>Wind: <span style={{ color: 'white' }}>{district.wind_speed || 2.5} m/s</span></div>
              <div style={{ fontSize: '0.85rem' }}>PBLH: <span style={{ color: 'white' }}>{district.pblh || 850} m</span></div>
            </div>
          </div>

          {/* Section 2: Attribution Bars */}
          <div className="panel">
            <div className="panel-header"><div className="panel-title">Source Attribution (CatBoost GPU)</div></div>
            <div style={{ padding: 16 }}>
                {loading ? <div style={{ color: 'var(--text-muted)' }}>Running classifier...</div> : attribution ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {Object.entries(attribution.probabilities).sort((a: any, b: any) => b[1] - a[1]).map(([source, prob]: any) => (
                        <div key={source}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                            <span style={{ textTransform: 'capitalize', color: 'white' }}>{source.replace('_', ' ')}</span>
                            <span>{(prob * 100).toFixed(1)}%</span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${prob * 100}%`, height: '100%', background: attribution.prediction_set.includes(source) ? 'var(--accent-red)' : 'var(--accent-cyan)' }} />
                            </div>
                        </div>
                        ))}
                    </div>
                ) : null}
            </div>
          </div>

          {/* Section 7: Geospatial Evidence */}
          {attribution?.geospatial_evidence && (
            <div className="panel">
                <div className="panel-header"><div className="panel-title">Satellite & Geospatial Cross-Check</div></div>
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(attribution.geospatial_evidence).map(([key, val]: any) => (
                        <div key={key} style={{ background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: 6, fontSize: '0.75rem' }}>
                            <strong style={{ color: 'var(--accent-blue)', display: 'block', marginBottom: 2 }}>{key.replace(/_/g, ' ')}</strong>
                            <span style={{ color: 'var(--text-normal)' }}>{val}</span>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {/* Section 5: Pollutant Breakdown */}
          <div className="panel">
            <div className="panel-header"><div className="panel-title">Sub-Index Breakdown</div></div>
            <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie data={pieData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#161b22', border: 'none', borderRadius: 6, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Section 3: Fingerprint Radar */}
            <div className="panel">
                <div className="panel-header"><div className="panel-title">Pollutant Fingerprint Radar</div></div>
                <div style={{ width: '100%', height: 250, marginTop: 10 }}>
                    {fingerprint ? (
                        <ResponsiveContainer>
                            <RadarChart outerRadius={90} data={Object.keys(fingerprint[0]).filter(k=>k!=='name').map(k => ({ subject: k, A: fingerprint[0][k], B: fingerprint[1][k] }))}>
                                <PolarGrid stroke="#30363d" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#8b949e', fontSize: 10 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="Current" dataKey="A" stroke="#388bfd" fill="#388bfd" fillOpacity={0.4} />
                                <Radar name="Reference (Vehicular)" dataKey="B" stroke="#f85149" fill="none" strokeDasharray="3 3" />
                                <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    ) : <div style={{ padding: 20, textAlign: 'center' }}>Loading Fingerprint...</div>}
                </div>
            </div>

            {/* Section 4: SHAP Feature Importance */}
            <div className="panel">
                <div className="panel-header"><div className="panel-title">SHAP Explainer (Why is AQI high?)</div></div>
                <div style={{ width: '100%', height: 200, padding: '10px 0' }}>
                    {shap ? (
                        <ResponsiveContainer>
                            <BarChart data={shap.features.slice(0,6)} layout="vertical" margin={{ left: 30, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#21262d" />
                                <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 10 }} />
                                <YAxis dataKey="feature" type="category" tick={{ fill: '#e6edf3', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#161b22', border: 'none', borderRadius: 4, fontSize: 11 }} />
                                <Bar dataKey="value" name="SHAP Value (+/- AQI)">
                                    {shap.features.slice(0,6).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.value > 0 ? 'var(--accent-red)' : 'var(--accent-green)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <div style={{ padding: 20, textAlign: 'center' }}>Loading SHAP values...</div>}
                </div>
            </div>

            {/* Section 8: Intervention Simulator */}
            <div className="panel" style={{ border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <div className="panel-header" style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '10px 16px' }}>
                    <div className="panel-title" style={{ color: '#ef4444' }}>Policy Intervention Simulator</div>
                </div>
                <div style={{ padding: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                { label: 'Traffic Restriction (%)', val: simTraffic, set: setSimTraffic, color: 'var(--accent-blue)' },
                                { label: 'Dust Suppression (%)', val: simDust, set: setSimDust, color: 'var(--accent-orange)' },
                                { label: 'Industrial Cap (%)', val: simIndustrial, set: setSimIndustrial, color: 'var(--accent-red)' },
                            ].map((s, i) => (
                                <div key={i}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 6 }}>
                                        <span>{s.label}</span>
                                        <span style={{ color: s.color, fontWeight: 'bold' }}>{s.val}%</span>
                                    </div>
                                    <input type="range" min="0" max="100" value={s.val} onChange={e => s.set(parseInt(e.target.value))} style={{ width: '100%', accentColor: s.color }} />
                                </div>
                            ))}
                            <button onClick={() => {setSimTraffic(0); setSimDust(0); setSimIndustrial(0);}} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '4px', borderRadius: 4, cursor: 'pointer', fontSize: '0.7rem', marginTop: 8 }}>Reset Sliders</button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border-primary)', padding: 16 }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{simTraffic > 0 || simDust > 0 || simIndustrial > 0 ? 'Projected +24h AQI' : 'Baseline +24h AQI'}</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: (simResult && simResult.delta[0] < -10) ? 'var(--accent-green)' : 'var(--text-normal)' }}>
                                {simLoading ? '...' : (simResult ? Math.round(simResult.simulated_forecast[0]) : Math.round(district.aqi || 150))}
                            </div>
                            {(simResult && simResult.delta[0] !== 0) && (
                                <div style={{ fontSize: '0.85rem', color: 'var(--accent-green)', marginTop: 4, fontWeight: 600 }}>
                                    {Math.round(simResult.delta[0])} points
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}
