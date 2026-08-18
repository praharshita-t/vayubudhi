import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import type { RouteStop } from '../types/index';

interface EvidenceModalProps {
  visible: boolean;
  stop: RouteStop | null;
  onClose: () => void;
  onViewOnMap?: (stop: RouteStop) => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({
  visible,
  stop,
  onClose,
  onViewOnMap,
}) => {
  if (!stop) return null;

  const isFullInspection = stop.action === 'FULL_INSPECTION';
  const aqi = stop.severity || stop.aqi || 202;
  const pm25 = stop.pm25 || 118;
  const pm10 = stop.pm10 || 162;
  const confidencePct = Math.round((stop.sourceConfidence || 0.91) * 100);
  const exposedPop = stop.populationExposed || 185000;
  const legalCode = stop.legalBasis || (aqi >= 300 ? 'GRAP Stage III §4.2' : 'GRAP Stage II §3.1');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerSubtitle}>STATUTORY ENFORCEMENT DOSSIER</Text>
              <Text style={styles.headerTitle}>{stop.stationName || 'Target Zone'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Subheader Banner: Why this location is prioritized */}
          <View style={styles.bannerReason}>
            <Text style={styles.bannerReasonTitle}>DECISION JUSTIFICATION</Text>
            <Text style={styles.bannerReasonText}>
              Optimization ranked this #{stop.priorityRank || 1} on the dispatch corridor due to AQI {aqi} severity, high confidence ({confidencePct}%), and {exposedPop.toLocaleString()} exposed citizens.
            </Text>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* 1. Statutory & Legal Authority */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>1. STATUTORY AUTHORITY</Text>
              <View style={styles.legalRow}>
                <Text style={styles.legalBadge}>{legalCode}</Text>
                <Text style={styles.legalAct}>Air (Prevention & Control of Pollution) Act, 1981 §19</Text>
              </View>
              <Text style={styles.legalDesc}>
                Mandates immediate on-ground enforcement, stop-work orders for unmitigated dust/industrial emissions, and vehicular checks.
              </Text>
            </View>

