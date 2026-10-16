import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function TermsModal({ visible, onClose }: TermsModalProps) {
  const insets = useSafeAreaInsets();
  const { themeMode } = useAppStore();
  const isLight = themeMode === 'light';

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
              <FileText size={20} color="#E06B26" />
            </View>
            <View>
              <Text
                style={[
                  styles.headerTitle,
                  { color: isLight ? '#0F172A' : '#FFFFFF' },
                ]}
              >
                Terms and Conditions
              </Text>
              <Text
                style={[
                  styles.headerSubtitle,
                  { color: isLight ? '#64748B' : '#94A3B8' },
                ]}
              >
                Effective October 2026 • RideShare Nigeria
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
          {/* Quick Notice Card */}
          <View
            style={[
              styles.noticeCard,
              {
                backgroundColor: isLight ? '#EFF6FF' : 'rgba(37, 99, 235, 0.1)',
                borderColor: isLight ? '#BFDBFE' : 'rgba(37, 99, 235, 0.25)',
              },
            ]}
          >
            <ShieldCheck size={20} color="#2563EB" />
            <Text
              style={[
                styles.noticeText,
                { color: isLight ? '#1E40AF' : '#93C5FD' },
              ]}
            >
              RideShare connects car owners with empty seats to commuters heading along
              the same corridor. Ride contributions are strictly for vehicle fuel and
              operating cost-sharing without commercial passenger profit.
            </Text>
          </View>

          {/* Section 1 */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              1. Non-Commercial Carpooling Status
            </Text>
            <Text style={[styles.sectionBody, { color: isLight ? '#334155' : '#CBD5E1' }]}>
              RideShare operates in compliance with Nigerian Federal and State road traffic
              regulations. All drivers on the platform are private vehicle owners commuting on their
              own daily routines. The fee contributed by passengers is capped by law to offset actual
              fuel consumption and toll charges, ensuring drivers do not engage in unauthorized
              commercial passenger hire.
            </Text>
          </View>

          {/* Section 2 */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              2. Strict "No Cash" Escrow Rule
            </Text>
            <Text style={[styles.sectionBody, { color: isLight ? '#334155' : '#CBD5E1' }]}>
              To guarantee total safety and dispute resolution, all payments must occur through our
              automated Paystack Escrow checkout inside the application. Paying drivers in cash or
              demanding direct bank transfers outside the platform is strictly prohibited and leads to
              immediate account termination.
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletRow}>
                <CheckCircle2 size={16} color="#10B981" />
                <Text style={[styles.bulletText, { color: isLight ? '#475569' : '#94A3B8' }]}>
                  Funds remain safely locked in escrow until the passenger confirms safe drop-off.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <CheckCircle2 size={16} color="#10B981" />
                <Text style={[styles.bulletText, { color: isLight ? '#475569' : '#94A3B8' }]}>
                  Automated driver payouts are processed within 24 hours of successful trip completion.
                </Text>
              </View>
            </View>
          </View>

          {/* Section 3 */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              3. Verification & Identity Standards
            </Text>
            <Text style={[styles.sectionBody, { color: isLight ? '#334155' : '#CBD5E1' }]}>
              Every member must provide authentic identification verified against Nigerian National
              Identity Management Commission (NIMC) database records. Drivers must submit valid
              FRSC Driver Licenses, vehicle inspection documents, and roadworthiness certificates
              before offering empty car seats.
            </Text>
          </View>

          {/* Section 4 */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              4. Cancellations & Automatic Refunds
            </Text>
            <Text style={[styles.sectionBody, { color: isLight ? '#334155' : '#CBD5E1' }]}>
              • Passenger Cancellation: If you cancel more than 60 minutes before departure, you receive
              a 100% full refund.{'\n'}
              • Driver Cancellation or No-Show: If a driver fails to arrive at the agreed landmark or cancels,
              your escrowed payment is automatically refunded 100% back to your Nigerian bank account or card.{'\n'}
              • Traffic Grace: A 30-minute grace window applies for heavy highway traffic corridors
              (e.g., Berger, Third Mainland Bridge, Lekki-Epe).
            </Text>
          </View>

          {/* Section 5 */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              5. Zero-Tolerance Safety Policy
            </Text>
            <Text style={[styles.sectionBody, { color: isLight ? '#334155' : '#CBD5E1' }]}>
              RideShare maintains zero tolerance for harassment, reckless driving, substance abuse,
              or discrimination. Live GPS trip tracking, emergency SOS alerts (112), and safety share
              links are active on every journey.
            </Text>
          </View>

          {/* Section 6 */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              6. Governing Law & Jurisdiction
            </Text>
            <Text style={[styles.sectionBody, { color: isLight ? '#334155' : '#CBD5E1' }]}>
              These terms are governed by the laws of the Federal Republic of Nigeria. Any disputes
              shall be submitted to the exclusive jurisdiction of the competent courts in Lagos State or
              the Federal Capital Territory (FCT), Abuja.
            </Text>
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
    backgroundColor: 'rgba(224, 107, 38, 0.12)',
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
    gap: 20,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  sectionBlock: {
    gap: 8,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
  },
  bulletList: {
    marginTop: 8,
    gap: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});
