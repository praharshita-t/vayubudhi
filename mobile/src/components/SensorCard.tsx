import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { SensorAlert } from '../types/index';

interface SensorCardProps {
  alert: SensorAlert;
  onAcknowledge: (alertId: string) => void;
}

export const SensorCard: React.FC<SensorCardProps> = ({ alert, onAcknowledge }) => {
  const { reading } = alert;
  const isCritical = alert.severity === 'CRITICAL' || reading.pm25 > 60;
  const isAcked = alert.is_acknowledged;

  return (
    <View style={[styles.card, isCritical && styles.cardCritical, isAcked && styles.cardAcked]}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.nodeBadge}>
          <View style={[styles.nodeDot, isAcked ? styles.dotGreen : styles.dotRed]} />
          <Text style={styles.nodeIdText}>{alert.station_id}</Text>
          <Text style={styles.onlineStatusText}>• ONLINE</Text>
        </View>

        <View style={styles.timeWrap}>
          <Text style={styles.timeText}>{alert.timestamp}</Text>
          {isAcked ? (
            <View style={styles.ackTag}>
              <Text style={styles.ackTagText}>ACKNOWLEDGED</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.ackBtn}
              onPress={() => onAcknowledge(alert.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.ackBtnText}>ACKNOWLEDGE ✓</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Location Banner */}
      <View style={styles.locationBanner}>
        <Text style={styles.locationTitle}>{reading.location_name || 'Field Perimeter Node'}</Text>
        <Text style={styles.locationCoords}>
          {reading.lat ? `${reading.lat.toFixed(4)}°N, ${reading.lon?.toFixed(4)}°E` : '28.6468°N, 77.3160°E'}
        </Text>
      </View>

      {/* Alert Trigger Callout */}
      <View style={[styles.triggerBox, isCritical ? styles.triggerCritical : styles.triggerWarn]}>
        <Text style={[styles.triggerText, isCritical ? styles.triggerTextCritical : styles.triggerTextWarn]}>
          ⚠️ {alert.trigger_reason}
        </Text>
      </View>

      {/* Structured Telemetry Grid */}
      <View style={styles.telemetryGrid}>
        {/* Row 1: Particulate Matter SPS30 */}
        <View style={styles.sensorSection}>
          <Text style={styles.sectionHeader}>SPS30 PARTICULATE MATTER</Text>
          <View style={styles.quadGrid}>
            <View style={styles.gridCell}>
              <Text style={styles.cellLabel}>PM1.0</Text>
              <Text style={styles.cellVal}>{(reading.pm1 || 0).toFixed(1)} <Text style={styles.cellUnit}>µg/m³</Text></Text>
            </View>
            <View style={[styles.gridCell, isCritical && styles.gridCellAlarm]}>
              <Text style={[styles.cellLabel, isCritical && styles.labelAlarm]}>PM2.5 (ALARM)</Text>
              <Text style={[styles.cellVal, isCritical && styles.valAlarm]}>{(reading.pm25 || 0).toFixed(1)} <Text style={styles.cellUnit}>µg/m³</Text></Text>
            </View>
            <View style={styles.gridCell}>
              <Text style={styles.cellLabel}>PM4.0</Text>
              <Text style={styles.cellVal}>{(reading.pm4 || 0).toFixed(1)} <Text style={styles.cellUnit}>µg/m³</Text></Text>
            </View>
            <View style={styles.gridCell}>
              <Text style={styles.cellLabel}>PM10</Text>
              <Text style={styles.cellVal}>{(reading.pm10 || 0).toFixed(1)} <Text style={styles.cellUnit}>µg/m³</Text></Text>
            </View>
          </View>
        </View>

        {/* Row 2: Gas & Atmospheric */}
        <View style={styles.dualSection}>
          <View style={styles.halfSection}>
            <Text style={styles.sectionHeader}>SGP41 GAS INDICES</Text>
            <View style={styles.subGrid}>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>VOC Index</Text>
                <Text style={styles.cellVal}>{reading.voc_index || 0}</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>NOx Index</Text>
                <Text style={styles.cellVal}>{reading.nox_index || 0}</Text>
              </View>
            </View>
          </View>

          <View style={styles.halfSection}>
            <Text style={styles.sectionHeader}>BME280 ENVIRONMENT</Text>
            <View style={styles.subGrid}>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>Temp</Text>
                <Text style={styles.cellVal}>{(reading.temp || 0).toFixed(1)}°C</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>Humidity</Text>
                <Text style={styles.cellVal}>{(reading.humidity || 0).toFixed(0)}%</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardCritical: {
    borderLeftWidth: 3.5,
    borderLeftColor: '#dc2626',
  },
  cardAcked: {
    opacity: 0.85,
    backgroundColor: '#f8fafc',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nodeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotRed: {
    backgroundColor: '#dc2626',
  },
  dotGreen: {
    backgroundColor: '#16a34a',
  },
  nodeIdText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  onlineStatusText: {
    color: '#16a34a',
    fontSize: 9.5,
    fontWeight: '700',
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    color: '#64748b',
    fontSize: 10.5,
  },
  ackTag: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ackTagText: {
    color: '#047857',
    fontSize: 8.5,
    fontWeight: '700',
  },
  ackBtn: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  ackBtnText: {
    color: '#0284c7',
    fontSize: 9.5,
    fontWeight: '700',
  },
  locationBanner: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  locationTitle: {
    color: '#0f172a',
    fontSize: 11.5,
    fontWeight: '700',
  },
  locationCoords: {
    color: '#64748b',
    fontSize: 9.5,
  },
  triggerBox: {
    padding: 6,
    borderRadius: 4,
    marginBottom: 8,
    borderWidth: 1,
  },
  triggerCritical: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  triggerWarn: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  triggerText: {
    fontSize: 10,
    fontWeight: '700',
  },
  triggerTextCritical: {
    color: '#dc2626',
  },
  triggerTextWarn: {
    color: '#d97706',
  },
  telemetryGrid: {
    gap: 8,
  },
  sensorSection: {},
  sectionHeader: {
    color: '#475569',
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  quadGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 6,
  },
  gridCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  gridCellAlarm: {
    backgroundColor: '#fef2f2',
    borderRadius: 4,
  },
  cellLabel: {
    color: '#64748b',
    fontSize: 8.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  labelAlarm: {
    color: '#dc2626',
  },
  cellVal: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '700',
  },
  valAlarm: {
    color: '#dc2626',
    fontSize: 11.5,
    fontWeight: '800',
  },
  cellUnit: {
    fontSize: 8,
    color: '#64748b',
    fontWeight: '500',
  },
  dualSection: {
    flexDirection: 'row',
    gap: 8,
  },
  halfSection: {
    flex: 1,
  },
  subGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 6,
  },
});
