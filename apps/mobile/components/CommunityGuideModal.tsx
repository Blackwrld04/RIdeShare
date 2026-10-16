import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  HelpCircle,
  Users,
  MapPin,
  Shield,
  Heart,
  Clock,
  KeyRound,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';

interface CommunityGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CommunityGuideModal({ visible, onClose }: CommunityGuideModalProps) {
  const insets = useSafeAreaInsets();
  const { themeMode } = useAppStore();
  const isLight = themeMode === 'light';

  const handleOpenWhatsApp = () => {
    const phone = '2349152486135';
    const message = encodeURIComponent(
      'Hello RideShare Support, I have a question regarding the Community Guide.'
    );
    Linking.openURL(`https://wa.me/${phone}?text=${message}`);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: isLight ? '#FFFFFF' : '#0E1015',
            paddingTop: Math.max(insets.top, 16) + 8,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <View style={styles.badgeIcon}>
              <Users size={20} color="#2563EB" />
            </View>
            <View>
              <Text
                style={[
                  styles.headerTitle,
                  { color: isLight ? '#0F172A' : '#FFFFFF' },
                ]}
              >
                Help & Community Guide
              </Text>
              <Text
                style={[
                  styles.headerSubtitle,
                  { color: isLight ? '#64748B' : '#94A3B8' },
                ]}
              >
                Standards for verified safe commuting across Nigeria
              </Text>
            </View>
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.closeBtn}>
            <X size={22} color={isLight ? '#0F172A' : '#FFFFFF'} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: Math.max(insets.bottom, 24) + 20 },
          ]}
        >
          {/* Welcome Banner */}
          <View
            style={[
              styles.welcomeCard,
              {
                backgroundColor: isLight ? '#F0FDF4' : 'rgba(16, 185, 129, 0.1)',
                borderColor: isLight ? '#BBF7D0' : 'rgba(16, 185, 129, 0.25)',
              },
            ]}
          >
            <Heart size={22} color="#10B981" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.welcomeTitle, { color: isLight ? '#166534' : '#6EE7B7' }]}>
                Welcome to the RideShare Community
              </Text>
              <Text style={[styles.welcomeBody, { color: isLight ? '#15803D' : '#A7F3D0' }]}>
                We are building Nigeria’s safest, most respectful carpooling network. Whether
                you're a driver offering empty seats or a daily commuter, these standards keep
                everyone safe and comfortable.
              </Text>
            </View>
          </View>

          {/* Core Principle 1 */}
          <View style={styles.principleCard}>
            <View style={styles.principleHeader}>
              <View style={[styles.stepNumberBadge, { backgroundColor: '#2563EB' }]}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={[styles.principleTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                Verified Landmarks, Never Dark Alleys
              </Text>
            </View>
            <Text style={[styles.principleText, { color: isLight ? '#334155' : '#CBD5E1' }]}>
              All pickups and drop-offs take place at prominent, brightly lit public landmarks
              along major highway corridors: BRT terminals, reputable filling stations (Total, NNPC,
              Oando), or major estate security gates. Never agree to meet in isolated side streets.
            </Text>
          </View>

          {/* Core Principle 2 */}
          <View style={styles.principleCard}>
            <View style={styles.principleHeader}>
              <View style={[styles.stepNumberBadge, { backgroundColor: '#E06B26' }]}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={[styles.principleTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                The 4-Digit Departure Verification Code
              </Text>
            </View>
            <Text style={[styles.principleText, { color: isLight ? '#334155' : '#CBD5E1' }]}>
              Before entering the vehicle, confirm the vehicle make, color, and license plate match
              the app. When boarding, the passenger shares their unique 4-digit departure code with the
              driver. This verifies the correct passenger and activates live GPS trip protection.
            </Text>
          </View>

          {/* Core Principle 3 */}
          <View style={styles.principleCard}>
            <View style={styles.principleHeader}>
              <View style={[styles.stepNumberBadge, { backgroundColor: '#10B981' }]}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={[styles.principleTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                Punctuality & Communication
              </Text>
            </View>
            <Text style={[styles.principleText, { color: isLight ? '#334155' : '#CBD5E1' }]}>
              Arrive at least 5 minutes before scheduled departure time. If highway traffic creates
              delays, use the in-app chat immediately to notify your co-travelers. Drivers will
              honor a 15-minute grace period when notified.
            </Text>
          </View>

          {/* Core Principle 4 */}
          <View style={styles.principleCard}>
            <View style={styles.principleHeader}>
              <View style={[styles.stepNumberBadge, { backgroundColor: '#8B5CF6' }]}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={[styles.principleTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                Women-Only Verified Rides
              </Text>
            </View>
            <Text style={[styles.principleText, { color: isLight ? '#334155' : '#CBD5E1' }]}>
              Female commuters can filter exclusively for "Women-Only" rides. These rides are
              offered only by identity-verified female drivers and open strictly to female passengers,
              ensuring comfort and peace of mind on early morning and evening commutes.
            </Text>
          </View>

          {/* Core Principle 5 */}
          <View style={styles.principleCard}>
            <View style={styles.principleHeader}>
              <View style={[styles.stepNumberBadge, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.stepNumberText}>5</Text>
              </View>
              <Text style={[styles.principleTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                Strict "No-Cash" Safety Rule
              </Text>
            </View>
            <Text style={[styles.principleText, { color: isLight ? '#334155' : '#CBD5E1' }]}>
              NEVER pay or request cash. Paying cash forfeits all insurance coverage, Paystack escrow
              refund protections, and trip verification. Report any driver or passenger who requests
              offline cash immediately.
            </Text>
          </View>

          {/* Help Contact Card */}
          <View
            style={[
              styles.contactCard,
              {
                backgroundColor: isLight ? '#F8FAFC' : '#181A20',
                borderColor: isLight ? '#E2E8F0' : '#272B35',
              },
            ]}
          >
            <Text style={[styles.contactCardTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              Have Questions or Need Help?
            </Text>
            <Text style={[styles.contactCardSub, { color: isLight ? '#64748B' : '#94A3B8' }]}>
              Our local Nigerian operations desk is ready on WhatsApp to assist with route guidelines,
              refunds, and driver onboarding.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenWhatsApp}
              style={styles.whatsAppButton}
            >
              <MessageCircle size={18} color="#FFFFFF" />
              <Text style={styles.whatsAppButtonText}>Chat with Support (09152486135)</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 20,
    gap: 16,
  },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  welcomeTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  welcomeBody: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  principleCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    gap: 8,
  },
  principleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  principleTitle: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  principleText: {
    fontSize: 13,
    lineHeight: 20,
    paddingLeft: 36,
  },
  contactCard: {
    marginTop: 10,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    alignItems: 'center',
    textAlign: 'center',
  },
  contactCardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  contactCardSub: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  whatsAppButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 6,
  },
  whatsAppButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
