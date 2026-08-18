import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import type { RouteStop } from '../types/index';

interface RecommendationCardProps {
  stop: RouteStop;
  index: number;
  isSelected: boolean;
  onSelect: (stop: RouteStop) => void;
  onViewEvidence: (stop: RouteStop) => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  stop,
  index,
  isSelected,
  onSelect,
  onViewEvidence,
}) => {
  const isP1 = (stop.priorityRank === 1 || index === 0);
  const isFullInspection = stop.action === 'FULL_INSPECTION';
  const rank = stop.priorityRank || index + 1;
  const aqi = stop.severity ?? stop.aqi ?? 100;
  const pm25 = stop.pm25 !== undefined ? stop.pm25.toFixed(1) : '35.0';
  const eta = stop.durationFromPrev || stop.eta || '15 min';
  const score = Math.min(99, Math.round(aqi * 0.38 + (stop.populationExposed ? stop.populationExposed / 15000 : 20)));

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelected && styles.cardSelected,
        isP1 && styles.cardP1Border,
      ]}
      onPress={() => onSelect(stop)}
      activeOpacity={0.8}
    >
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.priorityGroup}>
          <Text style={[styles.priorityLabel, isP1 ? styles.priorityLabelP1 : styles.priorityLabelSub]}>
            PRIORITY {rank < 10 ? `0${rank}` : rank}
          </Text>
          {isP1 && <View style={styles.leadBadge}><Text style={styles.leadBadgeText}>PRIMARY TARGET</Text></View>}
        </View>

        <View style={[styles.actionBadge, isFullInspection ? styles.actionBadgeRed : styles.actionBadgeBlue]}>
          <Text style={[styles.actionText, isFullInspection ? styles.actionTextRed : styles.actionTextBlue]}>
            {isFullInspection ? 'FULL INSPECTION' : 'VERIFY FIRST'}
          </Text>
        </View>
      </View>

      {/* Location Name */}
      <Text style={styles.locationTitle} numberOfLines={1}>
        {stop.stationName || `Target Zone #${rank}`}
      </Text>

      {/* Structured Metrics Table */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCell}>
          <Text style={styles.metricKey}>Priority Score</Text>
          <Text style={styles.metricValBold}>{score}</Text>
        </View>
        <View style={styles.metricCell}>
          <Text style={styles.metricKey}>AQI Severity</Text>
          <Text style={[styles.metricValBold, aqi > 300 ? styles.textDanger : styles.textWarn]}>{aqi}</Text>
        </View>
        <View style={styles.metricCell}>
          <Text style={styles.metricKey}>PM2.5 Level</Text>
          <Text style={styles.metricVal}>{pm25} µg/m³</Text>
        </View>
        <View style={styles.metricCell}>
          <Text style={styles.metricKey}>Leg ETA</Text>
          <Text style={styles.metricVal}>{eta} ({stop.distanceFromPrev || '4.2 km'})</Text>
        </View>
      </View>

      {/* Bottom Action Footer */}
      <View style={styles.footerRow}>
        <Text style={styles.sourceApportionText} numberOfLines={1}>
          Source: <Text style={styles.sourceHighlight}>{stop.dominantSource || 'Vehicular'}</Text>
        </Text>
        <TouchableOpacity
          style={styles.evidenceButton}
          onPress={(e) => {
            e.stopPropagation();
            onViewEvidence(stop);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.evidenceButtonText}>⚖️ Evidence</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardSelected: {
    borderColor: '#0284c7',
    backgroundColor: '#f0f9ff',
  },
  cardP1Border: {
    borderLeftWidth: 3.5,
    borderLeftColor: '#dc2626',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  priorityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  priorityLabelP1: {
    color: '#dc2626',
  },
  priorityLabelSub: {
    color: '#0284c7',
  },
  leadBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  leadBadgeText: {
    color: '#dc2626',
    fontSize: 8.5,
    fontWeight: '700',
  },
  actionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
  },
  actionBadgeRed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  actionBadgeBlue: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  actionText: {
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  actionTextRed: {
    color: '#dc2626',
  },
  actionTextBlue: {
    color: '#0284c7',
  },
  locationTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  metricCell: {
    width: '50%',
    paddingVertical: 2,
  },
  metricKey: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '600',
  },
  metricVal: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '600',
  },
  metricValBold: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
  },
  textDanger: {
    color: '#dc2626',
  },
  textWarn: {
    color: '#d97706',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceApportionText: {
    color: '#64748b',
    fontSize: 10,
    flex: 1,
    marginRight: 6,
  },
  sourceHighlight: {
    color: '#334155',
    fontWeight: '600',
  },
  evidenceButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 4,
  },
  evidenceButtonText: {
    color: '#334155',
    fontSize: 9.5,
    fontWeight: '700',
  },
});
