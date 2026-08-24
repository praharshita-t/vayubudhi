import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import type { District, RoadRoutePlan, RouteStop, Station } from '../types/index';

const SafeWebView = WebView as any;

const CITY_CENTERS_MAP: Record<string, { name: string; lat: number; lon: number }> = {
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

interface EnforcementMapProps {
  plan: RoadRoutePlan | null;
  selectedStop: RouteStop | null;
  allStations?: Station[];
  districts?: District[];
  city?: string;
  onSelectStop: (stop: RouteStop) => void;
  isNavigating?: boolean;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

export const EnforcementMap: React.FC<EnforcementMapProps> = ({
  plan,
  selectedStop,
  allStations = [],
  districts = [],
  city = 'Delhi',
  onSelectStop,
  isNavigating = false,
  onToggleFullscreen,
  isFullscreen = false,
}) => {
  const webViewRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const defaultDepot = CITY_CENTERS_MAP[city] || CITY_CENTERS_MAP.Delhi;
  const depot = plan?.depot || defaultDepot;
  const stops = plan?.stops || [];
  const fullGeometry = plan?.fullGeometry || [];
  const isRoadFollowing = plan?.isRoadFollowing ?? true;

  // Generate self-contained Leaflet / Carto Dark Matter HTML for map rendering
  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #070b13; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    
    /* Custom Leaflet Controls */
    .leaflet-control-zoom { border: none !important; box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important; }
    .leaflet-control-zoom a { background-color: #111827 !important; color: #94a3b8 !important; border: 1px solid #1e293b !important; }
    .leaflet-control-zoom a:hover { background-color: #1e293b !important; color: #38bdf8 !important; }
    .leaflet-control-attribution { background: rgba(7, 11, 19, 0.8) !important; color: #475569 !important; font-size: 8px !important; }
    .leaflet-control-attribution a { color: #64748b !important; }

    /* Custom Depot Marker */
    .depot-marker {
      background: #0f172a;
      border: 2px solid #38bdf8;
      border-radius: 8px;
      color: #38bdf8;
      font-size: 10px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 14px rgba(56, 189, 248, 0.4), inset 0 0 6px rgba(56, 189, 248, 0.2);
    }
    .depot-marker::after {
      content: '';
      position: absolute;
      bottom: -6px;
      left: 50%;
      margin-left: -5px;
      border-width: 6px 5px 0 5px;
      border-style: solid;
      border-color: #38bdf8 transparent transparent transparent;
    }

    /* Background Station Dot */
    .network-station-dot {
      background: transparent !important;
      border: none !important;
    }
    .network-station-dot-inner {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.7);
      box-shadow: 0 0 6px rgba(0,0,0,0.8);
      cursor: pointer;
    }

    /* Enforcement Stop Markers */
    .stop-marker-wrapper {
      background: transparent !important;
      border: none !important;
    }

    .pin-inner {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      color: #ffffff;
      font-size: 11px;
      box-shadow: 0 3px 8px rgba(0,0,0,0.8);
      cursor: pointer;
    }

    .pin-inner.priority-1 {
      background: #ef4444;
      border: 2.5px solid #ffffff;
      box-shadow: 0 0 16px rgba(239, 68, 68, 0.95), 0 0 0 3px rgba(239, 68, 68, 0.4);
    }

    .pin-inner.priority-sub {
      background: #0284c7;
      border: 2px solid #93c5fd;
    }

    @keyframes hyperPulse {
      0% {
        box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.8), 0 0 16px rgba(250, 204, 21, 1);
        transform: scale(1);
      }
      50% {
        box-shadow: 0 0 0 18px rgba(56, 189, 248, 0), 0 0 26px rgba(250, 204, 21, 1);
        transform: scale(1.28);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(56, 189, 248, 0), 0 0 16px rgba(250, 204, 21, 1);
        transform: scale(1);
      }
    }

    .pin-inner.selected, .pin-inner.hyper-focus {
      border: 2.5px solid #facc15 !important;
      animation: hyperPulse 1.6s infinite ease-in-out !important;
      z-index: 9999 !important;
    }

    .pin-inner.inspected {
      background: #10b981;
      border: 2px solid #6ee7b7;
      opacity: 0.85;
    }

    /* Popup Styling */
    .leaflet-popup-content-wrapper {
      background: #0f172a !important;
      color: #f8fafc !important;
      border: 1px solid #334155 !important;
      border-radius: 8px !important;
      padding: 0 !important;
      box-shadow: 0 8px 24px rgba(0,0,0,0.8) !important;
    }
    .leaflet-popup-tip {
      background: #0f172a !important;
      border: 1px solid #334155 !important;
    }
    .popup-box {
      padding: 10px 14px;
      font-size: 11px;
    }
    .popup-title {
      font-weight: 800;
      color: #38bdf8;
      font-size: 13px;
      margin-bottom: 3px;
    }
    .popup-badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      background: #ef444420;
      color: #f87171;
      border: 1px solid #ef444450;
      margin-bottom: 6px;
    }
    .popup-metric {
      color: #94a3b8;
      font-size: 11px;
      line-height: 1.45;
    }
    .popup-metric strong {
      color: #f1f5f9;
    }
    .popup-physics {
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px solid #1e293b;
      font-size: 10px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const depotData = ${JSON.stringify(depot)};
    const stopsData = ${JSON.stringify(stops)};
    const stationsData = ${JSON.stringify(allStations)};
    const districtsData = ${JSON.stringify(districts)};
    const fullGeo = ${JSON.stringify(fullGeometry)};
    const selectedStopId = ${JSON.stringify(selectedStop ? selectedStop.source_id : null)};
    const isNavigating = ${isNavigating ? 'true' : 'false'};

    // Helper for AQI color mapping
    function getAqiColor(aqi) {
      if (aqi <= 50) return '#22c55e';
      if (aqi <= 100) return '#84cc16';
      if (aqi <= 200) return '#eab308';
      if (aqi <= 300) return '#f97316';
      if (aqi <= 400) return '#ef4444';
      return '#b91c1c';
    }

    // Initialize Map with CartoDB Dark Matter tiles
    const initialLat = depotData.lat || 28.6139;
    const initialLon = depotData.lon || 77.2090;

    const map = L.map('map', {
      center: [initialLat, initialLon],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
    }).addTo(map);

    // 0. Plot Geospatial District Boundaries (Color-Coded AQI Heatmap)
    districtsData.forEach(dist => {
      if (dist.polygon && dist.polygon.length > 0) {
        const latLngs = dist.polygon.map(pt => [pt[1], pt[0]]);
        const color = getAqiColor(dist.aqi || 100);
        const poly = L.polygon(latLngs, {
          color: color,
          weight: 1.2,
          opacity: 0.65,
          fillColor: color,
          fillOpacity: 0.16,
        }).addTo(map);

        const viVal = Math.round((dist.pblh || 800) * (dist.wind_speed || 2.0));

        poly.bindPopup(
          '<div class="popup-box">' +
            '<div class="popup-title">' + dist.name + ' Sector</div>' +
            '<div class="popup-metric">District NAQI: <strong style="color:' + color + ';">' + (dist.aqi || 100) + '</strong></div>' +
            '<div class="popup-metric">PM2.5: <strong>' + (dist.pm25 || 0).toFixed(1) + '</strong> • PM10: <strong>' + (dist.pm10 || 0).toFixed(1) + ' µg/m³</strong></div>' +
            '<div class="popup-metric">NO₂: ' + (dist.no2 || 0).toFixed(0) + ' • SO₂: ' + (dist.so2 || 0).toFixed(0) + ' • CO: ' + (dist.co || 0).toFixed(1) + '</div>' +
            '<div class="popup-physics">PBLH: ' + (dist.pblh || 800) + 'm • Wind: ' + (dist.wind_speed || 2) + 'm/s • VI: ' + viVal + '</div>' +
          '</div>'
        );
      }
    });

    // 1. Plot Background Network Stations (CPCB / TSPCB / PCBA)
    stationsData.forEach(st => {
      // Check if this station is already in the enforcement corridor stops
      const isCorridorStop = stopsData.some(s => 
        (s.stationName && st.name && s.stationName.toLowerCase() === st.name.toLowerCase()) ||
        (Math.abs(s.lat - st.lat) < 0.001 && Math.abs(s.lon - st.lon) < 0.001)
      );

      if (!isCorridorStop) {
        const dotColor = getAqiColor(st.aqi || 100);
        const dotIcon = L.divIcon({
          className: 'network-station-dot',
          html: '<div class="network-station-dot-inner" style="background:' + dotColor + ';"></div>',
          iconSize: [8, 8],
          iconAnchor: [4, 4],
        });

        const pblhVal = st.pblh || 800;
        const windVal = st.wind_speed || 2.0;
        const viVal = Math.round(pblhVal * windVal);

        L.marker([st.lat, st.lon], { icon: dotIcon })
          .addTo(map)
          .bindPopup(
            '<div class="popup-box">' +
              '<div class="popup-title">' + (st.name || 'Station Node') + '</div>' +
              '<div class="popup-metric">AQI: <strong>' + (st.aqi || 100) + '</strong> (' + (st.status || 'online') + ')</div>' +
              '<div class="popup-metric">PM2.5: <strong>' + (st.pm25 || 0).toFixed(1) + '</strong> • PM10: <strong>' + (st.pm10 || 0).toFixed(1) + ' µg/m³</strong></div>' +
              '<div class="popup-physics">PBLH: ' + pblhVal + 'm • Wind: ' + windVal + 'm/s • VI: ' + viVal + '</div>' +
            '</div>'
          );
      }
    });

    // 2. Plot Command Depot HQ
    const depotIcon = L.divIcon({
      className: 'depot-marker',
      html: 'HQ',
      iconSize: [32, 24],
      iconAnchor: [16, 24],
      popupAnchor: [0, -24],
    });

    L.marker([depotData.lat, depotData.lon], { icon: depotIcon })
      .addTo(map)
      .bindPopup('<div class="popup-box"><div class="popup-title">DEPOT / COMMAND HQ</div><div class="popup-metric">' + (depotData.name || 'Enforcement Fleet Origin') + '</div></div>');

    // 3. Plot Road-Following Route Polyline
    let polyline;
    if (fullGeo && fullGeo.length > 1) {
      const latLngs = fullGeo.map(pt => [pt[1], pt[0]]);
      
      // Outer glow line
      L.polyline(latLngs, {
        color: '#0284c7',
        weight: 6,
        opacity: 0.45,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Inner crisp road path
      polyline = L.polyline(latLngs, {
        color: '#38bdf8',
        weight: 3.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: ${isRoadFollowing ? 'null' : "'6, 8'"},
      }).addTo(map);
    }

    // 4. Plot Prioritized Enforcement Stops
    const stopMarkers = [];
    stopsData.forEach((stop, index) => {
      const isP1 = (stop.priorityRank === 1 || index === 0);
      const isSelected = (selectedStopId && stop.source_id === selectedStopId) || (!selectedStopId && isP1);
      const isCompleted = stop.isCompleted;

      let innerClass = 'pin-inner ' + (isP1 ? 'priority-1' : 'priority-sub');
      if (isSelected) innerClass += ' selected';
      if (isCompleted) innerClass += ' inspected';

      const size = isP1 ? 30 : 26;
      const rank = stop.priorityRank || (index + 1);

      const icon = L.divIcon({
        className: 'stop-marker-wrapper',
        html: '<div class="' + innerClass + '"><span>' + rank + '</span></div>',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -(size / 2 + 4)],
      });

      const m = L.marker([stop.lat, stop.lon], { icon }).addTo(map);
      stopMarkers.push({ stop: stop, marker: m, rank: rank });

      const actionText = stop.action === 'FULL_INSPECTION' ? 'FULL INSPECTION' : 'VERIFY FIRST';
      const aqiText = stop.severity || stop.aqi || 200;
      const pm25Text = stop.pm25 || 118;
      const etaText = stop.durationFromPrev || stop.eta || '15 min';

      const pblh = stop.pblh || 850;
      const wind = stop.wind_speed || 2.4;
      const vi = stop.ventilation_index || Math.round(pblh * wind);

      m.bindPopup(
        '<div class="popup-box">' +
          '<div class="popup-badge">#' + rank + ' ' + actionText + '</div>' +
          '<div class="popup-title">' + (stop.stationName || 'Target Zone') + '</div>' +
          '<div class="popup-metric">NAQI Severity: <strong>' + aqiText + '</strong> • PM2.5: <strong>' + pm25Text + ' µg/m³</strong></div>' +
          '<div class="popup-metric">Dominant: <strong>' + (stop.dominantSource || 'Vehicular') + '</strong></div>' +
          '<div class="popup-metric">Leg ETA: <strong>' + etaText + '</strong> (' + (stop.distanceFromPrev || '4.2 km') + ')</div>' +
          '<div class="popup-physics">PBLH: ' + pblh + 'm • Wind: ' + wind + 'm/s • VI Stagnation: ' + vi + '</div>' +
        '</div>'
      );

      m.on('click', function() {
        const msg = JSON.stringify({ type: 'SELECT_STOP', stopId: stop.source_id, index: index, lat: stop.lat, lon: stop.lon });
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(msg);
        } else if (window.parent && window.parent.postMessage) {
          window.parent.postMessage(msg, '*');
        }
      });
    });

    // Auto-fit or zoom
    if (isNavigating && stopsData.length > 0) {
      const focusBounds = L.latLngBounds([[depotData.lat, depotData.lon], [stopsData[0].lat, stopsData[0].lon]]);
      map.fitBounds(focusBounds, { padding: [50, 50], maxZoom: 14 });
    } else if (polyline && fullGeo.length > 1) {
      map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
    } else if (stopsData.length > 0) {
      const bounds = L.latLngBounds([[depotData.lat, depotData.lon], ...stopsData.map(s => [s.lat, s.lon])]);
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (districtsData.length > 0) {
      const allCoords = [];
      districtsData.forEach(d => {
        if (d.polygon) d.polygon.forEach(pt => allCoords.push([pt[1], pt[0]]));
      });
      if (allCoords.length > 0) {
        map.fitBounds(L.latLngBounds(allCoords), { padding: [30, 30] });
      } else {
        map.setView([initialLat, initialLon], 12);
      }
    } else {
      map.setView([initialLat, initialLon], 12);
    }

    // Bridge for postMessages from React Native
    function handleInboundMessage(event) {
      try {
        const raw = event.data;
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!data) return;

        if (data.type === 'FIT_ALL') {
          if (polyline && fullGeo.length > 1) {
            map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
          } else if (stopsData.length > 0) {
            map.fitBounds(L.latLngBounds([[depotData.lat, depotData.lon], ...stopsData.map(s => [s.lat, s.lon])]), { padding: [40, 40] });
          }
        } else if (data.type === 'FIT_CITY') {
          const allCoords = [];
          districtsData.forEach(d => {
            if (d.polygon) d.polygon.forEach(pt => allCoords.push([pt[1], pt[0]]));
          });
          stationsData.forEach(s => allCoords.push([s.lat, s.lon]));
          if (allCoords.length > 0) {
            map.fitBounds(L.latLngBounds(allCoords), { padding: [30, 30] });
          } else if (polyline) {
            map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
          }
        } else if (data.type === 'FOCUS_STOP') {
          // Hyper Zoom to stop coordinates (Street Level Zoom: 16.5)
          map.flyTo([data.lat, data.lon], 16.5, { animate: true, duration: 1.0 });

          stopMarkers.forEach(sm => {
            const isMatched = sm.stop.source_id === data.stopId || (Math.abs(sm.stop.lat - data.lat) < 0.001 && Math.abs(sm.stop.lon - data.lon) < 0.001);
            const el = sm.marker.getElement();
            if (el) {
              const inner = el.querySelector('.pin-inner');
              if (inner) {
                if (isMatched) {
                  inner.classList.add('selected');
                  inner.classList.add('hyper-focus');
                } else {
                  inner.classList.remove('selected');
                  inner.classList.remove('hyper-focus');
                }
              }
            }
            if (isMatched) {
              setTimeout(function() {
                sm.marker.openPopup();
              }, 400);
            }
          });
        }
      } catch (e) {}
    }

    window.addEventListener('message', handleInboundMessage);
    document.addEventListener('message', handleInboundMessage);
  </script>
</body>
</html>
`;

  const handleMessage = (event: any) => {
    try {
      const raw = event.nativeEvent ? event.nativeEvent.data : event.data;
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (data.type === 'SELECT_STOP' && plan?.stops) {
        const matched = plan.stops.find((s) => s.source_id === data.stopId) || plan.stops[data.index];
        if (matched) {
          onSelectStop(matched);
        }
      }
    } catch (e) {
      console.error('[EnforcementMap] Message parse error:', e);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      const webListener = (event: MessageEvent) => {
        handleMessage(event);
      };
      window.addEventListener('message', webListener);
      return () => window.removeEventListener('message', webListener);
    }
  }, [plan]);

  // When selectedStop changes, center map on that exact location
  useEffect(() => {
    if (selectedStop) {
      const msg = JSON.stringify({
        type: 'FOCUS_STOP',
        stopId: selectedStop.source_id,
        lat: selectedStop.lat,
        lon: selectedStop.lon,
      });
      if (Platform.OS === 'web' && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(msg, '*');
      } else if (webViewRef.current) {
        webViewRef.current.postMessage(msg);
      }
    }
  }, [selectedStop]);

  const fitFullRoute = () => {
    const msg = JSON.stringify({ type: 'FIT_ALL' });
    if (Platform.OS === 'web' && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(msg, '*');
    } else if (webViewRef.current) {
      webViewRef.current.postMessage(msg);
    }
  };

  const fitWholeCity = () => {
    const msg = JSON.stringify({ type: 'FIT_CITY' });
    if (Platform.OS === 'web' && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(msg, '*');
    } else if (webViewRef.current) {
      webViewRef.current.postMessage(msg);
    }
  };

  const mapKey = `enforcement_map_${city}_${depot.lat.toFixed(4)}_${depot.lon.toFixed(4)}_${stops.length}_${districts.length}`;

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <iframe
          key={mapKey}
          ref={iframeRef}
          srcDoc={mapHtml}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Enforcement Map"
        />
      ) : (
        <SafeWebView
          key={mapKey}
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          style={styles.webView}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Map Overlay Controls */}
      <View style={styles.mapControls}>
        {onToggleFullscreen && (
          <TouchableOpacity
            style={[styles.controlBtn, isFullscreen && styles.controlBtnActive]}
            onPress={onToggleFullscreen}
            activeOpacity={0.8}
          >
            <Text style={[styles.controlBtnText, isFullscreen && styles.controlBtnTextActive]}>
              {isFullscreen ? 'Minimize' : 'Fullscreen'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.controlBtn} onPress={fitWholeCity} activeOpacity={0.8}>
          <Text style={styles.controlBtnText}>Whole View</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlBtn} onPress={fitFullRoute} activeOpacity={0.8}>
          <Text style={styles.controlBtnText}>Fit Corridor</Text>
        </TouchableOpacity>

        {!isRoadFollowing && (
          <View style={styles.fallbackNotice}>
            <Text style={styles.fallbackNoticeText}>Direct Geometry Fallback</Text>
          </View>
        )}
      </View>

      {/* Map Legend Bar */}
      <View style={styles.legendBar}>
        <View style={styles.legendItem}>
          <View style={styles.legendDepotDot} />
          <Text style={styles.legendLabel}>Depot HQ</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendP1Dot} />
          <Text style={styles.legendLabel}>#1 Priority</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendStationDot} />
          <Text style={styles.legendLabel}>Network Nodes</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendRouteLine} />
          <Text style={styles.legendLabel}>Road Route</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070b13',
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#070b13',
  },
  mapControls: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
  },
  controlBtn: {
    backgroundColor: '#0f172ae0',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  controlBtnActive: {
    backgroundColor: '#38bdf825',
    borderColor: '#38bdf8',
  },
  controlBtnText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  controlBtnTextActive: {
    color: '#7dd3fc',
    fontWeight: '800',
  },
  fallbackNotice: {
    backgroundColor: '#78350fdf',
    borderWidth: 1,
    borderColor: '#d97706',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  fallbackNoticeText: {
    color: '#fef3c7',
    fontSize: 9.5,
    fontWeight: '800',
  },
  legendBar: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172ae8',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDepotDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#38bdf8',
  },
  legendP1Dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  legendStationDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#eab308',
    borderWidth: 1,
    borderColor: '#ffffff80',
  },
  legendRouteLine: {
    width: 14,
    height: 3,
    backgroundColor: '#38bdf8',
    borderRadius: 1,
  },
  legendLabel: {
    color: '#94a3b8',
    fontSize: 9.5,
    fontWeight: '700',
  },
});
