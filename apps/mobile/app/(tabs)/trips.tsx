import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Car,
  Phone,
  MessageSquare,
  Share2,
  AlertTriangle,
  Navigation,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../services/api';

type TabView = 'UPCOMING' | 'PAST' | 'CANCELLED';

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, themeMode, bookings, activeTrip } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabView>('UPCOMING');

  const handleShareWhatsApp = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await api.safety.createShareLink(activeTrip?.rideId || 'ride-1');
      const text = encodeURIComponent(
        `Hi! I am sharing my live CommuteShare trip with driver ${activeTrip?.ride.driverName || 'Olajide'} (${activeTrip?.ride.vehicle.model} - ${activeTrip?.ride.vehicle.registrationNumber}). Track my live journey safely here: ${res.shareUrl}`,
      );
      Linking.openURL(`whatsapp://send?text=${text}`);
    } catch {
      Alert.alert('Live Trip Link', 'WhatsApp is not installed or available on this device.');
    }
  };

  const handleEmergencySOS = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}

    Alert.alert(
      '🚨 EMERGENCY SOS',
      'You are about to call Lagos State Emergency Services (112/767) and dispatch your live coordinates to emergency contacts. Proceed?',
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

  const handleCallDriver = () => {
    Linking.openURL('tel:+2348030000000');
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 16) + 8,
            backgroundColor: theme.surface,
            borderBottomColor: theme.surfaceBorder,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Trip Tracker & Cockpit
        </Text>

        {/* Triple-Tab Segmented Control (PRD 5.4 TRIP-01) */}
        <View
          style={[
            styles.tabSegmentContainer,
            { backgroundColor: theme.surfaceSecondary },
          ]}
        >
          {(['UPCOMING', 'PAST', 'CANCELLED'] as TabView[]).map((tab) => {
            const isSelected = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                activeOpacity={0.8}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tabSegment,
                  isSelected && [
                    styles.tabSegmentActive,
                    { backgroundColor: theme.chipActiveBg },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.tabSegmentText,
                    {
                      color: isSelected ? theme.chipActiveText : theme.textMuted,
                      fontWeight: isSelected ? '800' : '600',
                    },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === 'UPCOMING' && activeTrip && (
          <View style={styles.activeTripWrapper}>
            {/* Status Pill & Route Header */}
            <View style={styles.statusRow}>
              <View style={styles.inTransitPill}>
                <View style={styles.blinkingDot} />
                <Text style={styles.inTransitText}>
                  IN TRANSIT • Heading to {activeTrip.ride.destTitle.split(',')[0]}
                </Text>
              </View>
              <Text style={[styles.tripIdText, { color: theme.textMuted }]}>
                #NG-8492
              </Text>
            </View>

            {/* State Progress Chain (PRD 11 & 17.2) */}
            <View
              style={[
                styles.progressChainContainer,
                { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder },
              ]}
            >
              <View style={styles.progressStep}>
                <CheckCircle2 size={16} color="#10B981" />
                <Text style={[styles.progressStepText, { color: '#10B981' }]}>
                  Booked
                </Text>
              </View>
              <View style={[styles.progressLine, { backgroundColor: '#10B981' }]} />
              <View style={styles.progressStep}>
                <CheckCircle2 size={16} color="#10B981" />
                <Text style={[styles.progressStepText, { color: '#10B981' }]}>
                  Confirmed
                </Text>
              </View>
              <View style={[styles.progressLine, { backgroundColor: '#FF7A00' }]} />
              <View style={styles.progressStep}>
                <View style={styles.progressActiveCircle}>
                  <View style={styles.progressActiveInner} />
                </View>
                <Text style={[styles.progressStepText, { color: '#FF7A00' }]}>
                  In Transit
                </Text>
              </View>
            </View>

            {/* Active Driver Card */}
            <Card style={styles.driverCockpitCard}>
              <View style={styles.cockpitDriverRow}>
                <View style={styles.cockpitMeta}>
                  <Text style={[styles.cockpitDriverName, { color: theme.textPrimary }]}>
                    Driver: {activeTrip.ride.driverName}
                  </Text>
                  <View style={styles.badgeRow}>
                    <Badge label="★ 4.98" variant="rating" />
                    <Badge label="NIN Verified" variant="verified" />
                  </View>
                </View>
              </View>

              <View style={[styles.carDetailRow, { backgroundColor: theme.surfaceInput }]}>
                <Car size={16} color="#FF7A00" />
                <Text style={[styles.carDetailText, { color: theme.textPrimary }]}>
                  {activeTrip.ride.vehicle.color} {activeTrip.ride.vehicle.model} • [
                  {activeTrip.ride.vehicle.registrationNumber}]
                </Text>
              </View>

              <View style={styles.meetingSpotRow}>
                <Navigation size={14} color="#10B981" />
                <Text style={[styles.meetingSpotLabel, { color: theme.textSecondary }]}>
                  Meeting Spot:
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.meetingSpotValue, { color: theme.textPrimary }]}
                >
                  {activeTrip.pickupLandmark}
                </Text>
              </View>

              {/* Action Buttons: Chat & Call Driver */}
              <View style={styles.actionButtonsRow}>
                <Button
                  title="Open Trip Chat"
                  variant="dark"
                  icon={<MessageSquare size={16} color={themeMode === 'light' ? '#FFFFFF' : '#090A0E'} />}
                  onPress={() => router.push(`/chat/${activeTrip.id}`)}
                  style={styles.chatButton}
                />
                <Button
                  title="Call Driver"
                  variant="secondary"
                  icon={<Phone size={16} color={theme.textPrimary} />}
                  onPress={handleCallDriver}
                  style={styles.callButton}
                />
              </View>

              {/* Live Tracking Cockpit Link */}
              <Button
                title="Open Live GPS & ETA Cockpit"
                variant="primary"
                icon={<Navigation size={16} color="#FFFFFF" />}
                onPress={() => router.push(`/tracking/${activeTrip.id}`)}
                style={styles.liveCockpitBtn}
              />
            </Card>

            {/* SAFETY & EMERGENCY ASSISTANCE (PRD 17.2) */}
            <View style={styles.safetySection}>
              <View style={styles.safetyHeader}>
                <ShieldCheck size={18} color="#10B981" />
                <Text style={[styles.safetyTitle, { color: theme.textPrimary }]}>
                  SAFETY & EMERGENCY ASSISTANCE
                </Text>
              </View>

              {/* WhatsApp Live Trip Share */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleShareWhatsApp}
                style={[
                  styles.safetyCard,
                  {
                    backgroundColor: theme.surfaceCard,
                    borderColor: theme.surfaceBorder,
                  },
                ]}
              >
                <View style={styles.safetyIconBoxGreen}>
                  <Share2 size={20} color="#10B981" />
                </View>
                <View style={styles.safetyTextCol}>
                  <Text style={[styles.safetyCardTitle, { color: theme.textPrimary }]}>
                    Share Live Trip via WhatsApp
                  </Text>
                  <Text style={[styles.safetyCardSub, { color: theme.textMuted }]}>
                    Sends driver name, car plate & real-time GPS link to your family
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Emergency SOS Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleEmergencySOS}
                style={[styles.emergencySosCard, { borderColor: '#EF4444' }]}
              >
                <View style={styles.safetyIconBoxRed}>
                  <AlertTriangle size={20} color="#FFFFFF" />
                </View>
                <View style={styles.safetyTextCol}>
                  <Text style={styles.emergencyTitle}>Emergency SOS: Dial 112 / 767</Text>
                  <Text style={styles.emergencySub}>
                    Direct connection to Lagos State Emergency Dispatch Services
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Empty States for Past / Cancelled */}
        {activeTab !== 'UPCOMING' && (
          <View style={styles.emptyState}>
            <Clock size={40} color={theme.textMuted} />
            <Text style={[styles.emptyStateTitle, { color: theme.textPrimary }]}>
              No {activeTab.toLowerCase()} trips
            </Text>
            <Text style={[styles.emptyStateSub, { color: theme.textMuted }]}>
              Completed and settled rides will appear here with full Paystack escrow receipts.
            </Text>
          </View>
        )}
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
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 14,
  },
  tabSegmentContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
  },
  tabSegment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabSegmentActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabSegmentText: {
    fontSize: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
  },
  activeTripWrapper: {
    gap: 14,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inTransitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  blinkingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#D97706',
  },
  inTransitText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  tripIdText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressChainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressStepText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
  },
  progressActiveCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FF7A00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressActiveInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF7A00',
  },
  driverCockpitCard: {
    padding: 18,
  },
  cockpitDriverRow: {
    marginBottom: 10,
  },
  cockpitMeta: {
    gap: 6,
  },
  cockpitDriverName: {
    fontSize: 17,
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  carDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    marginVertical: 8,
  },
  carDetailText: {
    fontSize: 13,
    fontWeight: '700',
  },
  meetingSpotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  meetingSpotLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  meetingSpotValue: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  chatButton: {
    flex: 1,
    height: 46,
  },
  callButton: {
    flex: 1,
    height: 46,
  },
  liveCockpitBtn: {
    marginTop: 10,
    height: 48,
  },
  safetySection: {
    marginTop: 8,
    gap: 10,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  safetyTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  safetyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  safetyIconBoxGreen: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safetyTextCol: {
    flex: 1,
  },
  safetyCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  safetyCardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  emergencySosCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    backgroundColor: '#7F1D1D',
    gap: 12,
  },
  safetyIconBoxRed: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emergencySub: {
    fontSize: 11,
    color: '#FECACA',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyStateSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
