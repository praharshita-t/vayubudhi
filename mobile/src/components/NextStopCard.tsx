import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import type { RouteStop } from '../types/index';

interface NextStopCardProps {
  stop: RouteStop;
  onViewEvidence: (stop: RouteStop) => void;
  onStartRoute: (stop: RouteStop) => void;
  isNavigating?: boolean;
  onAdvanceStop?: () => void;
}

export const NextStopCard: React.FC<NextStopCardProps> = ({
  stop,
  onViewEvidence,
  onStartRoute,
  isNavigating = false,
  onAdvanceStop,
}) => {
  const isFullInspection = stop.action === 'FULL_INSPECTION';
  const aqi = stop.severity ?? stop.aqi ?? 100;
  const pm25 = stop.pm25 !== undefined ? stop.pm25.toFixed(1) : '35.0';
  const rank = stop.priorityRank || 1;
  const eta = stop.durationFromPrev || stop.eta || '14 min';
  const distance = stop.distanceFromPrev || '5.8 km';
  const score = Math.min(99, Math.round(aqi * 0.38 + (stop.populationExposed ? stop.populationExposed / 15000 : 20)));

  return (
    <View style={styles.cardContainer}>
      {/* Header Label */}
      <View style={styles.topRow}>
        <View style={styles.indicatorWrap}>
          <View style={[styles.pulseBeacon, isFullInspection ? styles.beaconRed : styles.beaconBlue]} />
          <Text style={styles.badgeCategory}>
            {isNavigating ? 'ACTIVE EN ROUTE TARGET' : 'NEXT ENFORCEMENT STOP'}
          </Text>
        </View>
        <Text style={styles.routeOrderText}>CORRIDOR LEG #{rank}</Text>
      </View>

      {/* Main Stop Info */}
      <View style={styles.mainRow}>
        <View style={styles.nameBlock}>
          <View style={styles.rankBadge}>
            <Text style={styles.rankNum}>#{rank}</Text>
          </View>
          <View style={styles.titleWrap}>
            <Text style={styles.stationName} numberOfLines={1}>
              {stop.stationName || 'Target Zone'}
            </Text>
            <View style={[styles.actionTag, isFullInspection ? styles.actionTagRed : styles.actionTagBlue]}>
              <Text style={[styles.actionTagText, isFullInspection ? styles.actionTextRed : styles.actionTextBlue]}>
                {isFullInspection ? 'FULL INSPECTION' : 'VERIFY FIRST'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Operational Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>AQI</Text>
          <Text style={[styles.metricValue, aqi > 300 ? styles.colorHazard : styles.colorWarn]}>{aqi}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>PM2.5</Text>
          <Text style={styles.metricValue}>{pm25} <Text style={styles.metricUnit}>µg/m³</Text></Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>SCORE</Text>
          <Text style={styles.metricValue}>{score}<Text style={styles.metricUnit}>/100</Text></Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>ETA / DIST</Text>
          <Text style={styles.metricValue}>{eta} <Text style={styles.metricUnit}>({distance})</Text></Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.evidenceBtn}
          onPress={() => onViewEvidence(stop)}
          activeOpacity={0.8}
        >
          <Text style={styles.evidenceBtnText}>VIEW EVIDENCE</Text>
        </TouchableOpacity>

        {isNavigating ? (
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={onAdvanceStop}
            activeOpacity={0.8}
          >
            <Text style={styles.completeBtnText}>✓ MARK INSPECTED</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => onStartRoute(stop)}
            activeOpacity={0.8}
          >
            <Text style={styles.startBtnText}>START ROUTE ▶</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  indicatorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseBeacon: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  beaconRed: {
    backgroundColor: '#dc2626',
  },
  beaconBlue: {
    backgroundColor: '#0284c7',
  },
  badgeCategory: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  routeOrderText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
  },
  mainRow: {
    marginBottom: 10,
  },
  nameBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  rankNum: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800',
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stationName: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  actionTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  actionTagRed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  actionTagBlue: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  actionTagText: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  actionTextRed: {
    color: '#dc2626',
  },
  actionTextBlue: {
    color: '#0284c7',
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 7,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#e2e8f0',
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 2,
  },
  metricValue: {
    color: '#0f172a',
    fontSize: 12.5,
    fontWeight: '700',
  },
  metricUnit: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '500',
  },
  colorHazard: {
    color: '#dc2626',
  },
  colorWarn: {
    color: '#d97706',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  evidenceBtn: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenceBtnText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  startBtn: {
    flex: 1.2,
    backgroundColor: '#0284c7',
    borderRadius: 6,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  completeBtn: {
    flex: 1.2,
    backgroundColor: '#059669',
    borderRadius: 6,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
