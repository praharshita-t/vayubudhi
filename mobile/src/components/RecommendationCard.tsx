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

function getAqiBorderColor(aqi: number): string {
  if (aqi >= 300) return '#991b1b';   // dark red — hazardous
  if (aqi >= 250) return '#dc2626';   // red — severe
  if (aqi >= 200) return '#ea580c';   // deep orange — very poor
  if (aqi >= 150) return '#f59e0b';   // amber — unhealthy
  return '#eab308';                    // yellow — moderate
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
  const distance = stop.distanceFromPrev || '4.2 km';
  const borderColor = getAqiBorderColor(aqi);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderLeftWidth: 4, borderLeftColor: borderColor },
        isSelected && styles.cardSelected,
      ]}
      onPress={() => onSelect(stop)}
      activeOpacity={0.8}
    >
      {/* Top Row: Priority + Action */}
      <View style={styles.topRow}>
        <Text style={[styles.priorityLabel, isP1 ? styles.priorityLabelP1 : styles.priorityLabelSub]}>
          #{rank < 10 ? `0${rank}` : rank}
        </Text>
        <View style={[styles.actionBadge, isFullInspection ? styles.actionBadgeRed : styles.actionBadgeBlue]}>
          <Text style={[styles.actionText, isFullInspection ? styles.actionTextRed : styles.actionTextBlue]}>
            {isFullInspection ? 'FULL INSPECTION' : 'VERIFY FIRST'}
          </Text>
        </View>
      </View>

      {/* Location + Source (source is now the subtitle, not a footer) */}
      <Text style={styles.locationTitle} numberOfLines={1}>
        {stop.stationName || `Target Zone #${rank}`}
      </Text>
      <Text style={styles.sourceSubtitle} numberOfLines={1}>
        {stop.dominantSource || 'Vehicular Traffic'}
      </Text>

      {/* Key Metrics — horizontal row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>AQI</Text>
          <Text style={[styles.metricValue, { color: borderColor }]}>{aqi}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>PM2.5</Text>
          <Text style={styles.metricValue}>{pm25} <Text style={styles.metricUnit}>µg/m³</Text></Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>ETA</Text>
          <Text style={styles.metricValue}>{eta}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Distance</Text>
          <Text style={styles.metricValue}>{distance}</Text>
        </View>
      </View>

      {/* Evidence Button */}
      <View style={styles.footerRow}>
        <TouchableOpacity
          style={styles.evidenceButton}
          onPress={(e) => {
            e.stopPropagation();
            onViewEvidence(stop);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.evidenceButtonText}>View Evidence</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardSelected: {
    borderColor: '#0284c7',
    backgroundColor: '#f0f9ff',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  priorityLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  priorityLabelP1: {
    color: '#dc2626',
  },
  priorityLabelSub: {
    color: '#0284c7',
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
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
    fontSize: 10,
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
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  sourceSubtitle: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  metricValue: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  metricUnit: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  evidenceButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  evidenceButtonText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
});
