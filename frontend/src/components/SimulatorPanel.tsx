'use client';
import React, { useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
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
        <div className="timer-value">{simulating || stage === 'dispatched' ? formatTime(elapsed) : '13.4s'}</div>
        <div className="timer-label">Signal → Intervention</div>
        <div style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', marginTop: 4, letterSpacing: '0.04em', fontWeight: 600 }}>
          Zero-Latency Autonomous Closed Loop • Replaces 4-Hour Manual Bureaucracy
        </div>
      </div>

      <div className="panel" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { key: 'detecting', label: '1. Ingestion & Spike Detection', time: '+1.8s', color: 'var(--accent-amber)' },
            { key: 'attributing', label: '2. Conformal AI Attribution', time: '+3.7s', color: 'var(--accent-blue)' },
            { key: 'routing', label: '3. OR-Tools CVRP Route Solver', time: '+8.0s', color: 'var(--accent-purple)' },
            { key: 'dispatched', label: '4. Autonomous Field Dispatch', time: '+11.9s', color: 'var(--accent-green)' },
          ].map((step) => {
            const stageOrder = ['detecting', 'attributing', 'routing', 'dispatched'];
            const currentIdx = stageOrder.indexOf(stage);
            const thisIdx = stageOrder.indexOf(step.key);
            const isActive = stage === step.key;
            const isDone = thisIdx < currentIdx || stage === 'dispatched';

            return (
              <div key={step.key} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: '10px 12px',
                borderRadius: '8px',
                background: isDone ? 'rgba(34, 197, 94, 0.08)' : isActive ? 'rgba(56, 189, 248, 0.1)' : 'var(--bg-elevated)',
                border: `1px solid ${isDone ? 'rgba(34, 197, 94, 0.3)' : isActive ? 'var(--accent-cyan)' : 'var(--border-primary)'}`,
                transition: 'all 0.3s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: isDone ? 'var(--accent-green)' : isActive ? step.color : 'var(--text-muted)' }}>
                    {isDone ? 'COMPLETED' : isActive ? 'EXECUTING' : 'STANDBY'}
                  </span>
                  <span style={{ fontSize: '0.58rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{step.time}</span>
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: isDone || isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {step.label}
                </div>
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
        <div className="panel slide-in" style={{ borderColor: 'var(--accent-blue)', padding: '16px' }}>
          <div className="panel-header" style={{ marginBottom: 12 }}>
            <div>
              <div className="panel-title">Conformal Source Attribution & Audit</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>CatBoost Classifier • 90% Conformal Prediction Set</div>
            </div>
            <div className="panel-badge badge-green">{Math.round(attribution.confidence * 100)}% Coverage Guarantee</div>
          </div>
          
          {/* Source distribution visual split bar */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginBottom: 4, fontWeight: 600 }}>
              <span style={{ color: '#ef4444' }}>Industrial Emissions: 54%</span>
              <span style={{ color: 'var(--accent-cyan)' }}>Vehicular Exhaust: 46%</span>
            </div>
            <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: '54%', background: '#ef4444' }} />
              <div style={{ width: '46%', background: 'var(--accent-cyan)' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, fontSize: '0.72rem', background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: 6 }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>PM2.5 / PM10 RATIO</div>
              <div style={{ color: 'var(--accent-amber)', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>
                {iotSensor ? (iotSensor.pm25 / (iotSensor.pm10 || iotSensor.pm25 * 1.5)).toFixed(2) : '0.74'}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>CONFORMAL SET</div>
              <div style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: '0.85rem' }}>
                {`{${attribution.prediction_set.join(', ')}}`}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>DISPATCH DIRECTIVE</div>
              <div style={{ color: 'var(--accent-blue)', fontWeight: 700, fontSize: '0.85rem' }}>
                FULL_INSPECTION (Priority Tier-1)
              </div>
            </div>
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
          style={{ borderColor: 'var(--accent-blue)', color: 'var(--accent-blue)', background: 'rgba(56,139,253,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <RotateCcw size={14} />
          <span>Reset Simulation</span>
        </button>
      ) : (
        <button className="simulate-btn active" disabled>
          Simulation Running...
        </button>
      )}
    </div>
  );
}
