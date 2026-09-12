import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import {
  computeDistricts,
  getAQIAtCoordinate,
  getSpatialDataAtCoordinate,
  rankDistrictsMCDA,
  getDistrictsRankedBySeverity,
} from '../data/districts';
import type { District, RoadRoutePlan, RouteStop, Station, MCDADistrictRecommendation, HardwareReading } from '../types/index';
import { EnforcementMap } from '../components/EnforcementMap';
import { NextStopCard } from '../components/NextStopCard';
import { RecommendationCard } from '../components/RecommendationCard';
import { EvidenceModal } from '../components/EvidenceModal';
import { RouteOverviewModal } from '../components/RouteOverviewModal';
import { sensorAlertService } from '../services/sensorAlertService';

export function getAqiCategory(aqi: number): { label: string; color: string; bg: string } {
  if (aqi <= 50) return { label: 'Good', color: '#22c55e', bg: '#ecfdf5' };
  if (aqi <= 100) return { label: 'Moderate', color: '#84cc16', bg: '#f7fee7' };
  if (aqi <= 150) return { label: 'USG', color: '#eab308', bg: '#fefce8' };
  if (aqi <= 200) return { label: 'Unhealthy', color: '#f59e0b', bg: '#fffbeb' };
  if (aqi <= 250) return { label: 'Poor', color: '#f97316', bg: '#fff7ed' };
  if (aqi <= 300) return { label: 'Very Unhealthy', color: '#ef4444', bg: '#fef2f2' };
  if (aqi <= 400) return { label: 'Severe', color: '#dc2626', bg: '#fef2f2' };
  return { label: 'Hazardous', color: '#b91c1c', bg: '#fef2f2' };
}

const CORE_CITIES = ['Delhi', 'Hyderabad', 'Bengaluru'];
const OTHER_CITIES = [
  'Guwahati',
  'Mumbai',
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
  Bengaluru: { name: 'BBMP Central Command (Hudson Circle)', lat: 12.9716, lon: 77.5946 },
  Guwahati: { name: 'Assam PCB Regional Depot (Dispur)', lat: 26.1444, lon: 91.7362 },
  Mumbai: { name: 'BMC Municipal Control Centre (Fort)', lat: 18.9388, lon: 72.8354 },
  Chennai: { name: 'Greater Chennai Corporation HQ (Ripon Bldg)', lat: 13.0827, lon: 80.2707 },
  Kolkata: { name: 'KMC Central Headquarters (Esplanade)', lat: 22.5626, lon: 88.3510 },
  Pune: { name: 'PMC Command Control Center (Shivajinagar)', lat: 18.5204, lon: 73.8567 },
  Ahmedabad: { name: 'AMC Central Headquarters (Danapith)', lat: 23.0225, lon: 72.5714 },
  Jaipur: { name: 'Jaipur Municipal Headquarters (Lalkothi)', lat: 26.9124, lon: 75.7873 },
  Lucknow: { name: 'LMC Central Headquarters (Hazratganj)', lat: 26.8467, lon: 80.9462 },
  Chandigarh: { name: 'Municipal Corporation HQ (Sector 17)', lat: 30.7333, lon: 76.7794 },
};

function districtToRouteStop(d: District, rank: number, city: string): RouteStop {
  const aqi = d.aqi || 220;
  const pm25 = d.pm25 || 85;
  const pm10 = d.pm10 || 160;
  const no2 = d.no2 || 55;
  const so2 = d.so2 || 18;
  const co = d.co || 1.8;
  const o3 = d.o3 || 32;
  const wind = d.wind_speed || 2.2;
  const pblh = d.pblh || 750;
  const vi = Math.round(pblh * wind);

  let dominantSource = 'Fugitive Dust';
  let legalBasis = 'Air (P&CP) Act 1981 §31A';
  if (so2 > 25 || (pm25 > 100 && so2 > 15)) {
    dominantSource = 'Industrial Emissions';
    legalBasis = 'EP Act 1986 §15 / Industrial Stack Mandate';
  } else if (no2 > 60 || co > 2.0) {
    dominantSource = 'Vehicular Traffic';
    legalBasis = 'Motor Vehicles Act §190(2) / GRAP Stage IV';
  }

  return {
    source_id: `DIST_${d.id}`,
    lat: d.centroid ? d.centroid[1] : 28.6139,
    lon: d.centroid ? d.centroid[0] : 77.2090,
    eta: '10 min',
    action: aqi >= 250 ? 'FULL_INSPECTION' : 'VERIFY_FIRST',
    roi: Math.round(aqi * 1.2),
    stationName: `${d.name} Sector`,
    severity: aqi,
    aqi,
    pm25,
    pm10,
    no2,
    so2,
    co,
    o3,
    temp: d.temp,
    humidity: d.humidity,
    pressure: d.pressure,
    wind_speed: wind,
    wind_dir: d.wind_dir,
    pblh,
    ventilation_index: vi,
    dominantSource,
    sourceConfidence: 0.92,
    populationExposed: 145000 + (rank * 25000) % 60000,
    legalBasis,
    evidenceRationale: `District spatial load (AQI ${aqi}) with ${dominantSource.toLowerCase()} indicator dominance.`,
    priorityRank: rank,
    distanceFromPrev: '3.8 km',
    durationFromPrev: '12 min',
    isCompleted: false,
  };
}

