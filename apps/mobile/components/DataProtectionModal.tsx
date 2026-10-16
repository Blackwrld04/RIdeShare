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
import { X, ShieldCheck, Lock, EyeOff, Server, Database, CheckCircle2 } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';

interface DataProtectionModalProps {
  visible: boolean;
  onClose: () => void;
}

export function DataProtectionModal({ visible, onClose }: DataProtectionModalProps) {
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
              <Lock size={20} color="#10B981" />
            </View>
            <View>
              <Text
                style={[
                  styles.headerTitle,
                  { color: isLight ? '#0F172A' : '#FFFFFF' },
                ]}
              >
                Data Protection & Privacy
              </Text>
              <Text
                style={[
                  styles.headerSubtitle,
                  { color: isLight ? '#64748B' : '#94A3B8' },
                ]}
              >
                NDPA 2023 & NDPR Compliance Policy
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
          {/* Statutory Certificate Box */}
          <View
            style={[
              styles.certCard,
              {
                backgroundColor: isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.1)',
                borderColor: isLight ? '#A7F3D0' : 'rgba(16, 185, 129, 0.25)',
              },
            ]}
          >
            <ShieldCheck size={22} color="#10B981" />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.certTitle,
                  { color: isLight ? '#065F46' : '#6EE7B7' },
                ]}
              >
                Certified NDPA 2023 Compliant
              </Text>
              <Text
                style={[
                  styles.certBody,
                  { color: isLight ? '#047857' : '#A7F3D0' },
                ]}
              >
                RideShare processes commuter data strictly in line with the Nigeria Data
                Protection Act (NDPA) and NDPR regulations enforced by the Nigeria Data
                Protection Commission (NDPC).
              </Text>
            </View>
          </View>

          {/* Section 1 */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              1. What Information We Collect
            </Text>
            <Text style={[styles.sectionBody, { color: isLight ? '#334155' : '#CBD5E1' }]}>
              To guarantee passenger trust, verified seat booking, and emergency assistance,
              we collect the following categories of data:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletRow}>
                <CheckCircle2 size={16} color="#10B981" />
                <Text style={[styles.bulletText, { color: isLight ? '#475569' : '#94A3B8' }]}>
                  <Text style={{ fontWeight: '700' }}>Identity Records:</Text> Full legal name, verified
                  11-digit NIN (via authorized NIMC validation services), and optional FRSC driver license.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <CheckCircle2 size={16} color="#10B981" />
                <Text style={[styles.bulletText, { color: isLight ? '#475569' : '#94A3B8' }]}>
                  <Text style={{ fontWeight: '700' }}>Contact Details:</Text> Verified Nigerian mobile phone
                  number (+234) and email address for transactional receipts.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <CheckCircle2 size={16} color="#10B981" />
                <Text style={[styles.bulletText, { color: isLight ? '#475569' : '#94A3B8' }]}>
                  <Text style={{ fontWeight: '700' }}>Live Trip GPS Pings:</Text> Real-time location coordinates
                  transmitted strictly during an active corridor journey for safety tracking and SOS alerting.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <CheckCircle2 size={16} color="#10B981" />
                <Text style={[styles.bulletText, { color: isLight ? '#475569' : '#94A3B8' }]}>
                  <Text style={{ fontWeight: '700' }}>Financial Settlements:</Text> Tokenized payment receipts
                  and 10-digit NUBAN bank account numbers processed via Paystack. Card details are NEVER stored
                  on RideShare servers.
                </Text>
              </View>
            </View>
          </View>

          {/* Section 2 */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              2. AES-256 Military Grade Encryption
            </Text>
            <Text style={[styles.sectionBody, { color: isLight ? '#334155' : '#CBD5E1' }]}>
              All sensitive national identity numbers (NIN) are instantly hashed and encrypted at rest
              using AES-256-GCM authenticated encryption. Raw identity numbers are never exposed in
              application logs, API responses, or staff administrative portals.
            </Text>
          </View>

          {/* Section 3 */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              3. No Commercial Sale of Personal Data
            </Text>
            <Text style={[styles.sectionBody, { color: isLight ? '#334155' : '#CBD5E1' }]}>
              RideShare does NOT sell, rent, or monetize your contact records or travel patterns to
              advertisers or third-party data brokers. Information is shared strictly with authorized
              payment processors (Paystack) and emergency response authorities (112) when an active SOS
              alert is triggered by the passenger.
            </Text>
          </View>

          {/* Section 4 */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              4. Your NDPA Rights
            </Text>
            <Text style={[styles.sectionBody, { color: isLight ? '#334155' : '#CBD5E1' }]}>
              Under the Nigeria Data Protection Act 2023, you retain full rights to:{'\n'}
              • Request an export of your personal data and completed trip histories.{'\n'}
              • Request rectification of inaccurate profile information.{'\n'}
              • Request permanent erasure of your account and personal data from our databases.{'\n'}
              • Revoke location tracking permissions at any time via device settings when not on an active trip.
            </Text>
          </View>

          {/* Section 5 */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              5. Contact Our Data Protection Officer (DPO)
            </Text>
            <Text style={[styles.sectionBody, { color: isLight ? '#334155' : '#CBD5E1' }]}>
              For any privacy inquiries, data deletion requests, or regulatory filings, contact our
              Data Protection Officer directly:{'\n\n'}
              • Email: dpo@rideshare.ng / privacy@rideshare.ng{'\n'}
              • WhatsApp Legal Desk: 09152486135{'\n'}
              • Office: Victoria Island, Lagos, Nigeria
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
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
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
  certCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  certTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  certBody: {
    fontSize: 13,
    lineHeight: 19,
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
