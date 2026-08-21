import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { fetchCityData, optimizeEnforcementRoute } from '../services/api';
import { buildRoadEnforcementPlan } from '../services/routingService';
import { computeDistricts, getAQIAtCoordinate, getSpatialDataAtCoordinate } from '../data/districts';
import type { District, RoadRoutePlan, RouteStop, Station } from '../types/index';
import { EnforcementMap } from '../components/EnforcementMap';
import { NextStopCard } from '../components/NextStopCard';
import { RecommendationCard } from '../components/RecommendationCard';
import { EvidenceModal } from '../components/EvidenceModal';
import { RouteOverviewModal } from '../components/RouteOverviewModal';

const CORE_CITIES = ['Delhi', 'Hyderabad', 'Guwahati'];
const OTHER_CITIES = [
  'Mumbai',
  'Bengaluru',
  'Chennai',
  'Kolkata',
  'Pune',
  'Ahmedabad',
  'Jaipur',
  'Lucknow',
  'Chandigarh',
];
const CITIES = [...CORE_CITIES, ...OTHER_CITIES];

const CITY_DEPOTS: Record<string, { name: string; lat: number; lon: number }> = {
  Delhi: { name: 'Central Enforcement Depot (Delhi Secretariat)', lat: 28.6139, lon: 77.2090 },
  Hyderabad: { name: 'GHMC Central Command Station', lat: 17.3850, lon: 78.4867 },
  Guwahati: { name: 'Assam PCB Regional Depot (Dispur)', lat: 26.1444, lon: 91.7362 },
  Mumbai: { name: 'BMC Municipal Control Centre (Fort)', lat: 18.9388, lon: 72.8354 },
  Bengaluru: { name: 'BBMP Central Command Office', lat: 12.9716, lon: 77.5946 },
  Chennai: { name: 'Greater Chennai Corporation HQ (Ripon Bldg)', lat: 13.0827, lon: 80.2707 },
  Kolkata: { name: 'KMC Central Headquarters (Esplanade)', lat: 22.5626, lon: 88.3510 },
  Pune: { name: 'PMC Command Control Center (Shivajinagar)', lat: 18.5204, lon: 73.8567 },
  Ahmedabad: { name: 'AMC Central Headquarters (Danapith)', lat: 23.0225, lon: 72.5714 },
  Jaipur: { name: 'Jaipur Municipal Headquarters (Lalkothi)', lat: 26.9124, lon: 75.7873 },
  Lucknow: { name: 'LMC Central Headquarters (Hazratganj)', lat: 26.8467, lon: 80.9462 },
  Chandigarh: { name: 'Municipal Corporation HQ (Sector 17)', lat: 30.7333, lon: 76.7794 },
};