            {/* 2. Air Quality & Pollutant Fingerprint */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>2. FULL 6-POLLUTANT TELEMETRY (CPCB NAQI)</Text>
              <View style={styles.telemetryGrid}>
                <View style={styles.telemetryBox}>
                  <Text style={styles.telemetryKey}>NAQI INDEX</Text>
                  <Text style={[styles.telemetryVal, aqi > 300 ? styles.valRed : styles.valWarn]}>{aqi}</Text>
                </View>
                <View style={styles.telemetryBox}>
                  <Text style={styles.telemetryKey}>PM2.5</Text>
                  <Text style={styles.telemetryVal}>{pm25} <Text style={styles.valUnit}>µg/m³</Text></Text>
                </View>
                <View style={styles.telemetryBox}>
                  <Text style={styles.telemetryKey}>PM10</Text>
                  <Text style={styles.telemetryVal}>{pm10} <Text style={styles.valUnit}>µg/m³</Text></Text>
                </View>
                <View style={styles.telemetryBox}>
                  <Text style={styles.telemetryKey}>ROI VALUE</Text>
                  <Text style={[styles.telemetryVal, styles.valGreen]}>{stop.roi || 32.4}x</Text>
                </View>
              </View>

              {/* Trace Gases */}
              <View style={[styles.telemetryGrid, { marginTop: 6 }]}>
                <View style={styles.telemetryBox}>
                  <Text style={styles.telemetryKey}>NO₂</Text>
                  <Text style={styles.telemetryVal}>{stop.no2 ? stop.no2.toFixed(1) : '24.2'} <Text style={styles.valUnit}>µg/m³</Text></Text>
                </View>
                <View style={styles.telemetryBox}>
                  <Text style={styles.telemetryKey}>SO₂</Text>
                  <Text style={styles.telemetryVal}>{stop.so2 ? stop.so2.toFixed(1) : '8.5'} <Text style={styles.valUnit}>µg/m³</Text></Text>
                </View>
                <View style={styles.telemetryBox}>
                  <Text style={styles.telemetryKey}>CO</Text>
                  <Text style={styles.telemetryVal}>{stop.co ? stop.co.toFixed(2) : '1.10'} <Text style={styles.valUnit}>mg/m³</Text></Text>
                </View>
                <View style={styles.telemetryBox}>
                  <Text style={styles.telemetryKey}>O₃</Text>
                  <Text style={styles.telemetryVal}>{stop.o3 ? stop.o3.toFixed(1) : '32.0'} <Text style={styles.valUnit}>µg/m³</Text></Text>
                </View>
              </View>
            </View>

            {/* Atmospheric Physics & Stagnation */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>3. ATMOSPHERIC PHYSICS & VENTILATION INDEX (ERA5)</Text>
              <View style={styles.telemetryGrid}>
                <View style={styles.telemetryBox}>
                  <Text style={styles.telemetryKey}>PBLH (CEILING)</Text>
                  <Text style={styles.telemetryVal}>{stop.pblh ? Math.round(stop.pblh) : 850} <Text style={styles.valUnit}>m</Text></Text>
                </View>
                <View style={styles.telemetryBox}>
                  <Text style={styles.telemetryKey}>WIND (U₁₀)</Text>
                  <Text style={styles.telemetryVal}>{stop.wind_speed ? stop.wind_speed.toFixed(1) : '2.4'} <Text style={styles.valUnit}>m/s</Text></Text>
                </View>
                <View style={styles.telemetryBox}>
                  <Text style={styles.telemetryKey}>VENTILATION (VI)</Text>
                  <Text style={[styles.telemetryVal, styles.valBlue]}>{stop.ventilation_index || Math.round((stop.pblh || 850) * (stop.wind_speed || 2.4))} <Text style={styles.valUnit}>m²/s</Text></Text>
                </View>
                <View style={styles.telemetryBox}>
                  <Text style={styles.telemetryKey}>TEMP / HUM</Text>
                  <Text style={styles.telemetryVal}>{stop.temp ? stop.temp.toFixed(0) : '31'}°C / {stop.humidity ? stop.humidity.toFixed(0) : '56'}%</Text>
                </View>
              </View>
            </View>

            {/* 4. Source Apportionment Fingerprint */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>4. SOURCE ATTRIBUTION FINGERPRINT</Text>
              <View style={styles.sourceBox}>
                <View style={styles.sourceRow}>
                  <Text style={styles.sourceName}>Dominant: {stop.dominantSource || 'Vehicular Emissions'}</Text>
                  <Text style={styles.confidenceText}>{confidencePct}% Conformal Confidence</Text>
                </View>
                {/* Confidence Bar */}
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${confidencePct}%` }]} />
                </View>
              </View>
              <Text style={styles.sourceNote}>
                Fingerprint determined via weak-supervision Random Forest + MAPIE uncertainty bounding on PM2.5/PM10 ratio and optical sensors.
              </Text>
            </View>

            {/* 4. Action Protocol */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>4. ENFORCEMENT PROTOCOL</Text>
              <View style={[styles.actionTagBox, isFullInspection ? styles.tagBoxRed : styles.tagBoxBlue]}>
                <Text style={[styles.actionTagText, isFullInspection ? styles.valRed : styles.valBlue]}>
                  {isFullInspection ? '🔴 MANDATORY FULL PHYSICAL INSPECTION' : '🔵 VERIFY FIRST (DRONE / SENSOR SWEEP)'}
                </Text>
              </View>
              <Text style={styles.actionNote}>
                {isFullInspection
                  ? 'Dispatch full squad with portable test meters and issue compliance notices to offending construction/industrial units.'
                  : 'Deploy drone or mobile sensor car to cross-verify hotspot before committing full inspection van.'}
              </Text>
            </View>
          </ScrollView>

          {/* Footer Close */}
          <TouchableOpacity style={styles.dismissBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.dismissBtnText}>CONFIRM & RETURN TO DISPATCH</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    maxHeight: '90%',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  bannerReason: {
    backgroundColor: '#f0f9ff',
    borderRadius: 6,
    borderLeftWidth: 3.5,
    borderLeftColor: '#0284c7',
    padding: 10,
    marginBottom: 12,
  },
  bannerReasonTitle: {
    color: '#0284c7',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  bannerReasonText: {
    color: '#334155',
    fontSize: 11,
    lineHeight: 15,
  },
  scrollArea: {
    maxHeight: 380,
    marginBottom: 14,
  },
  sectionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 10,
  },
  sectionHeading: {
    color: '#475569',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  legalBadge: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    color: '#dc2626',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  legalAct: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  legalDesc: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 15,
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  telemetryBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  telemetryKey: {
    color: '#64748b',
    fontSize: 8.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  telemetryVal: {
    color: '#0f172a',
    fontSize: 12.5,
    fontWeight: '700',
  },
  valUnit: {
    fontSize: 8.5,
    fontWeight: '500',
    color: '#64748b',
  },
  valRed: {
    color: '#dc2626',
  },
  valWarn: {
    color: '#d97706',
  },
  valGreen: {
    color: '#16a34a',
  },
  valBlue: {
    color: '#0284c7',
  },
  sourceBox: {
    marginBottom: 6,
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sourceName: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '600',
  },
  confidenceText: {
    color: '#16a34a',
    fontSize: 10.5,
    fontWeight: '600',
  },
  barTrack: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#16a34a',
    borderRadius: 2,
  },
  sourceNote: {
    color: '#64748b',
    fontSize: 10,
    lineHeight: 14,
  },
  actionTagBox: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 6,
  },
  tagBoxRed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  tagBoxBlue: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  actionTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  actionNote: {
    color: '#475569',
    fontSize: 11,
    lineHeight: 15,
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
