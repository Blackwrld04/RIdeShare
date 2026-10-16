import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  MessageSquare,
  HelpCircle,
  ChevronRight,
  Search,
  ShieldCheck,
  CreditCard,
  Send,
} from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';

interface HelpSupportModalProps {
  visible: boolean;
  onClose: () => void;
}

export function HelpSupportModal({ visible, onClose }: HelpSupportModalProps) {
  const insets = useSafeAreaInsets();
  const { theme, themeMode, user } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');

  const displayName = user?.displayName?.split(' ')[0] || 'Commuter';

  const handleFaqPress = (title: string, details: string) => {
    Alert.alert(title, details, [{ text: 'Understood' }]);
  };

  const handleSendMessage = () => {
    Alert.alert(
      'Live Support',
      'Our Lagos Support team is available 24/7 on WhatsApp and In-App Chat.\n\nWhatsApp: +234 800 266 6883\nEmail: support@rideshare.ng',
      [{ text: 'Close' }]
    );
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
            backgroundColor: themeMode === 'light' ? '#FFFFFF' : '#0E1015',
            paddingTop: Math.max(insets.top, 16) + 10,
          },
        ]}
      >
        {/* Header Row: Close button */}
        <View style={styles.headerRow}>
          <View style={styles.badgeIcon}>
            <Text style={{ fontSize: 20 }}>🚗</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.closeBtn}>
            <X size={24} color={themeMode === 'light' ? '#0F172A' : '#FFFFFF'} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 30 }}
        >
          {/* Greeting */}
          <Text
            style={[
              styles.greetingText,
              { color: themeMode === 'light' ? '#475569' : '#94A3B8' },
            ]}
          >
            Hi {displayName} 👋
          </Text>
          <Text
            style={[
              styles.titleText,
              { color: themeMode === 'light' ? '#0F172A' : '#FFFFFF' },
            ]}
          >
            How can we help?
          </Text>

          {/* Quick Menu Card */}
          <View
            style={[
              styles.menuCard,
              {
                backgroundColor: themeMode === 'light' ? '#F8FAFC' : '#181A20',
                borderColor: themeMode === 'light' ? '#E2E8F0' : '#272B35',
              },
            ]}
          >
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                onClose();
              }}
            >
              <Text
                style={[
                  styles.menuRowText,
                  { color: themeMode === 'light' ? '#0F172A' : '#FFFFFF' },
                ]}
              >
                Messages
              </Text>
              <MessageSquare size={18} color={themeMode === 'light' ? '#0F172A' : '#60A5FA'} />
            </TouchableOpacity>

            <View
              style={[
                styles.divider,
                { backgroundColor: themeMode === 'light' ? '#E2E8F0' : '#272B35' },
              ]}
            />

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() =>
                Alert.alert(
                  'RideShare Guide',
                  'RideShare connects car owners with empty seats to commuters heading along the same highway corridors. Drivers offset fuel costs without commercial profiteering.'
                )
              }
            >
              <Text
                style={[
                  styles.menuRowText,
                  { color: themeMode === 'light' ? '#0F172A' : '#FFFFFF' },
                ]}
              >
                Help & Community Guide
              </Text>
              <HelpCircle size={18} color={themeMode === 'light' ? '#0F172A' : '#60A5FA'} />
            </TouchableOpacity>
          </View>

          {/* Send us a message button card */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSendMessage}
            style={[
              styles.sendActionCard,
              {
                backgroundColor: themeMode === 'light' ? '#FFFFFF' : '#181A20',
                borderColor: themeMode === 'light' ? '#E2E8F0' : '#272B35',
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Send size={18} color="#2563EB" />
              <Text
                style={[
                  styles.sendActionText,
                  { color: themeMode === 'light' ? '#0F172A' : '#FFFFFF' },
                ]}
              >
                Send us a message
              </Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Search Help Articles */}
          <View
            style={[
              styles.faqSearchContainer,
              {
                backgroundColor: themeMode === 'light' ? '#F8FAFC' : '#181A20',
                borderColor: themeMode === 'light' ? '#E2E8F0' : '#272B35',
              },
            ]}
          >
            <View
              style={[
                styles.searchInputPill,
                {
                  backgroundColor: themeMode === 'light' ? '#EEF2F6' : '#222630',
                },
              ]}
            >
              <Search size={18} color="#94A3B8" />
              <TextInput
                style={[
                  styles.searchInput,
                  { color: themeMode === 'light' ? '#0F172A' : '#FFFFFF' },
                ]}
                placeholder="Search for help"
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* FAQs List */}
            <TouchableOpacity
              style={styles.faqRow}
              onPress={() =>
                handleFaqPress(
                  'How do I contact RideShare?',
                  'You can contact our support team 24/7 directly through the app, via WhatsApp at +234 800 266 6883, or email at support@rideshare.ng.'
                )
              }
            >
              <Text
                style={[
                  styles.faqRowText,
                  { color: themeMode === 'light' ? '#0F172A' : '#F1F5F9' },
                ]}
              >
                How do I contact RideShare?
              </Text>
              <ChevronRight size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: themeMode === 'light' ? '#E2E8F0' : '#272B35' }]} />

            <TouchableOpacity
              style={styles.faqRow}
              onPress={() =>
                handleFaqPress(
                  'How to request a refund on your booking as a passenger',
                  'If your driver cancels or does not arrive at the safe landmark, you can tap "Cancel / Refund" on your active trip. Funds held in Paystack Escrow are refunded automatically to your bank account.'
                )
              }
            >
              <Text
                style={[
                  styles.faqRowText,
                  { color: themeMode === 'light' ? '#0F172A' : '#F1F5F9' },
                ]}
              >
                How to request a refund on your booking as a passenger
              </Text>
              <ChevronRight size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: themeMode === 'light' ? '#E2E8F0' : '#272B35' }]} />

            <TouchableOpacity
              style={styles.faqRow}
              onPress={() =>
                handleFaqPress(
                  'How to avoid scams & phishing (No Cash Rule)',
                  'NEVER pay drivers in cash or send manual bank transfers outside the app! All payments must go through our Paystack Escrow to keep your money safe until the trip is completed.'
                )
              }
            >
              <Text
                style={[
                  styles.faqRowText,
                  { color: themeMode === 'light' ? '#0F172A' : '#F1F5F9' },
                ]}
              >
                How to avoid scams & phishing
              </Text>
              <ChevronRight size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: themeMode === 'light' ? '#E2E8F0' : '#272B35' }]} />

            <TouchableOpacity
              style={styles.faqRow}
              onPress={() =>
                handleFaqPress(
                  'Bank account verification with Paystack',
                  'Drivers must link their verified Nigerian 10-digit NUBAN bank account with BVN/NIN match to receive automated 24-hour payouts.'
                )
              }
            >
              <Text
                style={[
                  styles.faqRowText,
                  { color: themeMode === 'light' ? '#0F172A' : '#F1F5F9' },
                ]}
              >
                Bank account verification with Paystack
              </Text>
              <ChevronRight size={18} color="#94A3B8" />
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
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE8D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 6,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 24,
  },
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  menuRowText: {
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    height: 1,
  },
  sendActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  sendActionText: {
    fontSize: 16,
    fontWeight: '700',
  },
  faqSearchContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  searchInputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  faqRowText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    paddingRight: 10,
    lineHeight: 20,
  },
});
