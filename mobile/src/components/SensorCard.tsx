import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { SensorAlert } from '../types/index';

interface SensorCardProps {
  alert: SensorAlert;
  onAcknowledge: (alertId: string) => void;
}

function getSeverityInfo(pm25: number): { label: string; color: string; bg: string; borderColor: string; action: string } {
  if (pm25 >= 90) return {
    label: 'CRITICAL',
    color: '#991b1b',
    bg: '#fef2f2',
    borderColor: '#fca5a5',
    action: 'Dispatch enforcement team immediately. Issue stop-work notices to nearby emission sources.',
  };
  if (pm25 >= 60) return {
    label: 'BREACH',
    color: '#c2410c',
    bg: '#fff7ed',
    borderColor: '#fdba74',
    action: 'Investigate source. Deploy mobile sensor for verification before escalating.',
  };
  if (pm25 >= 35) return {
    label: 'ELEVATED',
    color: '#a16207',
    bg: '#fefce8',
    borderColor: '#fde047',
    action: 'Continue monitoring. Flag for review if levels persist above 35 µg/m³.',
  };
  return {
    label: 'NORMAL',
    color: '#15803d',
    bg: '#f0fdf4',
    borderColor: '#86efac',
    action: 'No action required. Node is operating within safe limits.',
  };
}

