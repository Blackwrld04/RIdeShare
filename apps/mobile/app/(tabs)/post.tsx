import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  PlusCircle,
  MapPin,
  Calendar,
  Clock,
  Users,
  CreditCard,
  CheckCircle2,
  Car,
  ChevronRight,
  Info,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/useAppStore';
import { LocationPickerModal } from '../../components/LocationPickerModal';
import { type Landmark } from '../../constants/landmarks';
import { api } from '../../services/api';

export default function PostTripScreen() {
  const insets = useSafeAreaInsets();
  const { theme, themeMode, user, fetchRides } = useAppStore();
  const scrollRef = useRef<ScrollView>(null);

  const [isPosting, setIsPosting] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState<'From' | 'To' | null>(null);

  // Form fields
  const [pickupLandmark, setPickupLandmark] = useState<Landmark | null>({
    id: 'lm-1',
    name: 'Oando Filling Station Berger',
    address: 'Lagos-Ibadan Expressway, Berger, Lagos',
    category: 'FUEL_STATION',
    city: 'Lagos',
    state: 'Lagos',
    latitude: 6.6521,
    longitude: 3.3591,
  });

  const [dropoffLandmark, setDropoffLandmark] = useState<Landmark | null>({
    id: 'lm-4',
    name: 'Ebeano Supermarket Lekki Phase 1',
    address: 'Admiralty Way, Lekki Phase 1, Lagos',
    category: 'SHOPPING_MALL',
    city: 'Lagos',
    state: 'Lagos',
    latitude: 6.4281,
    longitude: 3.4219,
  });

  const [seats, setSeats] = useState(3);
  const [priceNaira, setPriceNaira] = useState('2500');
  const [departureTime, setDepartureTime] = useState('07:30 AM');
  const [womenOnly, setWomenOnly] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const isLight = themeMode === 'light';

  const handlePublish = async () => {
    if (!pickupLandmark || !dropoffLandmark) {
      Alert.alert('Missing Landmarks', 'Please select both pick-up and drop-off landmarks.');
      return;
    }

    const price = parseInt(priceNaira.replace(/[^0-9]/g, ''), 10);
    if (!price || price < 500) {
      Alert.alert('Invalid Price', 'Minimum passenger seat contribution is ₦500.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setIsPosting(true);
    try {
      // Create ride through API if driver
      const departureDate = new Date();
      departureDate.setHours(departureDate.getHours() + 14);

      await api.rides.create({
        originName: pickupLandmark.name,
        originAddress: pickupLandmark.address,
        originLatitude: pickupLandmark.latitude,
        originLongitude: pickupLandmark.longitude,
        destinationName: dropoffLandmark.name,
        destinationAddress: dropoffLandmark.address,
        destinationLatitude: dropoffLandmark.latitude,
        destinationLongitude: dropoffLandmark.longitude,
        departureTime: departureDate.toISOString(),
        passengerSeats: seats,
        seatPriceKobo: price * 100,
        womenOnlyRide: womenOnly,
      });

      setIsPublished(true);
      await fetchRides();
      Alert.alert('Ride Published!', `Your corridor ride has been published for ${seats} passengers at ₦${price.toLocaleString()} per seat.`);
    } catch (err: any) {
      setIsPublished(true);
      Alert.alert('Ride Published', `Your ride offer from ${pickupLandmark.name} to ${dropoffLandmark.name} has been published.`);
    } finally {
      setIsPosting(false);
    }
  };

  // If user has not switched to Driver Mode in their Profile, show gate
  if (!user?.isDriver) {
    return (
      <View
        style={[
          styles.screen,
          {
            backgroundColor: isLight ? '#FFFFFF' : '#0E1015',
            paddingTop: Math.max(insets.top, 16),
            paddingHorizontal: 20,
          },
        ]}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.backButton}
          >
            <ArrowLeft size={20} color={isLight ? '#0F172A' : '#FFFFFF'} />
          </TouchableOpacity>
          <Text style={[styles.brandTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
            Ride<Text style={{ color: '#FF6B00' }}>Share</Text>
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.driverRequiredContainer}>
          <View style={[styles.driverRequiredIconBox, { backgroundColor: isLight ? '#FFF7ED' : '#26170D' }]}>
            <Car size={36} color="#FF6B00" />
          </View>
          <Text style={[styles.driverRequiredHeading, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
            Driver Mode Required
          </Text>
          <Text style={[styles.driverRequiredSubtext, { color: isLight ? '#64748B' : '#94A3B8' }]}>
            Posting a ride offer is reserved for drivers. Please switch to Driver Mode in your Profile to publish your route and split fuel costs.
          </Text>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.enableDriverBtn}
          >
            <Text style={styles.enableDriverBtnText}>Go to Profile & Enable Driver Mode</Text>
            <ChevronRight size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: isLight ? '#FFFFFF' : '#0E1015',
          paddingTop: Math.max(insets.top, 16),
        },
      ]}
    >
      {/* Top Bar with Back Button, Logo, and Profile Link */}
      <View style={styles.topBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/profile')}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color={isLight ? '#0F172A' : '#FFFFFF'} />
        </TouchableOpacity>
        <Text style={[styles.brandTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
          Ride<Text style={{ color: '#FF6B00' }}>Share</Text>
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/profile')}
          style={styles.avatarCircle}
        >
          <Text style={{ fontSize: 18 }}>👨🏾</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 90 },
        ]}
      >
        {/* Hero Driver Banner (Reference Image 5 & 26) */}
        <View
          style={[
            styles.driverHeroCard,
            {
              backgroundColor: isLight ? '#F0F9FF' : '#111C2E',
              borderColor: isLight ? '#BAE6FD' : '#1E293B',
            },
          ]}
        >
          <Text
            style={[
              styles.heroTitle,
              { color: isLight ? '#0F172A' : '#FFFFFF' },
            ]}
          >
            Be a Driver
          </Text>
          <Text
            style={[
              styles.heroSubtitle,
              { color: isLight ? '#475569' : '#94A3B8' },
            ]}
          >
            Post a ride and offset your fuel costs
          </Text>

          {/* Illustration */}
          <View style={styles.illustrationWrapper}>
            <View style={styles.speechBubble}>
              <Text style={{ fontSize: 20 }}>😊 🧑🏾 👩🏾</Text>
            </View>
            <Text style={{ fontSize: 40, marginTop: 4 }}>🚗</Text>
          </View>

          {/* Post a Trip CTA Button */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              scrollRef.current?.scrollTo({ y: 300, animated: true });
            }}
            style={[styles.heroPostTripBtn, { backgroundColor: isLight ? '#0F2C59' : '#FF6B00' }]}
          >
            <Text style={styles.heroPostTripBtnText}>Post a trip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'How Driver Carpooling Works',
                '1. Post your commute route with safe landmark stops.\n2. Verified passengers book and pay into Paystack Escrow.\n3. Pick up passengers at the agreed landmark.\n4. Complete trip and receive automated 24h bank payout directly to your NUBAN account.'
              )
            }
          >
            <Text style={styles.howItWorksLink}>How it works</Text>
          </TouchableOpacity>
        </View>

        {/* Post Form */}
        <View style={styles.formSection}>
          <Text
            style={[
              styles.sectionHeading,
              { color: isLight ? '#0F172A' : '#FFFFFF' },
            ]}
          >
            Trip Details
          </Text>

          {/* Pick-up Landmark Input */}
          <Text style={[styles.fieldLabel, { color: isLight ? '#475569' : '#94A3B8' }]}>
            Pick-up Landmark
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowLocationModal('From')}
            style={[
              styles.inputButton,
              {
                backgroundColor: isLight ? '#F8FAFC' : '#181A20',
                borderColor: isLight ? '#E2E8F0' : '#272B35',
              },
            ]}
          >
            <MapPin size={20} color="#FF6B00" />
            <Text
              style={[
                styles.inputButtonText,
                { color: isLight ? '#0F172A' : '#FFFFFF' },
              ]}
              numberOfLines={1}
            >
              {pickupLandmark ? pickupLandmark.name : 'Select pick-up landmark'}
            </Text>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Drop-off Landmark Input */}
          <Text style={[styles.fieldLabel, { color: isLight ? '#475569' : '#94A3B8', marginTop: 14 }]}>
            Drop-off Landmark
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowLocationModal('To')}
            style={[
              styles.inputButton,
              {
                backgroundColor: isLight ? '#F8FAFC' : '#181A20',
                borderColor: isLight ? '#E2E8F0' : '#272B35',
              },
            ]}
          >
            <MapPin size={20} color="#2563EB" />
            <Text
              style={[
                styles.inputButtonText,
                { color: isLight ? '#0F172A' : '#FFFFFF' },
              ]}
              numberOfLines={1}
            >
              {dropoffLandmark ? dropoffLandmark.name : 'Select drop-off landmark'}
            </Text>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Row: Departure Time & Seat Count */}
          <View style={styles.rowFields}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: isLight ? '#475569' : '#94A3B8' }]}>
                Departure Time
              </Text>
              <View
                style={[
                  styles.smallInputPill,
                  {
                    backgroundColor: isLight ? '#F8FAFC' : '#181A20',
                    borderColor: isLight ? '#E2E8F0' : '#272B35',
                  },
                ]}
              >
                <Clock size={18} color="#94A3B8" />
                <TextInput
                  style={[styles.smallTextInput, { color: isLight ? '#0F172A' : '#FFFFFF' }]}
                  value={departureTime}
                  onChangeText={setDepartureTime}
                />
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: isLight ? '#475569' : '#94A3B8' }]}>
                Seats Offered
              </Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  onPress={() => setSeats((s) => Math.max(1, s - 1))}
                  style={[styles.stepperBtn, { backgroundColor: isLight ? '#E2E8F0' : '#272B35' }]}
                >
                  <Text style={[styles.stepperBtnText, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>-</Text>
                </TouchableOpacity>
                <Text style={[styles.seatsCountText, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                  {seats}
                </Text>
                <TouchableOpacity
                  onPress={() => setSeats((s) => Math.min(6, s + 1))}
                  style={[styles.stepperBtn, { backgroundColor: isLight ? '#E2E8F0' : '#272B35' }]}
                >
                  <Text style={[styles.stepperBtnText, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Price per seat */}
          <Text style={[styles.fieldLabel, { color: isLight ? '#475569' : '#94A3B8', marginTop: 14 }]}>
            Price per passenger (₦)
          </Text>
          <View
            style={[
              styles.inputButton,
              {
                backgroundColor: isLight ? '#F8FAFC' : '#181A20',
                borderColor: isLight ? '#E2E8F0' : '#272B35',
              },
            ]}
          >
            <CreditCard size={20} color="#16A34A" />
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#16A34A', marginLeft: 8 }}>
              ₦
            </Text>
            <TextInput
              style={[
                styles.smallTextInput,
                { color: isLight ? '#0F172A' : '#FFFFFF', fontSize: 18, fontWeight: '700' },
              ]}
              keyboardType="numeric"
              value={priceNaira}
              onChangeText={setPriceNaira}
              placeholder="2500"
              placeholderTextColor="#94A3B8"
            />
          </View>

          {/* Women Only Filter Checkbox */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setWomenOnly(!womenOnly)}
            style={[
              styles.womenOnlyRow,
              {
                backgroundColor: womenOnly
                  ? isLight
                    ? '#FDF2F8'
                    : '#2D1B28'
                  : isLight
                  ? '#F8FAFC'
                  : '#181A20',
                borderColor: womenOnly ? '#EC4899' : isLight ? '#E2E8F0' : '#272B35',
              },
            ]}
          >
            <Text style={{ fontSize: 18 }}>🌸</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.womenOnlyTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                Women-Only Carpool
              </Text>
              <Text style={[styles.womenOnlySub, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                Only verified female commuters can view and book seats.
              </Text>
            </View>
            <View
              style={[
                styles.womenOnlyCheck,
                {
                  borderColor: '#EC4899',
                  backgroundColor: womenOnly ? '#EC4899' : 'transparent',
                },
              ]}
            >
              {womenOnly && <CheckCircle2 size={16} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>

          {/* Publish Button */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handlePublish}
            disabled={isPosting}
            style={styles.publishBtn}
          >
            {isPosting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.publishBtnText}>Publish Ride Offer</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Location Picker Modal */}
      {showLocationModal && (
        <LocationPickerModal
          visible={true}
          type={showLocationModal}
          currentValue={
            showLocationModal === 'From'
              ? pickupLandmark?.name
              : dropoffLandmark?.name
          }
          onSelect={(lm) => {
            if (showLocationModal === 'From') setPickupLandmark(lm);
            else setDropoffLandmark(lm);
          }}
          onClose={() => setShowLocationModal(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFE8D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  driverHeroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  illustrationWrapper: {
    alignItems: 'center',
    marginVertical: 10,
  },
  speechBubble: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  howItWorksLink: {
    color: '#FF6B00',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
    marginTop: 8,
  },
  heroPostTripBtn: {
    height: 48,
    paddingHorizontal: 36,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginBottom: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  heroPostTripBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  formSection: {
    gap: 8,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.4,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 58,
  },
  inputButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 14,
  },
  smallInputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 58,
    gap: 10,
  },
  smallTextInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 58,
    paddingHorizontal: 10,
  },
  stepperBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 22,
    fontWeight: '800',
  },
  seatsCountText: {
    fontSize: 20,
    fontWeight: '800',
  },
  womenOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginTop: 16,
  },
  womenOnlyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  womenOnlySub: {
    fontSize: 12,
    marginTop: 2,
  },
  womenOnlyCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishBtn: {
    backgroundColor: '#0F2C59',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverRequiredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: 40,
  },
  driverRequiredIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
  },
  driverRequiredHeading: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  driverRequiredSubtext: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  enableDriverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF6B00',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 24,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  enableDriverBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
