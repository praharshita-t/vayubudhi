'use client';
import React, { useEffect, useRef } from 'react';
import { useCityContext } from '@/context/CityContext';
import { LogLevel, useSimulation } from '@/context/SimulationContext';

interface SimulatorProps {
  onAlert?: (station: any | null) => void;
  city?: string;
  cityData?: any;
  liveData?: any;
}

const LOG_COLORS: Record<LogLevel, string> = {
  info: 'var(--text-muted)',
  success: 'var(--accent-green)',
  warn: 'var(--accent-amber)',
  error: 'var(--accent-red)',
};

export default function SimulatorPanel(_props: SimulatorProps) {
  const { cityData } = useCityContext();
  const {
    simulating,
    elapsed,
    stage,
    attribution,
    events,
    startSimulation,
    resetSimulation,
  } = useSimulation();
  const logEndRef = useRef<HTMLDivElement | null>(null);

  const stations = cityData ? cityData.stations : [];
  const iotSensor = stations.find((s: any) => s.source === 'deployed' || s.source === 'iot') || stations[0];

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const cs = Math.floor((ms % 1000) / 100);
    return `${s}.${cs}s`;
  };

  const stageLabels = {
    idle: { label: 'Ready', color: 'var(--text-muted)' },
    detecting: { label: 'Detecting PM spike...', color: 'var(--accent-amber)' },
    attributing: { label: 'Conformal attribution...', color: 'var(--accent-blue)' },
    routing: { label: 'OR-Tools optimization...', color: 'var(--accent-purple)' },
    dispatched: { label: 'Enforcement dispatched', color: 'var(--accent-green)' },
  };

  const showAttribution = stage === 'attributing' || stage === 'routing' || stage === 'dispatched';

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="timer-display">
        <div className="timer-value">{simulating || stage === 'dispatched' ? formatTime(elapsed) : '0.0s'}</div>
        <div className="timer-label">Signal → Intervention</div>
      </div>

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
                fontSize: '0.7rem',
                color: isActive ? val.color : isDone ? 'var(--accent-green)' : 'var(--text-muted)',
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

      <div className="panel pipeline-log-panel">
        <div className="panel-header">
          <div className="panel-title">Live pipeline log</div>
          <div className="panel-badge">{events.length ? `${events.length} events` : 'idle'}</div>
        </div>
        <div className="pipeline-log">
          {events.length === 0 ? (
            <div className="pipeline-log-empty">Waiting for Simulate Spot Event…</div>
          ) : (
            events.map((ev, i) => (
              <div key={`${ev.ts}-${i}`} className="pipeline-log-line" style={{ color: LOG_COLORS[ev.level] }}>
                <span className="pipeline-log-ts">[{formatTime(ev.ts)}]</span>{' '}
                {ev.message}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>

      {showAttribution && attribution && (
        <div className="panel slide-in" style={{ borderColor: 'var(--accent-blue)' }}>
          <div className="panel-header">
            <div className="panel-title">Attribution Result</div>
            <div className="panel-badge badge-green">{Math.round(attribution.confidence * 100)}% Coverage</div>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <div>PM2.5/PM10 ratio: <strong style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>{iotSensor ? (iotSensor.pm25 / (iotSensor.pm10 || iotSensor.pm25 * 1.5)).toFixed(2) : '—'}</strong></div>
            <div>Conformal set: <strong style={{ color: 'var(--accent-green)' }}>{`{${attribution.prediction_set.join(', ')}}`}</strong> — Set size: {attribution.set_size}</div>
            <div>Confidence: <strong style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(attribution.confidence * 100)}%</strong> → <span style={{ color: 'var(--accent-blue)' }}>FULL_INSPECTION</span></div>
          </div>
        </div>
      )}

      {!simulating && stage !== 'dispatched' ? (
        <button className="simulate-btn" onClick={startSimulation}>
          Simulate Spot Event
        </button>
      ) : stage === 'dispatched' && !simulating ? (
        <button
          className="simulate-btn"
          onClick={resetSimulation}
          style={{ borderColor: 'var(--accent-blue)', color: 'var(--accent-blue)', background: 'rgba(56,139,253,0.1)' }}
        >
          ↻ Reset Simulation
        </button>
      ) : (
        <button className="simulate-btn active" disabled>
          Simulation Running...
        </button>
      )}
    </div>
  );
}