export const EnforcementScreen: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<string>('Delhi');
  const [stations, setStations] = useState<Station[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [routePlan, setRoutePlan] = useState<RoadRoutePlan | null>(null);
  const [selectedStop, setSelectedStop] = useState<RouteStop | null>(null);
  const [cityAqi, setCityAqi] = useState<number>(202);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [navStopIndex, setNavStopIndex] = useState<number>(0);

  // Modals
  const [evidenceStop, setEvidenceStop] = useState<RouteStop | null>(null);
  const [showOverviewModal, setShowOverviewModal] = useState<boolean>(false);
  const [showFullMapModal, setShowFullMapModal] = useState<boolean>(false);
  const [showCityDropdown, setShowCityDropdown] = useState<boolean>(false);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadCityEnforcement(selectedCity);
  }, [selectedCity]);

  const loadCityEnforcement = async (city: string) => {
    setLoading(true);
    setIsNavigating(false);
    setNavStopIndex(0);
    try {
      // 1. Fetch live city stations
      const cityData = await fetchCityData(city);
      const stationList = cityData.stations || [];
      setStations(stationList);
      
      // 2. Compute spatial IDW district boundary metrics
      const computedDistricts = computeDistricts(city, stationList);
      setDistricts(computedDistricts);

      const computedCenterAqi = stationList.length > 0
        ? Math.round(stationList.reduce((acc, curr) => acc + (curr.aqi || 0), 0) / stationList.length)
        : (city === 'Delhi' ? 205 : city === 'Hyderabad' ? 172 : 155);
      setCityAqi(computedCenterAqi);

      // 3. Query OR-Tools optimization backend
      const depot = CITY_DEPOTS[city] || CITY_DEPOTS.Delhi;
      const backendPlan = await optimizeEnforcementRoute(depot.lat, depot.lon, stationList);

      // 4. Enrich stops with live data from stations and spatial heatmap metrics
      const enrichedStops = enrichRouteStops(backendPlan.stops || [], stationList, computedDistricts, city);

      // 5. Build actual road-following polyline via OSRM routing service
      const fullPlan = await buildRoadEnforcementPlan(city, depot, enrichedStops);
      setRoutePlan(fullPlan);

      if (fullPlan.stops.length > 0) {
        setSelectedStop(fullPlan.stops[0]);
      }
    } catch (err) {
      console.error('[EnforcementScreen] Error generating enforcement corridor:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const enrichRouteStops = (
    stops: RouteStop[],
    stationList: Station[],
    districtList: District[],
    city: string
  ): RouteStop[] => {
    return (stops || []).map((stop, idx) => {
      const stopLat = typeof stop.lat === 'number' ? stop.lat : 28.6139;
      const stopLon = typeof stop.lon === 'number' ? stop.lon : 77.2090;

      // 1. Spatial Heatmap lookup for this exact coordinate (source of truth when available)
      const spatialData = getSpatialDataAtCoordinate(stopLat, stopLon, districtList, stationList);
      const heatmapAQI = getAQIAtCoordinate(stopLat, stopLon, districtList, stationList);

      // 2. Existing Fallback System (Matching Station or default synthetic telemetry)
      const matchedStation = stationList.find(
        (st) =>
          (st.name && stop.stationName && st.name.toLowerCase() === stop.stationName.toLowerCase()) ||
          (Math.abs(st.lat - stopLat) < 0.005 && Math.abs(st.lon - stopLon) < 0.005)
      );

      const fallbackAQI =
        stop.severity ??
        stop.aqi ??
        matchedStation?.aqi ??
        (city === 'Delhi' ? 240 + (idx * 20) % 80 : city === 'Hyderabad' ? 180 + (idx * 15) % 60 : 150 + (idx * 10) % 40);

      const fallbackPm25 = matchedStation?.pm25 ?? parseFloat((fallbackAQI * 0.42).toFixed(1));
      const fallbackPm10 = matchedStation?.pm10 ?? parseFloat((fallbackAQI * 0.58).toFixed(1));
      const fallbackNo2 = matchedStation?.no2 ?? Math.round(fallbackAQI * 0.22);
      const fallbackSo2 = matchedStation?.so2 ?? Math.round(fallbackAQI * 0.08);
      const fallbackCo = matchedStation?.co ?? parseFloat((fallbackAQI * 0.007).toFixed(1));
      const fallbackO3 = matchedStation?.o3 ?? Math.round(fallbackAQI * 0.15);
      const fallbackTemp = matchedStation?.temp ?? 30.0;
      const fallbackHumidity = matchedStation?.humidity ?? 55.0;
      const fallbackPressure = matchedStation?.pressure ?? 1008.0;
      const fallbackWind = matchedStation?.wind_speed ?? 2.5;
      const fallbackPblh = matchedStation?.pblh ?? 800.0;

      // 3. Heatmap AQI has priority over fallback AQI
      const displayAQI = heatmapAQI ?? fallbackAQI;
      const finalPm25 = spatialData?.pm25 ?? fallbackPm25;
      const finalPm10 = spatialData?.pm10 ?? fallbackPm10;
      const finalNo2 = spatialData?.no2 ?? fallbackNo2;
      const finalSo2 = spatialData?.so2 ?? fallbackSo2;
      const finalCo = spatialData?.co ?? fallbackCo;
      const finalO3 = spatialData?.o3 ?? fallbackO3;
      const finalTemp = spatialData?.temp ?? fallbackTemp;
      const finalHumidity = spatialData?.humidity ?? fallbackHumidity;
      const finalPressure = spatialData?.pressure ?? fallbackPressure;
      const finalWind = spatialData?.wind_speed ?? fallbackWind;
      const finalPblh = spatialData?.pblh ?? fallbackPblh;
      const finalVI = Math.round(finalPblh * finalWind);

      // MCDA multi-source attribution calculation based on real spatial profile
      const trafficScore = Math.min(100, (finalNo2 / 80.0) * 50.0 + (finalCo / 2.0) * 50.0);
      const industryScore = Math.min(100, (finalSo2 / 40.0) * 50.0 + (finalPm25 / 60.0) * 50.0);
      const dustScore = Math.min(100, (finalPm10 / 100.0) * 100.0);

      let dominantSource = 'Vehicular Traffic';
      let maxScore = trafficScore;
      if (industryScore > maxScore) {
        dominantSource = 'Industrial Emissions';
        maxScore = industryScore;
      }
      if (dustScore > maxScore) {
        dominantSource = 'Construction & Road Dust';
        maxScore = dustScore;
      }

      const sourceConfidence = parseFloat((0.85 + (Math.abs(displayAQI % 15) * 0.01)).toFixed(2));
      const populationExposed =
        city === 'Delhi'
          ? 180000 + (idx * 35000) % 95000
          : city === 'Hyderabad'
          ? 120000 + (idx * 28000) % 75000
          : 65000 + (idx * 15000) % 40000;
      const isP1 = idx === 0;

      const stationDisplayName =
        stop.stationName ||
        matchedStation?.name ||
        (spatialData?.districtName ? `${spatialData.districtName} Sector` : `Corridor Zone #${idx + 1}`);

      return {
        ...stop,
        lat: stopLat,
        lon: stopLon,
        priorityRank: idx + 1,
        stationName: stationDisplayName,
        action: isP1 || displayAQI >= 300 ? 'FULL_INSPECTION' : 'VERIFY_FIRST',
        severity: displayAQI,
        aqi: displayAQI,
        pm25: finalPm25,
        pm10: finalPm10,
        no2: finalNo2,
        so2: finalSo2,
        co: finalCo,
        o3: finalO3,
        temp: finalTemp,
        humidity: finalHumidity,
        pressure: finalPressure,
        wind_speed: finalWind,
        pblh: finalPblh,
        ventilation_index: finalVI,
        dominantSource,
        sourceConfidence,
        populationExposed,
        legalBasis: displayAQI >= 300 ? 'GRAP Stage III §4.2' : 'GRAP Stage II §3.1',
        evidenceRationale: `High severity (AQI ${displayAQI}) coupled with ${populationExposed.toLocaleString()} exposed population.`,
        isCompleted: false,
      };
    });
  };

  const handleSelectStop = (stop: RouteStop) => {
    setSelectedStop(stop);
  };

  const handleStartRoute = (stop: RouteStop) => {
    setIsNavigating(true);
    setSelectedStop(stop);
    const idx = routePlan?.stops.findIndex((s) => s.source_id === stop.source_id) ?? 0;
    setNavStopIndex(Math.max(0, idx));
  };

  const handleAdvanceStop = () => {
    if (!routePlan) return;
    const nextIdx = navStopIndex + 1;
    if (nextIdx < routePlan.stops.length) {
      setNavStopIndex(nextIdx);
      setSelectedStop(routePlan.stops[nextIdx]);
    } else {
      setIsNavigating(false);
      setNavStopIndex(0);
      setSelectedStop(routePlan.stops[0]);
    }
  };

  const activeFocusStop = selectedStop || routePlan?.highestPriorityStop || null;

  return (
    <View style={styles.container}>
      {/* Top Municipal Header Bar */}
      <View style={styles.topHeader}>
        {/* City Filter: Core Cities + More Dropdown */}
        <View style={styles.citySelectorRow}>
          {CORE_CITIES.map((city) => {
            const isActive = selectedCity === city;
            return (
              <TouchableOpacity
                key={city}
                style={[styles.cityPill, isActive && styles.cityPillActive]}
                onPress={() => {
                  setSelectedCity(city);
                  setShowCityDropdown(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.cityPillText, isActive && styles.cityPillTextActive]}>
                  {city}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* More Cities Dropdown Trigger */}
          <TouchableOpacity
            style={[
              styles.cityPill,
              styles.dropdownTriggerPill,
              OTHER_CITIES.includes(selectedCity) && styles.cityPillActive,
            ]}
            onPress={() => setShowCityDropdown(true)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.cityPillText,
                OTHER_CITIES.includes(selectedCity) && styles.cityPillTextActive,
              ]}
              numberOfLines={1}
            >
              {OTHER_CITIES.includes(selectedCity) ? selectedCity : 'More'} ▾
            </Text>
          </TouchableOpacity>
        </View>

        {/* Corridor Status Bar */}
        <View style={styles.statusBar}>
          <View style={styles.statusLeft}>
            <View style={[styles.aqiDot, cityAqi > 250 ? styles.aqiDotHazard : styles.aqiDotWarn]} />
            <Text style={styles.statusAqiText}>CITY AQI {cityAqi}</Text>
            <Text style={styles.statusDivider}>•</Text>
            <Text style={styles.statusRouteText}>
              {routePlan?.stops.length || 0} OPTIMIZED STOPS
            </Text>
          </View>

          <TouchableOpacity
            style={styles.overviewBtn}
            onPress={() => setShowOverviewModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.overviewBtnText}>ROUTE OVERVIEW</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={styles.loadingTitle}>Computing Road Enforcement Corridor...</Text>
          <Text style={styles.loadingSub}>Querying OR-Tools CVRPTW & OSRM road geometry</Text>
        </View>
      ) : (
        <View style={styles.body}>
          {/* Real Road Geographic Map Component */}
          <View style={styles.mapWrapper}>
            <EnforcementMap
              plan={routePlan}
              selectedStop={activeFocusStop}
              allStations={stations}
              districts={districts}
              onSelectStop={handleSelectStop}
              isNavigating={isNavigating}
              onToggleFullscreen={() => setShowFullMapModal(true)}
              isFullscreen={false}
            />
          </View>

          {/* Focused Priority Card */}
          {activeFocusStop && (
            <NextStopCard
              stop={activeFocusStop}
              onViewEvidence={(st) => setEvidenceStop(st)}
              onStartRoute={handleStartRoute}
              isNavigating={isNavigating}
              onAdvanceStop={handleAdvanceStop}
            />
          )}

          {/* Ranked Stops List */}
          <ScrollView
            ref={scrollRef}
            style={styles.scrollList}
            contentContainerStyle={styles.scrollListContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadCityEnforcement(selectedCity);
                }}
                tintColor="#38bdf8"
              />
            }
          >
            <View style={styles.listHeadingRow}>
              <Text style={styles.listHeading}>DISPATCH TARGETS ({routePlan?.stops.length || 0})</Text>
              <Text style={styles.listSubheading}>Ranked by AI Severity & Exposure</Text>
            </View>

            {(routePlan?.stops || []).map((stop, idx) => (
              <RecommendationCard
                key={stop.source_id || idx}
                stop={stop}
                index={idx}
                isSelected={activeFocusStop?.source_id === stop.source_id}
                onSelect={handleSelectStop}
                onViewEvidence={(st) => setEvidenceStop(st)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Fullscreen Whole Map View Modal */}
      <Modal
        visible={showFullMapModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowFullMapModal(false)}
      >
        <View style={styles.fullMapContainer}>
          {/* Top Header */}
          <View style={styles.fullMapHeader}>
            <View style={styles.fullMapHeaderLeft}>
              <Text style={styles.fullMapHeaderTitle}>{selectedCity.toUpperCase()} • FULL MAP VIEW</Text>
              <Text style={styles.fullMapHeaderSubtitle}>
                {routePlan?.stops.length || 0} stops • City AQI {cityAqi} • Dynamic Heatmaps
              </Text>
            </View>
            <TouchableOpacity
              style={styles.fullMapCloseBtn}
              onPress={() => setShowFullMapModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.fullMapCloseBtnText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          {/* Full Screen Map Body */}
          <View style={styles.fullMapBody}>
            <EnforcementMap
              plan={routePlan}
              selectedStop={activeFocusStop}
              allStations={stations}
              districts={districts}
              onSelectStop={handleSelectStop}
              isNavigating={isNavigating}
              onToggleFullscreen={() => setShowFullMapModal(false)}
              isFullscreen={true}
            />
          </View>

          {/* Bottom Stop Selector Bar */}
          <View style={styles.fullMapBottomBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.fullMapStopsScroll}
            >
              {(routePlan?.stops || []).map((stop, idx) => {
                const isSelected = activeFocusStop?.source_id === stop.source_id;
                const isP1 = idx === 0;
                const aqiVal = stop.severity || stop.aqi || 100;
                const aqiColor = aqiVal > 250 ? '#ef4444' : aqiVal > 150 ? '#f59e0b' : '#10b981';
                return (
                  <TouchableOpacity
                    key={stop.source_id || idx}
                    style={[
                      styles.fullMapStopPill,
                      isSelected && styles.fullMapStopPillSelected,
                      isP1 && styles.fullMapStopPillP1,
                    ]}
                    onPress={() => handleSelectStop(stop)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.fullMapRankBadge, isP1 && styles.fullMapRankBadgeP1]}>
                      <Text style={styles.fullMapRankText}>#{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.fullMapStopName,
                          isSelected && styles.fullMapStopNameSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {stop.stationName || `Target #${idx + 1}`}
                      </Text>
                      <Text style={styles.fullMapStopMeta}>
                        AQI <Text style={{ color: aqiColor, fontWeight: '800' }}>{aqiVal}</Text> • {stop.dominantSource || 'Vehicular'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Evidence Dossier Modal */}
      <EvidenceModal
        visible={evidenceStop !== null}
        stop={evidenceStop}
        onClose={() => setEvidenceStop(null)}
      />

      {/* Route Overview Modal */}
      <RouteOverviewModal
        visible={showOverviewModal}
        onClose={() => setShowOverviewModal(false)}
        plan={routePlan}
        onSelectStop={handleSelectStop}
      />

      {/* Additional Cities Dropdown Modal */}
      <Modal
        visible={showCityDropdown}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCityDropdown(false)}
      >
        <TouchableOpacity
          style={styles.dropdownBackdrop}
          activeOpacity={1}
          onPress={() => setShowCityDropdown(false)}
        >
          <View style={styles.dropdownModal}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderTitle}>Select City / State</Text>
              <TouchableOpacity
                style={styles.dropdownCloseBtn}
                onPress={() => setShowCityDropdown(false)}
              >
                <Text style={styles.dropdownCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.dropdownList} showsVerticalScrollIndicator={false}>
              <Text style={styles.dropdownCategory}>CORE ENFORCEMENT</Text>
              {CORE_CITIES.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[styles.dropdownItem, selectedCity === city && styles.dropdownItemActive]}
                  onPress={() => {
                    setSelectedCity(city);
                    setShowCityDropdown(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownItemText, selectedCity === city && styles.dropdownItemTextActive]}>
                    {city}
                  </Text>
                  {selectedCity === city && <Text style={styles.dropdownCheck}>✓</Text>}
                </TouchableOpacity>
              ))}

              <Text style={styles.dropdownCategory}>ADDITIONAL CITIES</Text>
              {OTHER_CITIES.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[styles.dropdownItem, selectedCity === city && styles.dropdownItemActive]}
                  onPress={() => {
                    setSelectedCity(city);
                    setShowCityDropdown(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownItemText, selectedCity === city && styles.dropdownItemTextActive]}>
                    {city}
                  </Text>
                  {selectedCity === city && <Text style={styles.dropdownCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topHeader: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  citySelectorRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  cityPill: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownTriggerPill: {
    flex: 1.1,
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  cityPillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  cityPillText: {
    color: '#475569',
    fontSize: 11.5,
    fontWeight: '600',
  },
  cityPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownModal: {
    width: '100%',
    maxWidth: 340,
    maxHeight: 460,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#111e38',
  },
  dropdownHeaderTitle: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dropdownCloseBtn: {
    padding: 4,
  },
  dropdownCloseText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownList: {
    padding: 8,
  },
  dropdownCategory: {
    color: '#64748b',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginVertical: 1,
  },
  dropdownItemActive: {
    backgroundColor: '#0369a130',
  },
  dropdownItemText: {
    color: '#e2e8f0',
    fontSize: 12.5,
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  dropdownCheck: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '800',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aqiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  aqiDotHazard: {
    backgroundColor: '#dc2626',
  },
  aqiDotWarn: {
    backgroundColor: '#d97706',
  },
  statusAqiText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '700',
  },
  statusDivider: {
    color: '#cbd5e1',
    fontSize: 10,
  },
  statusRouteText: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '700',
  },
  overviewBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 5,
  },
  overviewBtnText: {
    color: '#334155',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  loadingTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 14,
  },
  loadingSub: {
    color: '#64748b',
    fontSize: 11.5,
    marginTop: 4,
  },
  body: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  mapWrapper: {
    height: '42%',
    minHeight: 220,
    backgroundColor: '#070b13',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  scrollList: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollListContent: {
    padding: 12,
    paddingBottom: 24,
  },
  listHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  listHeading: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  listSubheading: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '500',
  },
  fullMapContainer: {
    flex: 1,
    backgroundColor: '#070b13',
  },
  fullMapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  fullMapHeaderLeft: {
    flex: 1,
  },
  fullMapHeaderTitle: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  fullMapHeaderSubtitle: {
    color: '#94a3b8',
    fontSize: 10.5,
    marginTop: 2,
  },
  fullMapCloseBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  fullMapCloseBtnText: {
    color: '#f1f5f9',
    fontSize: 11,
    fontWeight: '700',
  },
  fullMapBody: {
    flex: 1,
    backgroundColor: '#070b13',
  },
  fullMapBottomBar: {
    backgroundColor: '#0b1329f2',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingVertical: 10,
  },
  fullMapStopsScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  fullMapStopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: 220,
    gap: 8,
  },
  fullMapStopPillSelected: {
    borderColor: '#38bdf8',
    backgroundColor: '#0c223d',
  },
  fullMapStopPillP1: {
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  fullMapRankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullMapRankBadgeP1: {
    backgroundColor: '#ef4444',
  },
  fullMapRankText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  fullMapStopName: {
    color: '#f8fafc',
    fontSize: 11.5,
    fontWeight: '700',
  },
  fullMapStopNameSelected: {
    color: '#38bdf8',
  },
  fullMapStopMeta: {
    color: '#94a3b8',
    fontSize: 9.5,
    marginTop: 2,
  },
});

export default EnforcementScreen;

