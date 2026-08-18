import type { HardwareReading, SensorAlert } from '../types/index';

class SensorAlertService {
  private alerts: SensorAlert[] = [];
  private listeners: Array<(alerts: SensorAlert[]) => void> = [];

  constructor() {
    this.seedInitialAlerts();
  }

  private seedInitialAlerts() {
    const now = new Date();
    
    // Alert 1: Severe spike (Incense/Combustion breach)
    const time1 = new Date(now.getTime() - 4 * 60000);
    this.alerts.push({
      id: 'ALT_101',
      station_id: 'ESP32_01',
      timestamp: time1.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      severity: 'CRITICAL',
      trigger_threshold: 60.0,
      trigger_reason: 'PM2.5 exceeded 60 µg/m³ hardware alert threshold',
      is_acknowledged: false,
      reading: {
        id: 'RD_101',
        station_id: 'ESP32_01',
        timestamp: time1.toISOString(),
        pm1: 48.1,
        pm25: 74.2, // > 60 hardware alarm threshold
        pm4: 91.6,
        pm10: 105.3,
        voc_index: 126,
        nox_index: 98,
        temp: 28.4,
        humidity: 74.4,
        pressure: 948.8,
        lat: 28.6468,
        lon: 77.3160,
        location_name: 'Anand Vihar Perimeter Node',
      },
    });

    // Alert 2: Industrial dust breach
    const time2 = new Date(now.getTime() - 18 * 60000);
    this.alerts.push({
      id: 'ALT_102',
      station_id: 'ESP32_02',
      timestamp: time2.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      severity: 'WARNING',
      trigger_threshold: 60.0,
      trigger_reason: 'PM2.5 exceeded 60 µg/m³ hardware alert threshold',
      is_acknowledged: true,
      reading: {
        id: 'RD_102',
        station_id: 'ESP32_02',
        timestamp: time2.toISOString(),
        pm1: 39.5,
        pm25: 64.8, // > 60 hardware alarm threshold
        pm4: 82.1,
        pm10: 118.4,
        voc_index: 85,
        nox_index: 42,
        temp: 31.2,
        humidity: 58.0,
        pressure: 1008.2,
        lat: 28.6837,
        lon: 77.0254,
        location_name: 'Mundka Industrial Ward',
      },
    });
  }

  public getAlerts(): SensorAlert[] {
    return [...this.alerts];
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
      id: `ALT_${Date.now().toString().slice(-4)}`,
      station_id: 'ESP32_01',
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      severity: pm25Value > 90 ? 'CRITICAL' : 'WARNING',
      trigger_threshold: 60.0,
      trigger_reason: `PM2.5 spike (${pm25Value} µg/m³) exceeded 60 µg/m³ threshold`,
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
