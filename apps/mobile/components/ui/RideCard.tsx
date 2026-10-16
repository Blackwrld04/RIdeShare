import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Car, Star } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import type { RideOffer } from '../../types';

interface RideCardProps {
  ride: RideOffer;
  onPress: () => void;
  tag?: string;
}

export const RideCard: React.FC<RideCardProps> = ({ ride, onPress }) => {
  const { theme, themeMode } = useAppStore();

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '08:30';
    }
  };

  const formattedPrice = `₦${(ride.contributionKobo / 100).toLocaleString()}`;
  const seatsLabel = ride.availableSeats <= 1 ? '1 seat left' : `${ride.availableSeats} seats left`;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[
        styles.cardContainer,
        {
          backgroundColor: theme.surfaceCard,
          borderColor: theme.surfaceBorder,
        },
      ]}
    >
      {/* Top Driver Row */}
      <View style={styles.driverRow}>
        <View style={styles.driverLeft}>
          <Image
            source={{
              uri:
                ride.driverAvatar ||
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
            }}
            style={styles.avatar}
          />
          <View style={styles.driverMeta}>
            <Text style={[styles.driverName, { color: theme.textPrimary }]}>
              {ride.driverName}
            </Text>
            <View style={styles.ratingRow}>
              <Star size={11} color={theme.starColor} fill={theme.starColor} />
              <Text style={[styles.ratingValue, { color: theme.textSecondary }]}>
                {ride.driverRating.toFixed(1)}
              </Text>
              <Text style={[styles.tripCount, { color: theme.textMuted }]}>
                {ride.driverTripCount} Trips
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Middle Route Timeline */}
      <View style={styles.routeRow}>
        {/* Origin */}
        <View style={styles.cityBlock}>
          <Text style={[styles.timeText, { color: theme.textPrimary }]}>
            {formatTime(ride.departureTime)}
          </Text>
          <Text numberOfLines={1} style={[styles.cityText, { color: theme.textSecondary }]}>
            {ride.originTitle.split(',')[0]}
          </Text>
        </View>

        {/* Center Transit Line */}
        <View style={styles.transitCenter}>
          <View style={[styles.transitLine, { backgroundColor: theme.surfaceBorder }]} />
          <View style={styles.carIconBubble}>
            <Car size={13} color={themeMode === 'light' ? '#4B5563' : '#E4E4E7'} />
          </View>
          <Text style={[styles.durationText, { color: theme.textMuted }]}>2h 15m</Text>
        </View>

        {/* Destination */}
        <View style={[styles.cityBlock, { alignItems: 'flex-end' }]}>
          <Text style={[styles.timeText, { color: theme.textPrimary }]}>
            {formatTime(ride.estimatedArrival)}
          </Text>
          <Text numberOfLines={1} style={[styles.cityText, { color: theme.textSecondary }]}>
            {ride.destTitle.split(',')[0]}
          </Text>
        </View>
      </View>

      {/* Bottom Price & Seat Availability Row */}
      <View style={styles.bottomRow}>
        <View style={styles.priceContainer}>
          <Text style={[styles.priceAmount, { color: theme.textPrimary }]}>
            {formattedPrice}
          </Text>
          <Text style={[styles.pricePerPerson, { color: theme.textMuted }]}>
            per passenger
          </Text>
        </View>

        <View style={[styles.seatPill, { backgroundColor: theme.pillTagBg }]}>
          <Text style={[styles.seatPillText, { color: theme.pillTagText }]}>
            {seatsLabel}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  driverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#27272A',
  },
  driverMeta: {
    justifyContent: 'center',
  },
  driverName: {
    fontSize: 14,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  tripCount: {
    fontSize: 12,
    fontWeight: '400',
    marginLeft: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 14,
  },
  cityBlock: {
    flex: 1,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cityText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  transitCenter: {
    alignItems: 'center',
    paddingHorizontal: 12,
    position: 'relative',
    minWidth: 100,
  },
  transitLine: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    height: 1,
  },
  carIconBubble: {
    paddingHorizontal: 6,
    backgroundColor: 'transparent',
    marginBottom: 2,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  priceAmount: {
    fontSize: 17,
    fontWeight: '800',
  },
  pricePerPerson: {
    fontSize: 12,
    fontWeight: '500',
  },
  seatPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  seatPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
