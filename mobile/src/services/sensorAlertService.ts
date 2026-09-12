import type { HardwareReading, SensorAlert } from '../types/index';
import { fetchLatestHardwareReading } from './api';

class SensorAlertService {
  private alerts: SensorAlert[] = [];
  private listeners: Array<(alerts: SensorAlert[]) => void> = [];

  private pollingTimer: any = null;

  constructor() {
    this.alerts = [];
    this.syncLiveHardwareReading();
    this.startAutoPolling();
  }

  public startAutoPolling(intervalMs: number = 1000) {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    this.pollingTimer = setInterval(() => {
      this.syncLiveHardwareReading();
    }, intervalMs);
  }

  public stopAutoPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  public getAlerts(): SensorAlert[] {
    return [...this.alerts];
  }

  private latestReading: HardwareReading | null = null;

  public getLatestReading(): HardwareReading | null {
    return this.latestReading;
  }

  public async syncLiveHardwareReading(): Promise<SensorAlert | null> {
    try {
      const reading = await fetchLatestHardwareReading();
      if (!reading) return null;

      this.latestReading = reading;
      const alertId = 'ALT_LIVE_EDGE_NODE';
      const isBreach = (reading.pm25 || 0) >= 60.0;
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const liveAlert: SensorAlert = {
        id: alertId,
        station_id: `${(reading.station_id || 'ESP32_01').toUpperCase()} (LIVE)`,
        timestamp: `${timeStr}`,
        severity: (reading.pm25 || 0) > 90 ? 'CRITICAL' : ((reading.pm25 || 0) >= 60 ? 'WARNING' : 'NORMAL'),
        trigger_threshold: 60.0,
        trigger_reason: isBreach
          ? `Live PM2.5 threshold breach (${reading.pm25} µg/m³ > 60 µg/m³)`
          : `Live edge telemetry active (${reading.pm25} µg/m³ PM2.5 • ${reading.temp}°C)`,
        is_acknowledged: !isBreach,
        reading,
      };

      // Always update the live hardware node at index 0 and keep any spike tests
      this.alerts = [
        liveAlert,
        ...this.alerts.filter((a) => a.id !== alertId),
      ];
      this.notify();
      return liveAlert;
    } catch (e) {
      return null;
    }
  }

  public acknowledgeAlert(alertId: string) {
    this.alerts = this.alerts.map((a) =>
      a.id === alertId ? { ...a, is_acknowledged: true } : a
    );
    this.notify();
  }

  public triggerMockSensorSpike(locationName: string = 'Local Node'): SensorAlert {
    const now = new Date();
    const pm25Value = parseFloat((65 + Math.random() * 45).toFixed(1));
    
    const newAlert: SensorAlert = {
      id: `ALT_SPIKE_${Date.now().toString().slice(-4)}`,
      station_id: 'ESP32_01 (SPIKE TEST)',
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      severity: pm25Value > 90 ? 'CRITICAL' : 'WARNING',
      trigger_threshold: 60.0,
      trigger_reason: `Simulated PM2.5 spike (${pm25Value} µg/m³) exceeded 60 µg/m³ threshold`,
      is_acknowledged: false,
      reading: {
        id: `RD_${Date.now()}`,
        station_id: 'ESP32_01',
        timestamp: now.toISOString(),
        pm1: parseFloat((pm25Value * 0.65).toFixed(1)),
        pm25: pm25Value,
        pm4: parseFloat((pm25Value * 1.22).toFixed(1)),
        pm10: parseFloat((pm25Value * 1.45).toFixed(1)),
        voc_index: Math.round(90 + Math.random() * 80),
        nox_index: Math.round(50 + Math.random() * 60),
        temp: parseFloat((29 + Math.random() * 4).toFixed(1)),
        humidity: Math.round(55 + Math.random() * 20),
        pressure: parseFloat((1004 + Math.random() * 8).toFixed(1)),
        lat: 28.6139 + (Math.random() - 0.5) * 0.08,
        lon: 77.2090 + (Math.random() - 0.5) * 0.08,
        location_name: locationName,
      },
    };

    this.alerts = [newAlert, ...this.alerts];
    this.notify();
    return newAlert;
  }

  public subscribe(listener: (alerts: SensorAlert[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l([...this.alerts]));
  }
}

export const sensorAlertService = new SensorAlertService();
export default sensorAlertService;
