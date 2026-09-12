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
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [debugTapCount, setDebugTapCount] = useState<number>(0);
  const [showDebugTools, setShowDebugTools] = useState<boolean>(false);

  useEffect(() => {
    const currentAlerts = sensorAlertService.getAlerts();
    setAlerts(currentAlerts);
    if (currentAlerts.length > 0) setIsLiveConnected(true);

    // Initial hardware fetch
    sensorAlertService.syncLiveHardwareReading().then((res) => {
      if (res) setIsLiveConnected(true);
    });

    const unsubscribe = sensorAlertService.subscribe((updatedAlerts) => {
      setAlerts(updatedAlerts);
      if (updatedAlerts.length > 0) setIsLiveConnected(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleAcknowledge = (alertId: string) => {
    sensorAlertService.acknowledgeAlert(alertId);
  };

  const handleTriggerSpike = () => {
    sensorAlertService.triggerMockSensorSpike('Hardware Test Chamber (Simulated)');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await sensorAlertService.syncLiveHardwareReading();
    setAlerts(sensorAlertService.getAlerts());
    setRefreshing(false);
  };

  // Hidden debug mode: tap the header title 5 times to reveal simulate button
  const handleHeaderTap = () => {
    const newCount = debugTapCount + 1;
    setDebugTapCount(newCount);
    if (newCount >= 5) {
      setShowDebugTools(!showDebugTools);
      setDebugTapCount(0);
    }
    // Reset tap count after 2 seconds of inactivity
    setTimeout(() => setDebugTapCount(0), 2000);
  };

  const breachCount = alerts.filter((a) => !a.is_acknowledged && (a.severity === 'CRITICAL' || a.severity === 'WARNING')).length;
  const totalNodes = alerts.length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#0284c7"
        />
      }
    >
      {/* Header — Dynamic Status Summary */}
      <TouchableOpacity activeOpacity={1} onPress={handleHeaderTap}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryTitle}>Sensor Alerts</Text>
            <Text style={styles.summarySubtitle}>
              {totalNodes > 0
                ? `${totalNodes} node${totalNodes > 1 ? 's' : ''} reporting`
                : 'Waiting for sensor data...'}
            </Text>
          </View>
          <View style={[styles.badge, breachCount > 0 ? styles.badgeActive : styles.badgeClear]}>
            <Text style={[styles.badgeText, breachCount > 0 ? styles.badgeTextActive : styles.badgeTextClear]}>
              {breachCount > 0 ? `${breachCount} BREACH${breachCount > 1 ? 'ES' : ''}` : 'ALL CLEAR'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Hardware Connection Status — compact */}
      <View style={[styles.connectionRow, isLiveConnected ? styles.connectionLive : styles.connectionSyncing]}>
        <View style={[styles.connectionDot, isLiveConnected ? styles.dotGreen : styles.dotAmber]} />
        <Text style={[styles.connectionText, isLiveConnected ? styles.textGreen : styles.textAmber]}>
          {isLiveConnected
            ? 'ESP32 hardware linked — auto-syncing every 4s'
            : 'Connecting to sensor feed...'}
        </Text>
      </View>

      {/* Debug Tools — hidden by default, revealed by 5-tap on header */}
      {showDebugTools && (
        <View style={styles.debugBar}>
          <TouchableOpacity
            style={styles.debugBtn}
            onPress={handleTriggerSpike}
            activeOpacity={0.8}
          >
            <Text style={styles.debugBtnText}>Simulate PM2.5 spike (debug)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.debugCloseBtn}
            onPress={() => setShowDebugTools(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.debugCloseBtnText}>Hide</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Alerts Feed */}
      {alerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>All nodes reporting normal</Text>
          <Text style={styles.emptySub}>Connected sensors are operating within safe limits. Pull down to refresh.</Text>
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
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  summarySubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  badgeClear: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextActive: {
    color: '#dc2626',
  },
  badgeTextClear: {
    color: '#16a34a',
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  connectionLive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  connectionSyncing: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: {
    backgroundColor: '#16a34a',
  },
  dotAmber: {
    backgroundColor: '#f59e0b',
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  textGreen: {
    color: '#15803d',
  },
  textAmber: {
    color: '#b45309',
  },
  debugBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  debugBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  debugBtnText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  debugCloseBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  debugCloseBtnText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default NotificationsScreen;
