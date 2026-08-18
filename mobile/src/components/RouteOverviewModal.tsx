import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import type { RoadRoutePlan, RouteStop } from '../types/index';

interface RouteOverviewModalProps {
  visible: boolean;
  onClose: () => void;
  plan: RoadRoutePlan | null;
  onSelectStop: (stop: RouteStop) => void;
}

export const RouteOverviewModal: React.FC<RouteOverviewModalProps> = ({
  visible,
  onClose,
  plan,
  onSelectStop,
}) => {
  if (!plan) return null;

  const totalStops = plan.stops.length;
  const totalDistance = plan.totalDistanceKm || 0;
  const totalTimeMin = plan.totalDurationMin || 0;
  const hours = Math.floor(totalTimeMin / 60);
  const minutes = totalTimeMin % 60;
  const timeFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;

  const totalExposedPop = plan.stops.reduce((acc, s) => acc + (s.populationExposed || 120000), 0);
  const highestP = plan.highestPriorityStop || plan.stops[0];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.headerSubtitle}>OR-TOOLS DISPATCH OPTIMIZATION</Text>
              <Text style={styles.headerTitle}>Route Corridor Overview</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* High-Level Corridor Statistics */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>TARGET STOPS</Text>
              <Text style={styles.statVal}>{totalStops}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>TOTAL CORRIDOR</Text>
              <Text style={styles.statVal}>{totalDistance} <Text style={styles.statUnit}>km</Text></Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>EST. TRANSIT</Text>
              <Text style={styles.statVal}>{timeFormatted}</Text>
            </View>
          </View>

          {/* Key Intelligence Summary */}
          <View style={styles.intelSummaryBox}>
            <View style={styles.intelRow}>
              <Text style={styles.intelLabel}>Exposure Addressed:</Text>
              <Text style={styles.intelValue}>~{(totalExposedPop / 1000).toFixed(0)}k citizens</Text>
            </View>
            <View style={styles.intelRow}>
              <Text style={styles.intelLabel}>Highest Severity Stop:</Text>
              <Text style={[styles.intelValue, styles.intelP1]}>
                #{highestP?.priorityRank || 1} {highestP?.stationName || 'Priority Zone'} (AQI {highestP?.severity || 202})
              </Text>
            </View>
            <View style={styles.intelRow}>
              <Text style={styles.intelLabel}>Routing Engine:</Text>
              <Text style={styles.intelValue}>
                {plan.isRoadFollowing ? 'OSRM Road Polyline (Live)' : 'Direct Fallback Line'}
              </Text>
            </View>
          </View>

          {/* Step-by-Step Stop Sequence */}
          <Text style={styles.sequenceHeading}>OPTIMIZED DISPATCH SEQUENCE</Text>

          <ScrollView style={styles.sequenceList} showsVerticalScrollIndicator={false}>
            {/* Depot Origin */}
            <View style={styles.stepItem}>
              <View style={styles.timelineColumn}>
                <View style={styles.depotDot} />
                <View style={styles.timelineLine} />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.depotLabel}>DEPOT / COMMAND ORIGIN</Text>
                <Text style={styles.depotName}>{plan.depot.name}</Text>
                {plan.segments[0] && (
                  <Text style={styles.segmentLegInfo}>
                    ↓ {plan.segments[0].distanceFormatted} / {plan.segments[0].durationFormatted}
                  </Text>
                )}
              </View>
            </View>

            {/* Stops */}
            {plan.stops.map((stop, idx) => {
              const isLast = idx === plan.stops.length - 1;
              const isP1 = idx === 0;
              const nextSegment = plan.segments[idx + 1];

              return (
                <TouchableOpacity
                  key={stop.source_id || idx}
                  style={styles.stepItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    onSelectStop(stop);
                    onClose();
                  }}
                >
                  <View style={styles.timelineColumn}>
                    <View style={[styles.stopDot, isP1 && styles.stopDotP1]}>
                      <Text style={styles.stopDotText}>{idx + 1}</Text>
                    </View>
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.stepContent}>
                    <View style={styles.stopTitleRow}>
                      <Text style={styles.stopNameText}>{stop.stationName}</Text>
                      <Text style={[styles.actionBadge, isP1 ? styles.actionP1 : styles.actionSub]}>
                        {stop.action === 'FULL_INSPECTION' ? 'FULL' : 'VERIFY'}
                      </Text>
                    </View>
                    <Text style={styles.stopMeta}>
                      AQI {stop.severity || stop.aqi || 200} • PM2.5 {stop.pm25 || 118} µg/m³ • {stop.dominantSource || 'Vehicular'}
                    </Text>

                    {!isLast && nextSegment && (
                      <Text style={styles.segmentLegInfo}>
                        ↓ {nextSegment.distanceFormatted} / {nextSegment.durationFormatted}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Dismiss Button */}
          <TouchableOpacity style={styles.dismissBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.dismissBtnText}>RESUME PATROL MAP</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    maxHeight: '88%',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerSubtitle: {
    color: '#64748b',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  headerTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  statVal: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  statUnit: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '500',
  },
  intelSummaryBox: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
    padding: 10,
    marginBottom: 14,
    gap: 4,
  },
  intelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  intelLabel: {
    color: '#0369a1',
    fontSize: 11,
    fontWeight: '600',
  },
  intelValue: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '700',
  },
  intelP1: {
    color: '#dc2626',
  },
  sequenceHeading: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sequenceList: {
    maxHeight: 220,
    marginBottom: 14,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineColumn: {
    alignItems: 'center',
    width: 26,
    marginRight: 10,
  },
  depotDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#0284c7',
    borderWidth: 2,
    borderColor: '#bae6fd',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 3,
  },
  stopDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopDotP1: {
    backgroundColor: '#dc2626',
  },
  stopDotText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  stepContent: {
    flex: 1,
    paddingBottom: 8,
  },
  depotLabel: {
    color: '#0284c7',
    fontSize: 9.5,
    fontWeight: '700',
  },
  depotName: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
  },
  stopTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stopNameText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  actionBadge: {
    fontSize: 8.5,
    fontWeight: '700',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  actionP1: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
  },
  actionSub: {
    backgroundColor: '#f0f9ff',
    color: '#0284c7',
  },
  stopMeta: {
    color: '#64748b',
    fontSize: 10.5,
    marginTop: 1,
  },
  segmentLegInfo: {
    color: '#0284c7',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  dismissBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 6,
    paddingVertical: 11,
    alignItems: 'center',
  },
  dismissBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
