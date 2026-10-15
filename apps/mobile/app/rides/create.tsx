import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { NigerianCorridors } from '../../constants/theme';
import { Button } from '../../components/ui/Button';
import type { RideOffer } from '../../types';

const amenityOptions = ['Air Con', 'Women-only', 'Luggage', 'Direct Road', 'Music'];

export default function CreateRideScreen() {
  const insets = useSafeAreaInsets();
  const { theme, rides, addRide } = useAppStore();
  const [selectedCorridor, setSelectedCorridor] = useState(NigerianCorridors[0]);
  const [origin, setOrigin] = useState(NigerianCorridors[0].from);
  const [destination, setDestination] = useState(NigerianCorridors[0].to);
  const [departureTime, setDepartureTime] = useState('08:30');
  const [availableSeats, setAvailableSeats] = useState(2);
  const [pricePerSeat, setPricePerSeat] = useState(String(NigerianCorridors[0].priceKobo / 100));
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(['Air Con']);

  const priceCap = useMemo(() => {
    const cap = Math.round((selectedCorridor.priceKobo / 100) * 1.25);
    return cap;
  }, [selectedCorridor]);

  const fareWarning = Number(pricePerSeat) > priceCap;

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((current) =>
      current.includes(amenity)
        ? current.filter((item) => item !== amenity)
        : [...current, amenity],
    );
  };

  const handlePublish = () => {
    const seatPrice = Number(pricePerSeat);

    if (!origin || !destination) {
      Alert.alert('Route required', 'Choose both origin and destination.');
      return;
    }

    if (!seatPrice || seatPrice <= 0) {
      Alert.alert('Price required', 'Enter a valid price per seat.');
      return;
    }

    if (seatPrice > priceCap) {
      Alert.alert(
        'Price capped',
        `This corridor is capped at ₦${priceCap.toLocaleString()} per seat to stay within the PRD cost limit.`,
      );
      return;
    }

    const newRide: RideOffer = {
      id: `ride-${Date.now()}`,
      driverId: 'drv-999',
      driverName: 'You',
      driverAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      driverRating: 4.9,
      driverTripCount: 3,
      ninVerified: true,
      vehicle: {
        make: 'Toyota',
        model: 'Corolla',
        year: 2022,
        color: 'Pearl White',
        registrationNumber: 'LAG-500-AA',
        seatCapacity: 4,
      },
      originTitle: origin,
      originLandmark: origin,
      destTitle: destination,
      destLandmark: destination,
      departureTime: new Date(`2026-06-16T${departureTime}:00`).toISOString(),
      estimatedArrival: new Date(`2026-06-16T${String(Number(departureTime.split(':')[0]) + 2).padStart(2, '0')}:${departureTime.split(':')[1]}`).toISOString(),
      passengerSeats: 4,
      availableSeats,
      contributionKobo: Math.round(seatPrice * 100),
      currency: 'NGN',
      isRecurring: true,
      isFemaleOnly: selectedAmenities.includes('Women-only'),
      amenities: selectedAmenities,
      status: 'SCHEDULED',
    };

    addRide(newRide);
    Alert.alert('Ride published', 'Your commute has been published and is ready for passengers.');
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}> 
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 8 }]}> 
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder }]}> 
          <ChevronLeft size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Publish a ride</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.sectionCard, { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder }]}> 
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Pickup corridor</Text>
          <View style={styles.corridorGrid}>
            {NigerianCorridors.map((corridor) => {
              const selected = corridor.id === selectedCorridor.id;
              return (
                <TouchableOpacity
                  key={corridor.id}
                  style={[
                    styles.corridorCard,
                    {
                      backgroundColor: selected ? theme.primary : theme.surfaceSecondary,
                      borderColor: selected ? theme.primary : theme.surfaceBorder,
                    },
                  ]}
                  onPress={() => {
                    setSelectedCorridor(corridor);
                    setOrigin(corridor.from);
                    setDestination(corridor.to);
                    setPricePerSeat(String(corridor.priceKobo / 100));
                  }}
                >
                  <Text style={[styles.corridorTitle, { color: selected ? theme.primaryForeground : theme.textPrimary }]}>{corridor.from.split(',')[0]}</Text>
                  <Text style={[styles.corridorMeta, { color: selected ? theme.primaryForeground : theme.textSecondary }]}>{corridor.priceNaira}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder }]}> 
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Route</Text>
          <TextInput value={origin} onChangeText={setOrigin} style={[styles.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.surfaceBorder, color: theme.textPrimary }]} />
          <View style={styles.routeDivider} />
          <TextInput value={destination} onChangeText={setDestination} style={[styles.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.surfaceBorder, color: theme.textPrimary }]} />
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder }]}> 
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Departure details</Text>
          <View style={styles.inlineFields}>
            <View style={styles.inlineField}> 
              <Text style={[styles.label, { color: theme.textSecondary }]}>Time</Text>
              <TextInput
                value={departureTime}
                onChangeText={setDepartureTime}
                placeholder="08:30"
                keyboardType="numbers-and-punctuation"
                style={[styles.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.surfaceBorder, color: theme.textPrimary }]}
              />
            </View>
            <View style={styles.inlineField}> 
              <Text style={[styles.label, { color: theme.textSecondary }]}>Seats</Text>
              <TextInput
                value={String(availableSeats)}
                onChangeText={(value) => setAvailableSeats(Math.max(1, Number(value) || 1))}
                keyboardType="number-pad"
                style={[styles.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.surfaceBorder, color: theme.textPrimary }]}
              />
            </View>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder }]}> 
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Pricing</Text>
          <TextInput
            value={pricePerSeat}
            onChangeText={setPricePerSeat}
            keyboardType="numeric"
            style={[styles.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.surfaceBorder, color: theme.textPrimary }]}
          />
          <View style={[styles.priceInfoRow, { backgroundColor: theme.surfaceSecondary }]}> 
            <ShieldCheck size={16} color={fareWarning ? '#F59E0B' : '#10B981'} />
            <Text style={[styles.priceMeta, { color: fareWarning ? '#F59E0B' : '#10B981' }]}>
              {fareWarning ? `Above corridor cap: ₦${priceCap.toLocaleString()} max` : `Within corridor cap: ₦${priceCap.toLocaleString()} max`}
            </Text>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder }]}> 
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Amenities</Text>
          <View style={styles.amenityRow}>
            {amenityOptions.map((amenity) => {
              const selected = selectedAmenities.includes(amenity);
              return (
                <TouchableOpacity
                  key={amenity}
                  onPress={() => toggleAmenity(amenity)}
                  style={[
                    styles.amenityChip,
                    {
                      backgroundColor: selected ? theme.primary : theme.surfaceSecondary,
                      borderColor: selected ? theme.primary : theme.surfaceBorder,
                    },
                  ]}
                >
                  <Text style={[styles.amenityText, { color: selected ? theme.primaryForeground : theme.textPrimary }]}>{amenity}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Button title="Publish ride" onPress={handlePublish} variant="dark" size="lg" style={styles.publishButton} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 18,
    marginBottom: 8,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 16,
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  corridorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  corridorCard: {
    width: '47%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  corridorTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  corridorMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  routeDivider: {
    height: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
  },
  inlineFields: {
    flexDirection: 'row',
    gap: 12,
  },
  inlineField: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  priceInfoRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  priceMeta: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  amenityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  amenityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  publishButton: {
    marginTop: 4,
  },
});
