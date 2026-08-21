import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { sensorAlertService } from '../services/sensorAlertService';
import type { SensorAlert } from '../types/index';
import { SensorCard } from '../components/SensorCard';

export const NotificationsScreen: React.FC = () => {
  const [alerts, setAlerts] = useState<SensorAlert[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    setAlerts(sensorAlertService.getAlerts());

    const unsubscribe = sensorAlertService.subscribe((updatedAlerts) => {
      setAlerts(updatedAlerts);
    });

    return () => unsubscribe();
  }, []);

  const handleAcknowledge = (alertId: string) => {
    sensorAlertService.acknowledgeAlert(alertId);
  };

  const handleTriggerSpike = () => {
    sensorAlertService.triggerMockSensorSpike('Hardware Test Chamber (Simulated)');
  };

  const unreadCount = alerts.filter((a) => !a.is_acknowledged).length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            setAlerts(sensorAlertService.getAlerts());
            setRefreshing(false);
          }}
          tintColor="#38bdf8"
        />
      }
    >
      {/* Header Operational Status Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryInfo}>
          <Text style={styles.summaryTitle}>FIELD SENSOR TELEMETRY</Text>
          <Text style={styles.summarySubtitle}>
            SPS30 (Particulate) • SGP41 (VOC/NOx) • BME280 (Atmo)
          </Text>
        </View>
        <View style={[styles.badge, unreadCount > 0 ? styles.badgeActive : styles.badgeClear]}>
          <Text style={styles.badgeText}>
            {unreadCount > 0 ? `${unreadCount} BREACHES` : 'SYSTEM NOMINAL'}
          </Text>
        </View>
      </View>

      {/* Demo Action Trigger Bar */}
      <View style={styles.demoBar}>
        <TouchableOpacity
          style={styles.spikeBtn}
          onPress={handleTriggerSpike}
          activeOpacity={0.8}
        >
          <Text style={styles.spikeBtnText}>SIMULATE PM2.5 SPIKE TEST (&gt;60 µg/m³)</Text>
        </TouchableOpacity>
      </View>

      {/* Sensor Operational Rule */}
      <View style={styles.thresholdNote}>
        <Text style={styles.thresholdTitle}>Hardware Incident Rule:</Text>
        <Text style={styles.thresholdBody}>
          PM2.5 &gt; 60 µg/m³ threshold triggers edge buzzer alarm, LED indicator, and alerts enforcement units for investigation.
        </Text>
      </View>

      {/* Alerts Feed */}
      {alerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>All Nodes Reporting Normal</Text>
          <Text style={styles.emptySub}>Connected edge nodes are operating below threshold limits.</Text>
        </View>
      ) : (
        alerts.map((alert) => (
          <SensorCard
            key={alert.id}
            alert={alert}
            onAcknowledge={handleAcknowledge}
          />
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 36,
  },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  summarySubtitle: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeActive: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  badgeClear: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  badgeText: {
    color: '#dc2626',
    fontSize: 9.5,
    fontWeight: '700',
  },
  demoBar: {
    marginBottom: 10,
  },
  spikeBtn: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  spikeBtnText: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  thresholdNote: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  thresholdTitle: {
    color: '#d97706',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  thresholdBody: {
    color: '#475569',
    fontSize: 10.5,
    lineHeight: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  emptySub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
});

export default NotificationsScreen;
