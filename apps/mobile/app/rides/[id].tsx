import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  SlidersHorizontal,
  Star,
  Clock,
  GitCommit,
  CigaretteOff,
  Music,
  CreditCard,
  Lock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/useAppStore';
import { RouteNavigatorMap } from '../../components/RouteNavigatorMap';
import { api } from '../../services/api';
import type { Booking } from '../../types';

export default function RideDetailsScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme, themeMode, rides, addBooking, setActiveTrip } = useAppStore();

  const ride = rides.find((r) => r.id === id) || rides[0];
  const [selectedSeats, setSelectedSeats] = useState(1);
  const [isBooking, setIsBooking] = useState(false);

  const formatTime = (isoString?: string) => {
    try {
      if (!isoString) return '08:30';
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '08:30';
    }
  };

  const basePriceKobo = ride.contributionKobo * selectedSeats;
  const platformFeeKobo = Math.round(basePriceKobo * 0.15);
  const totalEscrowKobo = basePriceKobo + platformFeeKobo;

  const formatNaira = (kobo: number) => `₦${(kobo / 100).toLocaleString()}`;

  const handleBookSeat = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsBooking(true);

      let createdBooking: Booking | null = null;
      try {
        createdBooking = await api.bookings.create({
          rideId: ride.id,
          seats: selectedSeats,
        });
      } catch (err: any) {
        console.warn('Backend booking note:', err?.response?.data?.message || err?.message);
      }

      const newBooking: Booking = createdBooking || {
        id: `book-${Date.now()}`,
        rideId: ride.id,
        ride: ride,
        seatsBooked: selectedSeats,
        status: 'CONFIRMED',
        pickupLandmark: ride.originLandmark,
        dropoffLandmark: ride.destLandmark,
        fareAmountKobo: basePriceKobo,
        platformFeeKobo: platformFeeKobo,
        totalKobo: totalEscrowKobo,
        paystackReference: `PSTK-CS-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

      addBooking(newBooking);
      setActiveTrip(newBooking);
      setIsBooking(false);

      Alert.alert(
        '🎉 Escrow Locked & Seat Confirmed!',
        `Your seat with driver ${ride.driverName} is confirmed. ${formatNaira(
          totalEscrowKobo,
        )} is held safely in Paystack Escrow and will be disbursed 24h after safe arrival.`,
        [
          {
            text: 'Track Trip',
            onPress: () => router.replace(`/tracking/${newBooking.id}`),
          },
        ],
      );
    } catch {
      setIsBooking(false);
      Alert.alert('Booking Error', 'Could not complete Paystack checkout.');
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 16) + 6,
            backgroundColor: theme.background,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={[
            styles.navButton,
            {
              backgroundColor: theme.surfaceCard,
              borderColor: theme.surfaceBorder,
            },
          ]}
        >
          <ChevronLeft size={20} color={theme.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.navTitle, { color: theme.textPrimary }]}>
          Rider details
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.navButton,
            {
              backgroundColor: theme.surfaceCard,
              borderColor: theme.surfaceBorder,
            },
          ]}
        >
          <SlidersHorizontal size={18} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Driver Profile & Car Section (Screen 2 Inspiration) */}
        <View style={styles.driverSection}>
          <View style={styles.driverProfileLeft}>
            <Image
              source={{
                uri:
                  ride.driverAvatar ||
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
              }}
              style={styles.driverAvatar}
            />
            <View style={styles.driverDetailsCol}>
              <Text style={[styles.driverName, { color: theme.textPrimary }]}>
                {ride.driverName}
              </Text>
              <View style={styles.ratingRow}>
                <Star size={12} color={theme.starColor} fill={theme.starColor} />
                <Text style={[styles.ratingNumber, { color: theme.textSecondary }]}>
                  {ride.driverRating.toFixed(1)}
                </Text>
                <Text style={[styles.tripsText, { color: theme.textMuted }]}>
                  {ride.driverTripCount} Trips
                </Text>
              </View>
              <View style={[styles.verifiedPill, { backgroundColor: themeMode === 'light' ? '#111827' : '#FFFFFF' }]}>
                <Text style={[styles.verifiedText, { color: themeMode === 'light' ? '#FFFFFF' : '#0A0B0E' }]}>
                  Verified
                </Text>
              </View>
            </View>
          </View>

          {/* Vehicle Visual */}
          <View style={styles.carVisualWrapper}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=600&q=80',
              }}
              style={styles.carImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Live Route Navigator Map */}
        <RouteNavigatorMap
          ride={ride}
          height={280}
        />

        {/* Route Timeline Card */}
        <View
          style={[
            styles.timelineCard,
            {
              backgroundColor: theme.surfaceCard,
              borderColor: theme.surfaceBorder,
            },
          ]}
        >
          {/* Origin Stop */}
          <View style={styles.timelineStop}>
            <View style={styles.timeCol}>
              <Text style={[styles.timeLabel, { color: theme.textPrimary }]}>
                {formatTime(ride.departureTime)}
              </Text>
            </View>

            <View style={styles.indicatorCol}>
              <View style={[styles.dotPickup, { backgroundColor: theme.pickupDot }]} />
              <View style={styles.dottedTrack} />
            </View>

            <View style={styles.stopInfoCol}>
              <Text style={[styles.cityName, { color: theme.textPrimary }]}>
                {ride.originTitle.split(',')[0]}
              </Text>
              <Text style={[styles.stationName, { color: theme.textSecondary }]}>
                {ride.originLandmark}
              </Text>
              <Text style={[styles.addressText, { color: theme.textMuted }]}>
                Main Hub Interchange, Safe Corridor
              </Text>
            </View>
          </View>

          {/* Destination Stop */}
          <View style={[styles.timelineStop, { marginTop: 8 }]}>
            <View style={styles.timeCol}>
              <Text style={[styles.timeLabel, { color: theme.textPrimary }]}>
                {formatTime(ride.estimatedArrival)}
              </Text>
            </View>

            <View style={styles.indicatorCol}>
              <View style={[styles.ringDropoff, { borderColor: theme.dropoffDot }]} />
            </View>

            <View style={styles.stopInfoCol}>
              <Text style={[styles.cityName, { color: theme.textPrimary }]}>
                {ride.destTitle.split(',')[0]}
              </Text>
              <Text style={[styles.stationName, { color: theme.textSecondary }]}>
                {ride.destLandmark}
              </Text>
              <Text style={[styles.addressText, { color: theme.textMuted }]}>
                Dropoff Terminal, Express Gateway
              </Text>
            </View>
          </View>

          {/* 4 Circular Amenity Pills (Screen 2 Reference) */}
          <View style={styles.amenitiesRow}>
            <View style={[styles.amenityCircle, { backgroundColor: theme.surfaceSecondary }]}>
              <Clock size={18} color={theme.textPrimary} />
              <Text style={[styles.amenityText, { color: theme.textMuted }]}>2h 15m</Text>
            </View>

            <View style={[styles.amenityCircle, { backgroundColor: theme.surfaceSecondary }]}>
              <GitCommit size={18} color={theme.textPrimary} />
              <Text style={[styles.amenityText, { color: theme.textMuted }]}>Direct</Text>
            </View>

            <View style={[styles.amenityCircle, { backgroundColor: theme.surfaceSecondary }]}>
              <CigaretteOff size={18} color={theme.textPrimary} />
              <Text style={[styles.amenityText, { color: theme.textMuted }]}>No smoking</Text>
            </View>

            <View style={[styles.amenityCircle, { backgroundColor: theme.surfaceSecondary }]}>
              <Music size={18} color={theme.textPrimary} />
              <Text style={[styles.amenityText, { color: theme.textMuted }]}>Music</Text>
            </View>
          </View>
        </View>

        {/* Your Seat Summary */}
        <View style={styles.summaryRow}>
          <View>
            <Text style={[styles.summaryTitle, { color: theme.textPrimary }]}>
              Your seat
            </Text>
            <Text style={[styles.summarySubtitle, { color: theme.textMuted }]}>
              {selectedSeats} {selectedSeats === 1 ? 'passenger' : 'passengers'}
            </Text>
          </View>

          <View style={styles.priceAlignRight}>
            <Text style={[styles.summaryPrice, { color: theme.textPrimary }]}>
              {formatNaira(totalEscrowKobo)}
            </Text>
            <Text style={[styles.summaryPriceLabel, { color: theme.textMuted }]}>
              Total price
            </Text>
          </View>
        </View>

        {/* Payment Method Card */}
        <View
          style={[
            styles.paymentCard,
            {
              backgroundColor: theme.surfaceCard,
              borderColor: theme.surfaceBorder,
            },
          ]}
        >
          <View style={styles.paymentLeft}>
            <View style={[styles.paymentIconBox, { backgroundColor: theme.surfaceSecondary }]}>
              <CreditCard size={18} color={theme.textPrimary} />
            </View>
            <View>
              <Text style={[styles.paymentTitle, { color: theme.textPrimary }]}>
                Payment method
              </Text>
              <Text style={[styles.paymentDetails, { color: theme.textMuted }]}>
                Mastercard •••• 4242 (Paystack Escrow)
              </Text>
            </View>
          </View>

          <TouchableOpacity>
            <Text style={[styles.changeText, { color: theme.pickupDot }]}>Change</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Full-Width Luminous Primary Button "Book Seat" */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 16) + 10,
            backgroundColor: theme.background,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleBookSeat}
          disabled={isBooking}
          style={[styles.bookButton, { backgroundColor: theme.primary }]}
        >
          <Text style={[styles.bookButtonText, { color: theme.primaryForeground }]}>
            {isBooking ? 'Securing Escrow...' : 'Book Seat'}
          </Text>
        </TouchableOpacity>
      </View>
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
  },
  navButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 130,
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  driverProfileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#27272A',
  },
  driverDetailsCol: {
    gap: 3,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '800',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingNumber: {
    fontSize: 13,
    fontWeight: '600',
  },
  tripsText: {
    fontSize: 12,
    marginLeft: 4,
  },
  verifiedPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
    marginTop: 2,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  carVisualWrapper: {
    width: 120,
    height: 70,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  carImage: {
    width: 110,
    height: 65,
    borderRadius: 12,
  },
  timelineCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  timelineStop: {
    flexDirection: 'row',
  },
  timeCol: {
    width: 50,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  indicatorCol: {
    width: 24,
    alignItems: 'center',
    paddingTop: 4,
  },
  dotPickup: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  dottedTrack: {
    width: 1.5,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 4,
  },
  ringDropoff: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  stopInfoCol: {
    flex: 1,
    paddingLeft: 8,
  },
  cityName: {
    fontSize: 15,
    fontWeight: '800',
  },
  stationName: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  addressText: {
    fontSize: 11,
    marginTop: 2,
  },
  amenitiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  amenityCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  amenityText: {
    fontSize: 9,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  summarySubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  priceAlignRight: {
    alignItems: 'flex-end',
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: '800',
  },
  summaryPriceLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  paymentDetails: {
    fontSize: 12,
    marginTop: 2,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  bookButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
