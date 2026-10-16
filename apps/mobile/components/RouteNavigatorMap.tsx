import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Maximize2,
  Minimize2,
  Crosshair,
} from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import type { RideOffer } from '../types';

interface RouteNavigatorMapProps {
  ride?: RideOffer;
  origin?: string;
  destination?: string;
  interactive?: boolean;
  height?: number;
  onBookPress?: () => void;
  onMapClick?: (coords: { latitude: number; longitude: number }) => void;
}

// Haversine distance in meters
function haversine(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const la1 = (a[1] * Math.PI) / 180;
  const la2 = (b[1] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Cumulative distance trajectory generator
function buildJourneyGeo(coords: Array<[number, number]>) {
  const cum = [0];
  for (let i = 1; i < coords.length; i += 1) {
    cum.push(cum[i - 1] + haversine(coords[i - 1], coords[i]));
  }
  return { coords, cum, total: cum[cum.length - 1] ?? 0 };
}

// Find position at fraction t (0.0 to 1.0)
function journeyPosition(
  geo: { coords: Array<[number, number]>; cum: number[]; total: number },
  t: number
): [number, number] {
  if (geo.coords.length === 1) return geo.coords[0];
  const d = Math.min(Math.max(t, 0), 1) * geo.total;
  let i = 1;
  while (i < geo.cum.length && geo.cum[i] < d) i += 1;
  if (i >= geo.coords.length) i = geo.coords.length - 1;
  const segStart = geo.cum[i - 1];
  const segEnd = geo.cum[i];
  const f = segEnd > segStart ? (d - segStart) / (segEnd - segStart) : 0;
  const a = geo.coords[i - 1];
  const b = geo.coords[i];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

// Find rotation heading at fraction t
function journeyBearing(
  geo: { coords: Array<[number, number]>; cum: number[]; total: number },
  t: number
): number {
  if (geo.coords.length < 2) return 0;
  const d = Math.min(Math.max(t, 0), 1) * geo.total;
  let i = 1;
  while (i < geo.cum.length && geo.cum[i] < d) i += 1;
  if (i >= geo.coords.length) i = geo.coords.length - 1;
  const a = geo.coords[i - 1];
  const b = geo.coords[i];
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const la1 = (a[1] * Math.PI) / 180;
  const la2 = (b[1] * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(la2);
  const x =
    Math.cos(la1) * Math.sin(la2) -
    Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Default verified Nigerian corridor GPS road networks
const NIGERIAN_CORRIDOR_GPS: Record<string, Array<[number, number]>> = {
  osun: [
    [4.5572, 7.7667], // Olaiya Flyover, Osogbo
    [4.5445, 7.7695], // Oke-Fia Roundabout
    [4.5290, 7.7380], // Abere Secretariat
    [4.5120, 7.5850], // Gbongan Interchange
    [4.5380, 7.5020], // Mayfair Roundabout, Ile-Ife
    [4.5290, 7.5180], // OAU Campus Gate
  ],
  osogbo: [
    [4.5572, 7.7667], // Olaiya Flyover, Osogbo
    [4.5445, 7.7695], // Oke-Fia Roundabout
    [4.5290, 7.7380], // Abere Secretariat
    [4.5120, 7.5850], // Gbongan Interchange
    [4.5380, 7.5020], // Mayfair Roundabout, Ile-Ife
    [4.5290, 7.5180], // OAU Campus Gate
  ],
  ife: [
    [4.5380, 7.5020], // Mayfair Roundabout, Ile-Ife
    [4.5120, 7.5850], // Gbongan Interchange
    [4.5290, 7.7380], // Abere Secretariat
    [4.5572, 7.7667], // Olaiya Flyover, Osogbo
  ],
  ibadan: [
    [3.3591, 6.6521], // Berger Bus Stop, Lagos
    [3.3980, 6.6950], // Kara Bridge / Isheri
    [3.4475, 6.7820], // Mowe / Redemption Camp
    [3.6475, 6.8489], // Sagamu Interchange
    [3.7012, 6.9850], // Ogere Toll Point
    [3.8750, 7.3100], // Guru Maharaji / Ibadan Toll Gate
    [3.8820, 7.3450], // Challenge Interchange
    [3.9472, 7.4019], // Iwo Road Interchange, Ibadan
  ],
  lekki: [
    [3.3591, 6.6521], // Berger
    [3.3762, 6.5824], // Ojota
    [3.3685, 6.5710], // Maryland
    [3.3980, 6.5020], // 3rd Mainland Bridge (Adekunle Inflow)
    [3.4150, 6.4520], // Adeniji / Obalende
    [3.4350, 6.4450], // Falomo Roundabout, Ikoyi
    [3.4411, 6.4351], // Admiralty Way, Lekki Phase 1
  ],
  abuja: [
    [7.4092, 9.1089], // Gwarinpa 1st Gate, Kubwa Express
    [7.4410, 9.0910], // Katampe Bypass
    [7.4520, 9.0780], // Mabushi Roundabout
    [7.4719, 9.0622], // Wuse 2 (Herbert Macaulay)
    [7.4950, 9.0550], // Federal Secretariat / CBD Abuja
  ],
  aba: [
    [7.0092, 4.8219], // Waterlines, Port Harcourt
    [7.0180, 4.8350], // Garrison
    [7.0850, 4.8420], // Eleme Junction
    [7.1520, 4.8820], // Oyigbo Expressway
    [7.3667, 5.1066], // Asa Road Motor Park, Aba
  ],
  asaba: [
    [5.6275, 6.3350], // Ring Road, Benin City
    [5.6620, 6.3510], // Ramat Park, Ikpoba Hill
    [6.1920, 6.2550], // Agbor Bypass
    [6.7022, 6.1989], // Summit Junction, Asaba
  ],
  onitsha: [
    [7.4989, 6.4428], // Holy Ghost Park, Enugu
    [7.4120, 6.4310], // 9th Mile Corner
    [7.0706, 6.2209], // Awka Aroma Junction
    [6.8320, 6.1550], // Nkpor Junction
    [6.7933, 6.1368], // Upper Iweka Flyover, Onitsha
  ],
  kano: [
    [8.5120, 12.0150], // Kofar Ruwa, Kano
    [8.5410, 11.9120], // Kwanar Dawaki
    [7.7120, 11.0850], // Zaria PZ Junction
    [7.4450, 10.5820], // Kawo Flyover, Kaduna
    [7.4210, 10.4650], // Command Junction, Kaduna
  ],
  ikeja: [
    [3.3515, 6.6018], // Ikeja Underbridge
    [3.3685, 6.5710], // Maryland
    [3.3762, 6.5250], // Yaba
    [3.3980, 6.4750], // Eko Bridge
    [3.4219, 6.4281], // Victoria Island
  ],
};

export const RouteNavigatorMap: React.FC<RouteNavigatorMapProps> = ({
  ride,
  origin = 'Berger Bus Stop, Lagos',
  destination = 'Iwo Road Interchange, Ibadan',
  interactive = true,
  height = 360,
  onBookPress,
  onMapClick,
}) => {
  const { theme, themeMode } = useAppStore();
  const isLight = themeMode === 'light';

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const vehicleMarkerRef = useRef<any>(null);
  const staticMarkersRef = useRef<any[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isJourneying, setIsJourneying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2 | 4>(2);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [journeyProgress, setJourneyProgress] = useState(0.0);
  const [tileStyle, setTileStyle] = useState<'streets' | 'humanitarian' | 'dark'>('streets');

  const originName = ride?.originTitle || origin;
  const destName = ride?.destTitle || destination;

  // Resolve road coordinates
  const coordinates: Array<[number, number]> = useMemo(() => {
    // 1. If ride has routePoints with 2+ points
    if (ride?.routePoints && ride.routePoints.length >= 2) {
      return ride.routePoints.map((pt) => [pt.longitude, pt.latitude] as [number, number]);
    }

    // 2. Match corridor database
    const combined = `${originName} ${destName}`.toLowerCase();
    for (const [key, pts] of Object.entries(NIGERIAN_CORRIDOR_GPS)) {
      if (combined.includes(key)) {
        return pts;
      }
    }

    return NIGERIAN_CORRIDOR_GPS.ibadan;
  }, [ride, originName, destName]);

  // Highway metadata
  const highwayInfo = useMemo(() => {
    const combined = `${originName} ${destName}`.toLowerCase();
    if (combined.includes('osun') || combined.includes('osogbo') || combined.includes('ife') || combined.includes('ede')) {
      return { highway: 'Gbongan-Osogbo Expressway Corridor', mid: 'Gbongan Interchange', dist: 42, eta: 45 };
    }
    if (combined.includes('ibadan')) {
      return { highway: 'Lagos-Ibadan Expressway', mid: 'Sagamu Interchange', dist: 128, eta: 110 };
    }
    if (combined.includes('lekki') || combined.includes('island') || combined.includes('victoria')) {
      return { highway: '3rd Mainland Bridge & Lekki-Epe Express', mid: 'Adekunle / Falomo Ramp', dist: 32, eta: 45 };
    }
    if (combined.includes('abuja') || combined.includes('gwarinpa') || combined.includes('cbd') || combined.includes('kubwa')) {
      return { highway: 'Kubwa Expressway, Abuja', mid: 'Wuse 2 Herbert Macaulay Flyover', dist: 22, eta: 30 };
    }
    if (combined.includes('aba') || combined.includes('harcourt') || combined.includes('waterlines')) {
      return { highway: 'PH-Aba Highway Corridor', mid: 'Oyigbo Toll Point', dist: 65, eta: 75 };
    }
    if (combined.includes('asaba') || combined.includes('benin')) {
      return { highway: 'Benin-Asaba Expressway', mid: 'Agbor Highway Bypass', dist: 135, eta: 120 };
    }
    if (combined.includes('onitsha') || combined.includes('enugu')) {
      return { highway: 'Enugu-Onitsha Expressway', mid: 'Awka Aroma Junction', dist: 105, eta: 90 };
    }
    if (combined.includes('kano') || combined.includes('kaduna')) {
      return { highway: 'Kano-Kaduna Dual Carriage Way', mid: 'Zaria PZ Junction', dist: 220, eta: 180 };
    }
    return { highway: 'Federal Highway Corridor', mid: 'Main Interchange Hub', dist: 45, eta: 40 };
  }, [originName, destName]);



  // Inject MapLibre CSS once on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (!document.getElementById('maplibre-gl-styles')) {
        const link = document.createElement('link');
        link.id = 'maplibre-gl-styles';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
        document.head.appendChild(link);
      }

      // Inject custom marker styles
      if (!document.getElementById('cs-map-custom-styles')) {
        const style = document.createElement('style');
        style.id = 'cs-map-custom-styles';
        style.innerHTML = `
          .cs-marker-origin {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #FF6B00;
            border: 3px solid #FFFFFF;
            box-shadow: 0 4px 14px rgba(255, 107, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            position: relative;
          }
          .cs-marker-origin::after {
            content: '';
            position: absolute;
            inset: -6px;
            border-radius: 50%;
            border: 2px solid #FF6B00;
            opacity: 0.6;
            animation: csPulse 2s infinite ease-out;
          }
          .cs-marker-dest {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #38BDF8;
            border: 3px solid #FFFFFF;
            box-shadow: 0 4px 14px rgba(56, 189, 248, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          }
          .cs-marker-mid {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #F59E0B;
            border: 2px solid #FFFFFF;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .cs-vehicle-puck {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: #0F172A;
            border: 2.5px solid #10B981;
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 19px;
            transition: transform 0.08s linear;
          }
          .maplibregl-ctrl-bottom-right {
            bottom: 64px !important;
            right: 12px !important;
          }
          .maplibregl-ctrl-group {
            background: rgba(15, 23, 42, 0.9) !important;
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
            border-radius: 12px !important;
            overflow: hidden !important;
          }
          .maplibregl-ctrl-group button {
            border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          }
          .maplibregl-ctrl-group button svg {
            fill: #FFFFFF !important;
          }
          @keyframes csPulse {
            0% { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(1.7); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  // Initialize MapLibre GL instance (matches stepfree tech stack)
  useEffect(() => {
    if (Platform.OS !== 'web' || !containerRef.current) return;

    let disposed = false;

    async function initMap() {
      try {
        const maplibregl = await import('maplibre-gl');
        if (disposed || !containerRef.current) return;

        // Clean up previous instance if exists
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        // Selected tile source
        const tileUrl =
          tileStyle === 'dark' || !isLight
            ? 'https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
            : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

        const centerLng = (coordinates[0][0] + coordinates[coordinates.length - 1][0]) / 2;
        const centerLat = (coordinates[0][1] + coordinates[coordinates.length - 1][1]) / 2;

        const map = new maplibregl.Map({
          container: containerRef.current,
          center: [centerLng, centerLat],
          zoom: 8.5,
          pitch: 25,
          bearing: 0,
          maxPitch: 75,
          attributionControl: false,
          style: {
            version: 8,
            sources: {
              streets: {
                type: 'raster',
                tiles: [tileUrl],
                tileSize: 256,
                minzoom: 0,
                maxzoom: 19,
              },
            },
            layers: [
              {
                id: 'osm-streets',
                type: 'raster',
                source: 'streets',
              },
            ],
          },
        });

        // WebGL Map instance initialized without default overlay controls

        map.on('click', (e) => {
          if (onMapClick) {
            onMapClick({ latitude: e.lngLat.lat, longitude: e.lngLat.lng });
          }
        });

        map.on('load', () => {
          if (disposed) return;

          // Add GeoJSON corridor line
          map.addSource('corridor-highway', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: coordinates,
              },
            },
          });

          // Route halo casing
          map.addLayer({
            id: 'corridor-halo',
            type: 'line',
            source: 'corridor-highway',
            paint: {
              'line-color': '#0A0E17',
              'line-width': 9,
              'line-opacity': 0.85,
            },
            layout: {
              'line-cap': 'round',
              'line-join': 'round',
            },
          });

          // Primary highway glowing route line
          map.addLayer({
            id: 'corridor-active-line',
            type: 'line',
            source: 'corridor-highway',
            paint: {
              'line-color': '#FF6B00',
              'line-width': 5,
            },
            layout: {
              'line-cap': 'round',
              'line-join': 'round',
            },
          });

          // Fit route bounds nicely
          const bounds = new maplibregl.LngLatBounds(coordinates[0], coordinates[0]);
          coordinates.forEach((c) => bounds.extend(c));
          map.fitBounds(bounds, {
            padding: { top: 60, bottom: 60, left: 30, right: 30 },
            duration: 800,
            maxZoom: 14,
          });

          // Add Origin HTML Marker
          const originEl = document.createElement('div');
          originEl.className = 'cs-marker-origin';
          originEl.innerHTML = '<div style="width:10px;height:10px;border-radius:50%;background:#FFFFFF;"></div>';
          originEl.title = originName;
          const originMarker = new maplibregl.Marker({ element: originEl, anchor: 'center' })
            .setLngLat(coordinates[0])
            .addTo(map);

          // Add Destination HTML Marker
          const destEl = document.createElement('div');
          destEl.className = 'cs-marker-dest';
          destEl.innerHTML = '<div style="width:10px;height:10px;border-radius:50%;background:#FFFFFF;"></div>';
          destEl.title = destName;
          const destMarker = new maplibregl.Marker({ element: destEl, anchor: 'center' })
            .setLngLat(coordinates[coordinates.length - 1])
            .addTo(map);

          // Add Midpoint Waypoint Marker
          if (coordinates.length > 2) {
            const midIndex = Math.floor(coordinates.length / 2);
            const midEl = document.createElement('div');
            midEl.className = 'cs-marker-mid';
            midEl.title = highwayInfo.mid;
            const midMarker = new maplibregl.Marker({ element: midEl, anchor: 'center' })
              .setLngLat(coordinates[midIndex])
              .addTo(map);
            staticMarkersRef.current.push(midMarker);
          }

          staticMarkersRef.current.push(originMarker, destMarker);

          // Add Live Navigation Vehicle Marker
          const vehicleEl = document.createElement('div');
          vehicleEl.className = 'cs-vehicle-puck';
          vehicleEl.innerHTML = '🚗';
          const vehicleMarker = new maplibregl.Marker({ element: vehicleEl, anchor: 'center' })
            .setLngLat(coordinates[0])
            .addTo(map);
          vehicleMarkerRef.current = vehicleMarker;

          mapRef.current = map;
          setMapReady(true);
        });
      } catch (err: any) {
        console.warn('MapLibre GL failed to mount:', err);
        setMapError(err?.message || 'Failed to initialize MapLibre WebGL');
      }
    }

    initMap();

    return () => {
      disposed = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [coordinates, tileStyle, isLight]);

  // Live real-time GPS simulation loop along coordinates (StepFree journey mechanism)
  useEffect(() => {
    if (!mapReady || !mapRef.current || coordinates.length < 2) return;

    const geo = buildJourneyGeo(coordinates);

    if (!isJourneying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
      return;
    }

    let lastTs = 0;
    const journeyDurationSeconds = 36; // Full corridor journey simulation duration

    const step = (ts: number) => {
      if (!lastTs) lastTs = ts;
      const dt = Math.min(ts - lastTs, 64);
      lastTs = ts;

      setJourneyProgress((prev) => {
        const next = Math.min(1, prev + (dt / 1000 / journeyDurationSeconds) * speedMultiplier);

        const currentPos = journeyPosition(geo, next);
        const heading = journeyBearing(geo, next);

        // Move marker on MapLibre
        if (vehicleMarkerRef.current) {
          vehicleMarkerRef.current.setLngLat(currentPos);
          const el = vehicleMarkerRef.current.getElement();
          if (el) {
            el.style.transform = `rotate(${heading}deg)`;
          }
        }

        // Camera follow vehicle with realistic 3D pitch
        if (mapRef.current && next < 1) {
          mapRef.current.jumpTo({
            center: currentPos,
            bearing: heading,
            pitch: 52,
            zoom: 14.5,
          });
        }

        if (next >= 1) {
          setIsJourneying(false);
          // Reset camera view to bounds
          try {
            let minLng = coordinates[0][0], maxLng = coordinates[0][0];
            let minLat = coordinates[0][1], maxLat = coordinates[0][1];
            for (const [lng, lat] of coordinates) {
              if (lng < minLng) minLng = lng;
              if (lng > maxLng) maxLng = lng;
              if (lat < minLat) minLat = lat;
              if (lat > maxLat) maxLat = lat;
            }
            mapRef.current?.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, duration: 800 });
          } catch (e) {}
          return 1;
        }

        return next;
      });

      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    };
  }, [isJourneying, speedMultiplier, mapReady, coordinates]);

  // Reset progress & recenter camera
  const handleReset = () => {
    setIsJourneying(false);
    setJourneyProgress(0);
    if (vehicleMarkerRef.current && coordinates[0]) {
      vehicleMarkerRef.current.setLngLat(coordinates[0]);
    }
    if (mapRef.current && coordinates.length > 1) {
      try {
        let minLng = coordinates[0][0], maxLng = coordinates[0][0];
        let minLat = coordinates[0][1], maxLat = coordinates[0][1];
        for (const [lng, lat] of coordinates) {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
        mapRef.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, duration: 800 });
      } catch (e) {
        mapRef.current.setCenter(coordinates[0]);
      }
    }
  };

  return (
    <View
      style={[
        styles.mapCardContainer,
        {
          height: isFullscreen ? Dimensions.get('window').height * 0.78 : height,
          backgroundColor: isLight ? '#0B132B' : '#070D18',
          borderColor: isLight ? '#1E293B' : 'rgba(255, 255, 255, 0.1)',
        },
      ]}
    >
      {/* Real MapLibre GL OpenStreetMap Container */}
      <View style={StyleSheet.absoluteFill}>
        {Platform.OS === 'web' ? (
          <div
            ref={containerRef as any}
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        ) : (
          <View style={styles.nativeFallback}>
            <Text style={{ color: '#94A3B8', fontSize: 13 }}>
              OpenStreetMap live route available on Web view
            </Text>
          </View>
        )}
      </View>

      {/* Floating Map Controls: Only Target and Enlarge buttons */}
      <View style={styles.floatingControls}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleReset}
          style={styles.floatingControlBtn}
          accessibilityLabel="Target route"
          testID="map-target-btn"
        >
          <Crosshair size={20} color="#38BDF8" />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsFullscreen(!isFullscreen)}
          style={styles.floatingControlBtn}
          accessibilityLabel="Enlarge map"
          testID="map-enlarge-btn"
        >
          {isFullscreen ? (
            <Minimize2 size={20} color="#FFFFFF" />
          ) : (
            <Maximize2 size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mapCardContainer: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 10,
  },
  nativeFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  floatingControls: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    flexDirection: 'column',
    gap: 8,
    zIndex: 10,
  },
  floatingControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
});
