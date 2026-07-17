'use client';
import React, { useState, useEffect, useRef } from 'react';
import { delhiStations, getAqiCategory } from '@/data/mockStations';

interface SimulatorProps {
  onAlert: (station: typeof delhiStations[0] | null) => void;
}

export default function SimulatorPanel({ onAlert }: SimulatorProps) {
  const [simulating, setSimulating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [stage, setStage] = useState<'idle' | 'detecting' | 'attributing' | 'routing' | 'dispatched'>('idle');
  const [attribution, setAttribution] = useState<{ prediction_set: string[], set_size: number, confidence: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const iotSensor = delhiStations.find(s => s.source === 'iot')!;

  const startSimulation = () => {
    setSimulating(true);
    setElapsed(0);
    setStage('detecting');
    onAlert(null);

    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 100);
    }, 100);

    const payload = {
      station_id: iotSensor.id,
      timestamp: new Date().toISOString(),
      pm25: iotSensor.pm25,
      pm10: iotSensor.pm25 * 1.5,
      temp: 32.5,
      humidity: 55.0,
      pressure: 1008.2,
      wind_speed: 2.5,
      pblh: 850.0
    };

    fetch('http://127.0.0.1:8000/api/attribution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(result => setAttribution(result))
      .catch(err => console.error('Failed to fetch ML attribution:', err));

    // Stage 1: Detecting (0-8s)
    setTimeout(() => setStage('attributing'), 8000);
    // Stage 2: Attributing (8-18s)
    setTimeout(() => setStage('routing'), 18000);
    // Stage 3: Routing (18-32s)
    setTimeout(() => {
      setStage('dispatched');
      onAlert(iotSensor);
    }, 32000);
    // Complete at ~42s
    setTimeout(() => {
      setSimulating(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }, 42000);
  };

  const resetSimulation = () => {
    setSimulating(false);
    setStage('idle');
    setElapsed(0);
    onAlert(null);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const cs = Math.floor((ms % 1000) / 100);
    return `${s}.${cs}s`;
  };

  const stageLabels = {
    idle: { label: 'Ready', color: 'var(--text-muted)' },
    detecting: { label: '📡 Detecting PM spike...', color: 'var(--accent-amber)' },
    attributing: { label: '🧠 Conformal attribution...', color: 'var(--accent-blue)' },
    routing: { label: '⚙️ OR-Tools optimization...', color: 'var(--accent-purple)' },
    dispatched: { label: '✅ Enforcement dispatched!', color: 'var(--accent-green)' },
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Timer */}
      <div className="timer-display">
        <div className="timer-value">{simulating ? formatTime(elapsed) : stage === 'dispatched' ? formatTime(elapsed) : '0.0s'}</div>
        <div className="timer-label">Signal → Intervention</div>
      </div>

      {/* Stage Indicator */}
      <div className="panel" style={{ padding: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(stageLabels).filter(([k]) => k !== 'idle').map(([key, val]) => {
            const stageOrder = ['detecting', 'attributing', 'routing', 'dispatched'];
            const currentIdx = stageOrder.indexOf(stage);
            const thisIdx = stageOrder.indexOf(key);
            const isActive = stage === key;
            const isDone = thisIdx < currentIdx;

            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: '0.7rem', color: isActive ? val.color : isDone ? 'var(--accent-green)' : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 400,
                transition: 'all 0.3s ease',
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: isDone ? 'var(--accent-green)' : isActive ? val.color : 'var(--bg-elevated)',
                  border: `1px solid ${isDone ? 'var(--accent-green)' : isActive ? val.color : 'var(--border-primary)'}`,
                  boxShadow: isActive ? `0 0 8px ${val.color}` : 'none',
                }} />
                {isDone ? '✓ ' : ''}{val.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Attribution Result (shown after attributing stage) */}
      {(stage === 'routing' || stage === 'dispatched') && (
        <div className="panel slide-in" style={{ borderColor: 'var(--accent-blue)' }}>
          <div className="panel-header">
            <div className="panel-title">Attribution Result</div>
            <div className="panel-badge badge-green">{attribution ? Math.round(attribution.confidence * 100) : 90}% Coverage</div>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <div>PM2.5/PM10 ratio: <strong style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>{(iotSensor.pm25 / (iotSensor.pm25 * 1.5)).toFixed(2)}</strong></div>
            <div>Conformal set: <strong style={{ color: 'var(--accent-green)' }}>{`{${attribution ? attribution.prediction_set.join(', ') : 'biomass_burning'}}`}</strong> — Set size: {attribution ? attribution.set_size : 1}</div>
            <div>Confidence: <strong style={{ fontFamily: 'var(--font-mono)' }}>{attribution ? Math.round(attribution.confidence * 100) : 92}%</strong> → <span style={{ color: 'var(--accent-blue)' }}>FULL_INSPECTION</span></div>
          </div>
        </div>
      )}

      {/* Action Button */}
      {!simulating && stage !== 'dispatched' ? (
        <button className="simulate-btn" onClick={startSimulation}>
          🔥 Simulate Spot Event
        </button>
      ) : stage === 'dispatched' ? (
        <button className="simulate-btn" onClick={resetSimulation} style={{ borderColor: 'var(--accent-blue)', color: 'var(--accent-blue)', background: 'rgba(56,139,253,0.1)' }}>
          ↻ Reset Simulation
        </button>
      ) : (
        <button className="simulate-btn active" disabled>
          ⏱ Simulation Running...
        </button>
      )}
    </div>
  );
}