export const EnforcementScreen: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<string>('Delhi');
  const [stations, setStations] = useState<Station[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [routePlan, setRoutePlan] = useState<RoadRoutePlan | null>(null);
  const [selectedStop, setSelectedStop] = useState<RouteStop | null>(null);
  const [cityAqi, setCityAqi] = useState<number>(202);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [navStopIndex, setNavStopIndex] = useState<number>(0);

  const [liveHardwareReading, setLiveHardwareReading] = useState<HardwareReading | null>(null);

  // Modals
  const [evidenceStop, setEvidenceStop] = useState<RouteStop | null>(null);
  const [showOverviewModal, setShowOverviewModal] = useState<boolean>(false);
  const [showFullMapModal, setShowFullMapModal] = useState<boolean>(false);
  const [showCityDropdown, setShowCityDropdown] = useState<boolean>(false);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setLiveHardwareReading(sensorAlertService.getLatestReading());
    const unsub = sensorAlertService.subscribe(() => {
      setLiveHardwareReading(sensorAlertService.getLatestReading());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    loadCityEnforcement(selectedCity);
    const interval = setInterval(() => {
      loadCityEnforcement(selectedCity, true); // background refresh without resetting scroll/loading spinner
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedCity]);

  const loadCityEnforcement = async (city: string, isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setIsNavigating(false);
      setNavStopIndex(0);
      setSelectedDistrict(null);
    }
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
        : (city === 'Delhi' ? 205 : city === 'Hyderabad' ? 172 : city === 'Bengaluru' ? 165 : 155);
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
        (city === 'Delhi' ? 240 + (idx * 20) % 80 : city === 'Hyderabad' ? 180 + (idx * 15) % 60 : city === 'Bengaluru' ? 170 + (idx * 15) % 55 : 150 + (idx * 10) % 40);

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
          : city === 'Bengaluru'
          ? 140000 + (idx * 30000) % 80000
          : 65000 + (idx * 15000) % 40000;
      const isP1 = idx === 0;

      const stationDisplayName =
        stop.stationName ||
        matchedStation?.name ||
        (spatialData?.districtName ? `${spatialData.districtName} Sector` : `Corridor Zone #${idx + 1}`);

      const legalBasis =
        displayAQI >= 300
          ? (city === 'Delhi' ? 'GRAP Stage III §4.2' : 'Air Act 1981 §31A / Emergency Order')
          : (city === 'Bengaluru' ? 'KSPCB Action Plan §5.1' : city === 'Delhi' ? 'GRAP Stage II §3.1' : 'State PCB Action Plan §4.1');

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
        legalBasis,
        evidenceRationale: `High severity (AQI ${displayAQI}) coupled with ${populationExposed.toLocaleString()} exposed population.`,
        isCompleted: false,
      };
    });
  };

  // Ranked districts calculations (matching website leaderboard and MCDA engine)
  const rankedDistricts = useMemo(() => {
    return getDistrictsRankedBySeverity(districts);
  }, [districts]);

  const mcdaRankings = useMemo(() => {
    return rankDistrictsMCDA(districts);
  }, [districts]);

  const cleanestDistrict = useMemo(() => {
    if (rankedDistricts.length === 0) return null;
    return rankedDistricts[rankedDistricts.length - 1];
  }, [rankedDistricts]);

  const worstDistrict = useMemo(() => {
    if (rankedDistricts.length === 0) return null;
    return rankedDistricts[0];
  }, [rankedDistricts]);

  const handleSelectStop = (stop: RouteStop) => {
    setSelectedStop(stop);
  };

  const handleSelectDistrict = (district: District) => {
    setSelectedDistrict(district);
    const rank = rankedDistricts.findIndex((d) => d.id === district.id) + 1 || 1;
    const syntheticStop = districtToRouteStop(district, rank, selectedCity);
    setSelectedStop(syntheticStop);
  };

  const handleInspectDistrict = (district: District) => {
    handleSelectDistrict(district);
    const rank = rankedDistricts.findIndex((d) => d.id === district.id) + 1 || 1;
    const stop = districtToRouteStop(district, rank, selectedCity);
    setEvidenceStop(stop);
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
      {/* Main Full-Page Scroll View */}
      <ScrollView
        ref={scrollRef}
        style={styles.mainScrollView}
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadCityEnforcement(selectedCity);
            }}
            tintColor="#0284c7"
          />
        }
      >
        {/* Top Header Card */}
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
                {OTHER_CITIES.includes(selectedCity) ? selectedCity : 'More'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Corridor & Heatmap Status Bar */}
          <View style={styles.statusBar}>
            <View style={styles.statusLeft}>
              <View style={[styles.aqiDot, cityAqi > 250 ? styles.aqiDotHazard : styles.aqiDotWarn]} />
              <Text style={styles.statusAqiText}>CITY AQI {cityAqi}</Text>
              <Text style={styles.statusDivider}>|</Text>
              <Text style={styles.statusRouteText}>
                {districts.length} DISTRICTS | {routePlan?.stops.length || 0} TARGETS
              </Text>
            </View>

            <TouchableOpacity
              style={styles.overviewBtn}
              onPress={() => setShowOverviewModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.overviewBtnText}>CORRIDOR ROUTE</Text>
            </TouchableOpacity>
          </View>

          {/* Cleanest vs Worst District Summary */}
          {worstDistrict && cleanestDistrict && (
            <View style={styles.leaderboardPillRow}>
              <View style={styles.leaderboardPillItem}>
                <Text style={styles.leaderboardPillLabel}>MAX SEVERE:</Text>
                <Text style={styles.leaderboardPillVal} numberOfLines={1}>
                  {worstDistrict.name.replace(/Zone|District|Revenue/g, '').trim()} ({worstDistrict.aqi})
                </Text>
              </View>
              <View style={styles.leaderboardPillDivider} />
              <View style={styles.leaderboardPillItem}>
                <Text style={styles.leaderboardPillLabel}>MIN RISK:</Text>
                <Text style={styles.leaderboardPillVal} numberOfLines={1}>
                  {cleanestDistrict.name.replace(/Zone|District|Revenue/g, '').trim()} ({cleanestDistrict.aqi})
                </Text>
              </View>
            </View>
          )}

          {/* Live Edge Node Alert Banner — only shows on breach */}
          {liveHardwareReading && liveHardwareReading.pm25 >= 60 && (
            <View style={styles.hardwareLiveBannerAlert}>
              <View style={styles.alertPulseDot} />
              <Text style={styles.hardwareAlertText} numberOfLines={1}>
                {(liveHardwareReading.station_id || 'ESP32').toUpperCase()}: PM2.5 {liveHardwareReading.pm25} µg/m³ — threshold exceeded
              </Text>
            </View>
          )}
          {liveHardwareReading && liveHardwareReading.pm25 < 60 && (
            <View style={styles.hardwareLiveBanner}>
              <View style={styles.livePulseDot} />
              <Text style={styles.hardwareLiveText} numberOfLines={1}>
                Hardware sensor normal — PM2.5 {liveHardwareReading.pm25} µg/m³
              </Text>
            </View>
          )}

        </View>

        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0284c7" />
            <Text style={styles.loadingTitle}>Loading patrol data...</Text>
            <Text style={styles.loadingSub}>Fetching air quality data and computing routes</Text>
          </View>
        ) : (
          <View style={styles.contentSection}>
            {/* Map Container */}
            <View style={styles.mapWrapper}>
              <EnforcementMap
                plan={routePlan}
                selectedStop={activeFocusStop}
                selectedDistrictId={selectedDistrict?.id || null}
                allStations={stations}
                districts={districts}
                city={selectedCity}
                onSelectStop={handleSelectStop}
                onSelectDistrict={handleSelectDistrict}
                isNavigating={isNavigating}
                onToggleFullscreen={() => setShowFullMapModal(true)}
                isFullscreen={false}
              />
            </View>

            {/* Focused Priority Target / District Card */}
            {activeFocusStop && (
              <NextStopCard
                stop={activeFocusStop}
                onViewEvidence={(st) => setEvidenceStop(st)}
                onStartRoute={handleStartRoute}
                isNavigating={isNavigating}
                onAdvanceStop={handleAdvanceStop}
              />
            )}

            {/* List Heading */}
            <View style={styles.listHeadingRow}>
              <Text style={styles.listHeading}>
                Dispatch targets ({routePlan?.stops.length || 0})
              </Text>
            </View>

            {/* Dispatch Targets List */}
            <View style={styles.cardsContainer}>
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
            </View>
          </View>
        )}
      </ScrollView>

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
              <Text style={styles.fullMapHeaderTitle}>{selectedCity.toUpperCase()} - FULL HEATMAP VIEW</Text>
              <Text style={styles.fullMapHeaderSubtitle}>
                {districts.length} Districts | {routePlan?.stops.length || 0} Targets | City AQI {cityAqi}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.fullMapCloseBtn}
              onPress={() => setShowFullMapModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.fullMapCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>

          {/* Full Screen Map Body */}
          <View style={styles.fullMapBody}>
            <EnforcementMap
              plan={routePlan}
              selectedStop={activeFocusStop}
              selectedDistrictId={selectedDistrict?.id || null}
              allStations={stations}
              districts={districts}
              city={selectedCity}
              onSelectStop={handleSelectStop}
              onSelectDistrict={handleSelectDistrict}
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
                const category = getAqiCategory(aqiVal);
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
                        AQI <Text style={{ color: category.color, fontWeight: '800' }}>{aqiVal}</Text> | {stop.dominantSource || 'Vehicular'}
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
        city={selectedCity}
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
              <Text style={styles.dropdownHeaderTitle}>Select City / Municipal Zone</Text>
              <TouchableOpacity
                style={styles.dropdownCloseBtn}
                onPress={() => setShowCityDropdown(false)}
              >
                <Text style={styles.dropdownCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.dropdownList} showsVerticalScrollIndicator={false}>
              <Text style={styles.dropdownCategory}>CORE JURISDICTIONS</Text>
              {CORE_CITIES.map((city: string) => (
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
                  {selectedCity === city && <Text style={styles.dropdownCheck}>Selected</Text>}
                </TouchableOpacity>
              ))}

              <Text style={styles.dropdownCategory}>METROPOLITAN REGIONS</Text>
              {OTHER_CITIES.map((city: string) => (
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
                  {selectedCity === city && <Text style={styles.dropdownCheck}>Selected</Text>}
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
  mainScrollView: {
    flex: 1,
  },
  mainScrollContent: {
    paddingBottom: 40,
  },
  topHeader: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
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
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aqiDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  aqiDotHazard: {
    backgroundColor: '#ef4444',
  },
  aqiDotWarn: {
    backgroundColor: '#f59e0b',
  },
  statusAqiText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '800',
  },
  statusDivider: {
    color: '#cbd5e1',
    fontSize: 11,
  },
  statusRouteText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  overviewBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 4,
  },
  overviewBtnText: {
    color: '#0284c7',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  leaderboardPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  leaderboardPillItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leaderboardPillLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  leaderboardPillVal: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  leaderboardPillDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 6,
  },
  hardwareLiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8,
    gap: 6,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  hardwareLiveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
    flex: 1,
  },
  hardwareLiveBannerAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 8,
    gap: 6,
  },
  alertPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dc2626',
  },
  hardwareAlertText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991b1b',
    flex: 1,
  },
  viewSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    padding: 2,
    gap: 2,
  },
  switcherBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switcherBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  switcherBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.2,
  },
  switcherBtnTextActive: {
    color: '#0284c7',
    fontWeight: '800',
  },
  contentSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  mapWrapper: {
    height: 250,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#070b13',
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  listHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
    marginTop: 4,
  },
  listHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  listSubheading: {
    fontSize: 9.5,
    color: '#64748b',
    fontWeight: '600',
  },
  cardsContainer: {
    gap: 2,
  },
  loadingContainer: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  loadingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  loadingSub: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
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
    paddingVertical: 12,
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
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  fullMapHeaderSubtitle: {
    color: '#94a3b8',
    fontSize: 10,
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
  },
  fullMapBottomBar: {
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingVertical: 8,
  },
  fullMapStopsScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  fullMapStopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 140,
    maxWidth: 180,
    gap: 6,
  },
  fullMapStopPillSelected: {
    borderColor: '#38bdf8',
    backgroundColor: '#0369a130',
  },
  fullMapStopPillP1: {
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  fullMapRankBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullMapRankBadgeP1: {
    backgroundColor: '#ef4444',
  },
  fullMapRankText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  fullMapStopName: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '700',
  },
  fullMapStopNameSelected: {
    color: '#38bdf8',
  },
  fullMapStopMeta: {
    color: '#94a3b8',
    fontSize: 9,
    marginTop: 1,
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
    fontSize: 13,
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
    fontWeight: '800',
    fontSize: 11,
  },
});
