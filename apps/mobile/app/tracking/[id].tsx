import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Phone,
  MessageSquare,
  Share2,
  AlertTriangle,
  Car,
  Clock,
  ShieldCheck,
  MapPin,
  CheckCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { RouteNavigatorMap } from '../../components/RouteNavigatorMap';
import { api } from '../../services/api';

export default function TrackingScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme, themeMode, activeTrip, setActiveTrip } = useAppStore();

  const [etaMinutes, setEtaMinutes] = useState(5);
  const [kmLeft, setKmLeft] = useState(2.5);

  // Simulated live location countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setEtaMinutes((prev) => (prev > 1 ? prev - 1 : 1));
      setKmLeft((prev) => (prev > 0.3 ? +(prev - 0.3).toFixed(1) : 0.2));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleShareWhatsApp = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await api.safety.createShareLink(activeTrip?.rideId || 'ride-1');
      const text = encodeURIComponent(
        `🚨 RideShare Live Trip: I am currently commuting with verified driver ${activeTrip?.ride.driverName} (${activeTrip?.ride.vehicle.model} - ${activeTrip?.ride.vehicle.registrationNumber}). Track my live coordinates & ETA here: ${res.shareUrl}`,
      );
      Linking.openURL(`whatsapp://send?text=${text}`);
    } catch {
      Alert.alert('Live Trip Link', 'WhatsApp is not installed on this device.');
    }
  };

  const handleEmergencySOS = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}

    Alert.alert(
      '🚨 EMERGENCY SOS DIALER',
      'This will instantly call Lagos State Emergency Services (112 / 767) and dispatch your live GPS location to your registered emergency contacts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'CALL 112 / 767 NOW',
          style: 'destructive',
          onPress: () => {
            Linking.openURL('tel:112');
            api.safety.triggerSos(activeTrip?.rideId || 'ride-1', 6.6018, 3.3515);
          },
        },
      ],
    );
  };

  const handleEndRide = () => {
    Alert.alert(
      'Trip Completed',
      'Have you arrived at your destination safely? Confirming will trigger the 24-hour Paystack escrow settlement countdown.',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, I Have Arrived',
          onPress: () => {
            if (activeTrip) {
              setActiveTrip({ ...activeTrip, status: 'COMPLETED' });
            }
            router.replace('/(tabs)/trips');
          },
        },
      ],
    );
  };

  const ride = activeTrip?.ride;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 16) + 6,
            backgroundColor: theme.surface,
            borderBottomColor: theme.surfaceBorder,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: theme.surfaceSecondary }]}
        >
          <ChevronLeft size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Pickup Tracking
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Live Route Navigator Map (whimsical-ferret style) */}
        <RouteNavigatorMap
          ride={ride}
          height={320}
        />

        {/* Live Distance & ETA Stat Bar */}
        <View style={[styles.statsRow, { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>{kmLeft} km left</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Distance to Pickup</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.surfaceBorder }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>06:45 AM</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Estimated Dropoff</Text>
          </View>
        </View>

        {/* Driver & Vehicle Details Card (Sample Screen 2 Right) */}
        <Card style={styles.vehicleCard}>
          <View style={styles.carPlateRow}>
            <View>
              <Text style={[styles.plateNumber, { color: theme.textPrimary }]}>
                {ride?.vehicle.registrationNumber || 'LAG-492-AA'}
              </Text>
              <Text style={[styles.carModel, { color: theme.textSecondary }]}>
                {ride?.vehicle.color} {ride?.vehicle.model || 'Toyota Corolla'}
              </Text>
            </View>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=300&q=80',
              }}
              style={styles.carThumbnail}
            />
          </View>

          {/* Driver Row with Quick Call & Message Buttons */}
          <View style={[styles.driverDetailRow, { borderTopColor: theme.surfaceBorder }]}>
            <Image
              source={{
                uri:
                  ride?.driverAvatar ||
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
              }}
              style={styles.driverAvatar}
            />
            <View style={styles.driverTextCol}>
              <Text style={[styles.driverName, { color: theme.textPrimary }]}>
                {ride?.driverName || 'Olajide Abdulquadri'}
              </Text>
              <View style={styles.ratingBadgeRow}>
                <Badge label="★ 4.98" variant="rating" />
              </View>
            </View>

            {/* Quick Action Icons */}
            <View style={styles.driverActionButtons}>
              <TouchableOpacity
                onPress={() => Linking.openURL('tel:+2348030000000')}
                activeOpacity={0.8}
                style={[styles.actionCircle, { backgroundColor: theme.surfaceSecondary }]}
              >
                <Phone size={18} color="#10B981" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push(`/chat/${activeTrip?.id || 'book-901'}`)}
                activeOpacity={0.8}
                style={[styles.actionCircle, { backgroundColor: theme.surfaceSecondary }]}
              >
                <MessageSquare size={18} color="#FF7A00" />
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* Meeting Location & Destination Hub */}
        <Card style={styles.locationCard}>
          <View style={styles.locationRow}>
            <View style={styles.locationDotGreen} />
            <View style={styles.locationTextCol}>
              <Text style={[styles.locationType, { color: theme.textMuted }]}>Pickup Meeting Spot</Text>
              <Text style={[styles.locationName, { color: theme.textPrimary }]}>
                {activeTrip?.pickupLandmark || 'Oando Filling Station Berger'}
              </Text>
            </View>
          </View>

          <View style={[styles.locationTrackLine, { borderColor: theme.surfaceBorder }]} />

          <View style={styles.locationRow}>
            <View style={styles.locationDotOrange} />
            <View style={styles.locationTextCol}>
              <Text style={[styles.locationType, { color: theme.textMuted }]}>Your Destination</Text>
              <Text style={[styles.locationName, { color: theme.textPrimary }]}>
                {activeTrip?.dropoffLandmark || 'Admiralty Way, Lekki Phase 1'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Live Safety WhatsApp Share & SOS */}
        <View style={styles.safetyRow}>
          <TouchableOpacity
            onPress={handleShareWhatsApp}
            activeOpacity={0.8}
            style={[styles.safetyButton, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
          >
            <Share2 size={16} color="#059669" />
            <Text style={styles.safetyButtonText}>Share Live GPS to Family</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleEmergencySOS}
            activeOpacity={0.8}
            style={[styles.sosButton, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
          >
            <AlertTriangle size={16} color="#DC2626" />
            <Text style={styles.sosButtonText}>SOS 112 / 767</Text>
          </TouchableOpacity>
        </View>

        {/* End Ride CTA */}
        <Button
          title="End Ride & Release Escrow"
          variant="dark"
          size="lg"
          onPress={handleEndRide}
          style={styles.endRideButton}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  placeholder: {
    width: 38,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 60,
    gap: 14,
  },
  mapSimulatedContainer: {
    height: 240,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  mapGraphicWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapGridBackground: {
    width: '100%',
    height: '100%',
    position: 'relative',
    padding: 20,
  },
  simulatedPolyline: {
    position: 'absolute',
    top: 70,
    left: 40,
    right: 50,
    height: 60,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderColor: '#FF7A00',
    borderRadius: 20,
  },
  mapMarkerPickup: {
    position: 'absolute',
    top: 50,
    left: 32,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapMarkerInnerGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  driverPuck: {
    position: 'absolute',
    top: 110,
    left: 120,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF7A00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF7A00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  mapMarkerDest: {
    position: 'absolute',
    top: 120,
    right: 40,
  },
  etaPillContainer: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF7A00',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  etaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  etaBold: {
    fontWeight: '900',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  vehicleCard: {
    padding: 16,
  },
  carPlateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  plateNumber: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  carModel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  carThumbnail: {
    width: 60,
    height: 38,
    borderRadius: 8,
  },
  driverDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
  },
  driverTextCol: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '800',
  },
  ratingBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  driverActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationCard: {
    padding: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationDotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  locationDotOrange: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF7A00',
  },
  locationTrackLine: {
    width: 1,
    height: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginLeft: 4,
    marginVertical: 4,
  },
  locationTextCol: {
    flex: 1,
  },
  locationType: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  locationName: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  safetyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  safetyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  safetyButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  sosButton: {
    flex: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  sosButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  endRideButton: {
    height: 52,
    marginTop: 6,
  },
});
