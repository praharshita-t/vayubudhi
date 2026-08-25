'use client';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useCityContext } from '@/context/CityContext';

export type LogLevel = 'info' | 'success' | 'warn' | 'error';
export type SimLogEvent = { ts: number; message: string; level: LogLevel };
export type Stage = 'idle' | 'detecting' | 'attributing' | 'routing' | 'dispatched';
export type AttributionResult = { prediction_set: string[]; set_size: number; confidence: number };

interface SimulationContextType {
  simulating: boolean;
  elapsed: number;
  stage: Stage;
  attribution: AttributionResult | null;
  events: SimLogEvent[];
  alertStation: any | null;
  startSimulation: () => Promise<void>;
  resetSimulation: () => void;
}

const SimulationContext = createContext<SimulationContextType | null>(null);

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used within SimulationProvider');
  return ctx;
}

const API_BASE = 'http://127.0.0.1:8000/api';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const { activeCity, cityData } = useCityContext();
  const [simulating, setSimulating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [stage, setStage] = useState<Stage>('idle');
  const [attribution, setAttribution] = useState<AttributionResult | null>(null);
  const [events, setEvents] = useState<SimLogEvent[]>([]);
  const [alertStation, setAlertStation] = useState<any | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const runIdRef = useRef(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    elapsedRef.current = 0;
    setElapsed(0);
    timerRef.current = setInterval(() => {
      elapsedRef.current += 100;
      setElapsed(elapsedRef.current);
    }, 100);
  }, [stopTimer]);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const resetSimulation = useCallback(() => {
    runIdRef.current += 1;
    setSimulating(false);
    setStage('idle');
    setElapsed(0);
    elapsedRef.current = 0;
    setEvents([]);
    setAttribution(null);
    setAlertStation(null);
    stopTimer();
  }, [stopTimer]);

  const startSimulation = useCallback(async () => {
    const stations = cityData ? cityData.stations : [];
    const iotSensor = stations.find((s: any) => s.source === 'deployed' || s.source === 'iot') || stations[0];

    if (!cityData || !stations.length || !iotSensor) {
      setEvents([{ ts: 0, message: 'No city data / stations available — aborting simulation.', level: 'error' }]);
      return;
    }

    runIdRef.current += 1;
    const runId = runIdRef.current;
    const stillRunning = () => runId === runIdRef.current;

    const appendLog = (message: string, level: LogLevel = 'info') => {
      if (!stillRunning()) return;
      const ts = elapsedRef.current;
      setEvents((prev) => [...prev, { ts, message, level }]);
    };

    setEvents([]);
    setAttribution(null);
    setAlertStation(null);
    setSimulating(true);
    setStage('detecting');
    startTimer();

    try {
      appendLog(`▶ Simulation started — monitoring IoT sensor ${iotSensor.id} (${iotSensor.name}${activeCity ? `, ${activeCity}` : ''})`);
      await sleep(1800);
      if (!stillRunning()) return;

      const pm25 = Number(iotSensor.pm25 ?? 0);
      appendLog(`PM2.5 spike detected: ${pm25.toFixed(1)} µg/m³ (baseline threshold exceeded)`, 'warn');
      await sleep(1800);
      if (!stillRunning()) return;

      setStage('attributing');
      appendLog('POST /api/attribution — running CatBoost conformal classifier…');
      appendLog('Waiting for attribution API…');

      const attrPayload = {
        station_id: iotSensor.id,
        timestamp: new Date().toISOString(),
        pm25: iotSensor.pm25,
        pm10: iotSensor.pm10 || iotSensor.pm25 * 1.5,
        temp: iotSensor.temp || 32.5,
        humidity: iotSensor.humidity || 55.0,
        pressure: iotSensor.pressure || 1008.2,
        wind_speed: iotSensor.wind_speed || 2.5,
        pblh: iotSensor.pblh || 850.0,
        lat: iotSensor.lat,
        lon: iotSensor.lon,
        no2: iotSensor.no2 || 25.0,
        so2: iotSensor.so2 || 10.0,
        co: iotSensor.co || 1.0,
        o3: iotSensor.o3 || 35.0,
      };

      const attrRes = await fetch(`${API_BASE}/attribution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attrPayload),
        signal: AbortSignal.timeout(25000),
      });
      if (!stillRunning()) return;
      if (!attrRes.ok) throw new Error(`attribution HTTP ${attrRes.status}`);
      const attrResult = await attrRes.json();
      setAttribution(attrResult);

      const predSet = Array.isArray(attrResult.prediction_set) ? attrResult.prediction_set : [];
      const confPct = Math.round((attrResult.confidence ?? 0) * 100);
      appendLog(
        `Attribution complete: {${predSet.join(', ') || 'unknown'}} · confidence ${confPct}% · set size ${attrResult.set_size ?? predSet.length}`,
        'success'
      );

      await sleep(2200);
      if (!stillRunning()) return;
      const policy = (attrResult.confidence ?? 0) >= 0.8 && (attrResult.set_size ?? 99) <= 2
        ? 'FULL_INSPECTION'
        : 'TARGETED_PATROL';
      appendLog(`Dispatch policy: ${policy} (high severity + low set ambiguity)`);

      await sleep(2000);
      if (!stillRunning()) return;
      setStage('routing');
      appendLog('POST /api/optimize — OR-Tools CVRPTW routing hotspots…');
      appendLog('Waiting for routing solver…');

      const depotLat = iotSensor.lat ?? stations[0].lat;
      const depotLon = iotSensor.lon ?? stations[0].lon;
      const optRes = await fetch(`${API_BASE}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: depotLat,
          lon: depotLon,
          stations: stations.map((s: any) => ({
            lat: s.lat,
            lon: s.lon,
            aqi: s.aqi,
            name: s.name,
          })),
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!stillRunning()) return;
      if (!optRes.ok) throw new Error(`optimize HTTP ${optRes.status}`);
      const route = await optRes.json();
      const stops = (route.stops || []).filter((s: any) => s.source_id !== 'depot');
      const rois = stops.map((s: any) => Number(s.roi) || 0);
      const roiMax = rois.length ? Math.max(...rois) : 0;
      const estMin = route.total_time_min ?? Math.max(8, stops.length * 12);
      const firstName = stops[0]
        ? (() => {
            try {
              const idx = parseInt(String(stops[0].source_id).split('_')[1], 10);
              return stations[idx]?.name || stops[0].source_id;
            } catch {
              return stops[0].source_id;
            }
          })()
        : 'none';
      appendLog(
        `Route computed: ${stops.length} stops · est. ${estMin} min · ROI ${roiMax.toFixed(1)}x · first stop ${firstName}`,
        'success'
      );

      await sleep(2000);
      if (!stillRunning()) return;
      appendLog('POST /api/notifications/dispatch-alert — pushing to mobile app…');

      try {
        const notifRes = await fetch(`${API_BASE}/notifications/dispatch-alert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            station_id: iotSensor.id,
            station_name: iotSensor.name,
            lat: iotSensor.lat,
            lon: iotSensor.lon,
            city: activeCity,
            aqi: iotSensor.aqi,
            pm25: iotSensor.pm25,
            stage: 'dispatched',
            attribution_set: attrResult.prediction_set,
            confidence: attrResult.confidence,
            message: `AQI alert — enforcement dispatched to ${iotSensor.name}`,
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (!stillRunning()) return;
        const notif = await notifRes.json().catch(() => ({}));
        if (notif.status === 'sent') {
          appendLog(`✓ Mobile notification delivered (${notif.notification_id}) via ${notif.channel || 'unknown'}`, 'success');
        } else {
          appendLog(`⚠ Notification failed: ${notif.error || 'unknown'} — continuing dispatch`, 'warn');
        }
      } catch (notifErr: any) {
        if (!stillRunning()) return;
        appendLog(`⚠ Notification failed: ${notifErr?.message || 'unknown'} — continuing dispatch`, 'warn');
      }

      await sleep(1800);
      if (!stillRunning()) return;
      setStage('dispatched');
      setAlertStation(iotSensor);
      appendLog('Enforcement unit dispatched — alert active on commander map', 'success');
      await sleep(1500);
      if (!stillRunning()) return;
      appendLog('▶ Pipeline complete');
    } catch (err: any) {
      if (!stillRunning()) return;
      appendLog(`Pipeline failed: ${err?.message || String(err)}`, 'error');
      setStage('idle');
    } finally {
      if (stillRunning()) {
        setSimulating(false);
        stopTimer();
      }
    }
  }, [activeCity, cityData, startTimer, stopTimer]);

  return (
    <SimulationContext.Provider value={{
      simulating,
      elapsed,
      stage,
      attribution,
      events,
      alertStation,
      startSimulation,
      resetSimulation,
    }}>
      {children}
    </SimulationContext.Provider>
  );
}
