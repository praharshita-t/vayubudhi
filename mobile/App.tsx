import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { EnforcementScreen } from './src/screens/EnforcementScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';

type Tab = 'enforcement' | 'telemetry';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('enforcement');

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#070b13" />

        {/* Operational Header Bar */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            {/* VayuBudhi Wind/Flow Brand Icon */}
            <View style={styles.brandIconBox}>
              <Text style={styles.brandIconSymbol}>༄</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>VAYUBUDHI</Text>
              <Text style={styles.headerSub}>MUNICIPAL ENFORCEMENT COMMAND</Text>
            </View>
          </View>

          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>SYSTEM LIVE</Text>
          </View>
        </View>

        {/* Main Content Area */}
        <View style={styles.content}>
          {activeTab === 'enforcement' ? (
            <EnforcementScreen />
          ) : (
            <NotificationsScreen />
          )}
        </View>

        {/* Bottom Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'enforcement' && styles.tabActive]}
            onPress={() => setActiveTab('enforcement')}
            activeOpacity={0.7}
          >
            <View style={[styles.tabIndicator, activeTab === 'enforcement' && styles.tabIndicatorActive]} />
            <Text style={[styles.tabLabel, activeTab === 'enforcement' && styles.tabLabelActive]}>
              Enforcement Patrol
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'telemetry' && styles.tabActive]}
            onPress={() => setActiveTab('telemetry')}
            activeOpacity={0.7}
          >
            <View style={[styles.tabIndicator, activeTab === 'telemetry' && styles.tabIndicatorActive]} />
            <Text style={[styles.tabLabel, activeTab === 'telemetry' && styles.tabLabelActive]}>
              Sensor Telemetry
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIconSymbol: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  headerTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headerSub: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  liveText: {
    color: '#047857',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  tabActive: {
    backgroundColor: '#f0f9ff',
  },
  tabIndicator: {
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  tabIndicatorActive: {
    backgroundColor: '#0284c7',
  },
  tabLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: '#0284c7',
    fontWeight: '800',
  },
});