export const SensorCard: React.FC<SensorCardProps> = ({ alert, onAcknowledge }) => {
  const { reading } = alert;
  const [showDetails, setShowDetails] = useState(false);
  const pm25 = reading.pm25 || 0;
  const severity = getSeverityInfo(pm25);
  const isAcked = alert.is_acknowledged;

  // Human-readable summary instead of raw trigger_reason
  const thresholdLimit = 60;
  const pctAbove = pm25 > thresholdLimit ? Math.round(((pm25 - thresholdLimit) / thresholdLimit) * 100) : 0;
  const summaryText = pm25 >= thresholdLimit
    ? `PM2.5 reached ${pm25.toFixed(1)} µg/m³ — ${pctAbove}% above safe limit`
    : `PM2.5 at ${pm25.toFixed(1)} µg/m³ — within safe limits`;

  return (
    <View style={[styles.card, isAcked && styles.cardAcked]}>
      {/* Severity Banner */}
      <View style={[styles.severityBanner, { backgroundColor: severity.bg, borderColor: severity.borderColor }]}>
        <View style={[styles.severityDot, { backgroundColor: severity.color }]} />
        <Text style={[styles.severityLabel, { color: severity.color }]}>{severity.label}</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.timeText}>{alert.timestamp}</Text>
      </View>

      {/* Station ID + Status Row */}
      <View style={styles.headerRow}>
        <View style={styles.nodeBadge}>
          <Text style={styles.nodeIdText}>{alert.station_id}</Text>
          <Text style={styles.onlineStatusText}>Online</Text>
        </View>
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
            <Text style={styles.ackBtnText}>Acknowledge ✓</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Location */}
      <Text style={styles.locationText}>{reading.location_name || 'Field Perimeter Node'}</Text>

      {/* Summary — the key info */}
      <Text style={styles.summaryText}>{summaryText}</Text>

      {/* Key Metrics Row — just PM2.5 and PM10, the two that matter */}
      <View style={styles.keyMetricsRow}>
        <View style={styles.keyMetric}>
          <Text style={styles.keyMetricLabel}>PM2.5</Text>
          <Text style={[styles.keyMetricValue, pm25 >= 60 && { color: severity.color }]}>
            {pm25.toFixed(1)} <Text style={styles.keyMetricUnit}>µg/m³</Text>
          </Text>
        </View>
        <View style={styles.keyMetricDivider} />
        <View style={styles.keyMetric}>
          <Text style={styles.keyMetricLabel}>PM10</Text>
          <Text style={styles.keyMetricValue}>
            {(reading.pm10 || 0).toFixed(1)} <Text style={styles.keyMetricUnit}>µg/m³</Text>
          </Text>
        </View>
        <View style={styles.keyMetricDivider} />
        <View style={styles.keyMetric}>
          <Text style={styles.keyMetricLabel}>Temp</Text>
          <Text style={styles.keyMetricValue}>
            {(reading.temp || 0).toFixed(1)}°C
          </Text>
        </View>
        <View style={styles.keyMetricDivider} />
        <View style={styles.keyMetric}>
          <Text style={styles.keyMetricLabel}>Humidity</Text>
          <Text style={styles.keyMetricValue}>
            {(reading.humidity || 0).toFixed(0)}%
          </Text>
        </View>
      </View>

      {/* Recommended Action */}
      <View style={[styles.actionBox, { backgroundColor: severity.bg, borderColor: severity.borderColor }]}>
        <Text style={styles.actionLabel}>Recommended action</Text>
        <Text style={styles.actionText}>{severity.action}</Text>
      </View>

      {/* Collapsible Technical Details */}
      <TouchableOpacity
        style={styles.detailsToggle}
        onPress={() => setShowDetails(!showDetails)}
        activeOpacity={0.7}
      >
        <Text style={styles.detailsToggleText}>
          {showDetails ? 'Hide technical details ▲' : 'Show technical details ▼'}
        </Text>
      </TouchableOpacity>

      {showDetails && (
        <View style={styles.telemetryGrid}>
          <View style={styles.sensorSection}>
            <Text style={styles.sectionHeader}>Particulate Matter (SPS30)</Text>
            <View style={styles.quadGrid}>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>PM1.0</Text>
                <Text style={styles.cellVal}>{(reading.pm1 || 0).toFixed(1)} <Text style={styles.cellUnit}>µg/m³</Text></Text>
              </View>
              <View style={[styles.gridCell, pm25 >= 60 && styles.gridCellAlarm]}>
                <Text style={[styles.cellLabel, pm25 >= 60 && styles.labelAlarm]}>PM2.5</Text>
                <Text style={[styles.cellVal, pm25 >= 60 && styles.valAlarm]}>{pm25.toFixed(1)} <Text style={styles.cellUnit}>µg/m³</Text></Text>
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

          <View style={styles.dualSection}>
            <View style={styles.halfSection}>
              <Text style={styles.sectionHeader}>Gas Indices (SGP41)</Text>
              <View style={styles.subGrid}>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>VOC</Text>
                  <Text style={styles.cellVal}>{reading.voc_index || 0}</Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>NOx</Text>
                  <Text style={styles.cellVal}>{reading.nox_index || 0}</Text>
                </View>
              </View>
            </View>

            <View style={styles.halfSection}>
              <Text style={styles.sectionHeader}>Environment (BME280)</Text>
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

          <View style={styles.coordRow}>
            <Text style={styles.coordText}>
              {reading.lat ? `${reading.lat.toFixed(4)}°N, ${reading.lon?.toFixed(4)}°E` : '28.6468°N, 77.3160°E'}
            </Text>
            {reading.pressure ? (
              <Text style={styles.coordText}>Pressure: {reading.pressure.toFixed(1)} hPa</Text>
            ) : null}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  cardAcked: {
    opacity: 0.75,
  },
  severityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  severityLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeText: {
    color: '#64748b',
    fontSize: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    marginBottom: 4,
  },
  nodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nodeIdText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  onlineStatusText: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '600',
  },
  ackTag: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  ackTagText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '700',
  },
  ackBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  ackBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  locationText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  summaryText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 12,
    marginBottom: 10,
    lineHeight: 20,
  },
  keyMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    marginHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  keyMetric: {
    flex: 1,
    alignItems: 'center',
  },
  keyMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  keyMetricLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  keyMetricValue: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  keyMetricUnit: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '500',
  },
  actionBox: {
    marginHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  actionLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionText: {
    color: '#1e293b',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  detailsToggle: {
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginHorizontal: 12,
  },
  detailsToggleText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  telemetryGrid: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  sensorSection: {},
  sectionHeader: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  quadGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 8,
  },
  gridCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  gridCellAlarm: {
    backgroundColor: '#fef2f2',
    borderRadius: 4,
  },
  cellLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  labelAlarm: {
    color: '#dc2626',
  },
  cellVal: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  valAlarm: {
    color: '#dc2626',
    fontWeight: '800',
  },
  cellUnit: {
    fontSize: 9,
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
    padding: 8,
  },
  coordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  coordText: {
    color: '#94a3b8',
    fontSize: 11,
  },
});
