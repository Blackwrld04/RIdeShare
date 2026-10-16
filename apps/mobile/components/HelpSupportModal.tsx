import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  MessageSquare,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  Search,
  ShieldCheck,
  Send,
  Phone,
  CreditCard,
  AlertTriangle,
  Lock,
  FileText,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../store/useAppStore';
import { CommunityGuideModal } from './CommunityGuideModal';
import { TermsModal } from './TermsModal';
import { DataProtectionModal } from './DataProtectionModal';

interface HelpSupportModalProps {
  visible: boolean;
  onClose: () => void;
}

interface FaqItem {
  id: string;
  question: string;
  category: string;
  summary: string;
  details: string[];
  actionLabel?: string;
  onAction?: () => void;
}

export function HelpSupportModal({ visible, onClose }: HelpSupportModalProps) {
  const insets = useSafeAreaInsets();
  const { themeMode, user } = useAppStore();
  const isLight = themeMode === 'light';

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Sub-modal states
  const [isCommunityGuideOpen, setIsCommunityGuideOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isDataProtectionOpen, setIsDataProtectionOpen] = useState(false);

  const displayName = user?.displayName?.split(' ')[0] || 'Commuter';

  const handleOpenWhatsApp = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const phone = '2349152486135';
    const message = encodeURIComponent(
      `Hello RideShare Support, I am reaching out from the mobile app regarding my account (${user?.displayName || 'Commuter'}). I need assistance.`
    );
    const whatsappUrl = `https://wa.me/${phone}?text=${message}`;

    Linking.openURL(whatsappUrl).catch(() => {
      Linking.openURL(`https://api.whatsapp.com/send?phone=${phone}&text=${message}`).catch(() => {
        Alert.alert(
          'WhatsApp Support',
          'Our verified support desk is available on WhatsApp at: 09152486135'
        );
      });
    });
  };

  const handleNavigateMessages = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onClose();
    router.push('/(tabs)/chat');
  };

  const handleToggleFaq = (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setExpandedFaqId((curr) => (curr === id ? null : id));
  };

  const faqs: FaqItem[] = [
    {
      id: 'faq-contact',
      question: 'How do I contact RideShare?',
      category: 'Support',
      summary: '24/7 dedicated support via WhatsApp, in-app messaging, and email.',
      details: [
        'WhatsApp Official Desk: Message our dedicated Nigerian support line directly on 09152486135. We respond within minutes.',
        'In-App Messages: Tap "Messages" in the menu above or the bottom tab bar to contact drivers, passengers, and operations staff.',
        'Email Support: Send queries to support@rideshare.ng for booking receipts and dispute claims.',
        'Emergency SOS: If an urgent safety situation arises on any active trip, tap the red SOS button to alert Nigerian emergency services (112) and your saved emergency contacts.',
      ],
      actionLabel: 'Chat on WhatsApp (09152486135)',
      onAction: handleOpenWhatsApp,
    },
    {
      id: 'faq-refund',
      question: 'How to request a refund on your booking as a passenger',
      category: 'Billing & Escrow',
      summary: 'Automatic 100% refund through Paystack Escrow if driver cancels or is a no-show.',
      details: [
        'Paystack Escrow Protection: Your fare contribution is never paid directly to the driver upfront. It is securely held in Paystack escrow until the journey safely concludes.',
        'Driver No-Show or Cancellation: If the driver cancels or fails to arrive at the agreed landmark within the 30-minute traffic grace window, your booking is automatically refunded 100%.',
        'Passenger Voluntary Cancellation: You can cancel free of charge up to 60 minutes before departure from the "Trips" tab.',
        'Refund Timeline: Refunds are routed through Paystack back to your originating bank card or NUBAN account within 24 to 48 hours.',
      ],
      actionLabel: 'Report Trip for Refund',
      onAction: handleOpenWhatsApp,
    },
    {
      id: 'faq-scams',
      question: 'How to avoid scams & phishing',
      category: 'Safety',
      summary: 'Strict "No-Cash Rule" and in-app departure code verification.',
      details: [
        'Strict No-Cash Rule: NEVER pay cash to any driver or agree to make direct private bank transfers outside the app. Offline payments forfeit all Paystack escrow protections and insurance coverage.',
        'Never Share Passwords or OTPs: RideShare staff will NEVER ask you for your login password, 6-digit email OTP, bank PIN, or BVN.',
        'Match Car & Plate Before Boarding: Always check that the vehicle make, model, color, and license plate match the driver profile shown in your app.',
        'Confirm the 4-Digit Code: Exchange your 4-digit departure code upon boarding to activate live GPS trip safety tracking.',
      ],
    },
    {
      id: 'faq-paystack',
      question: 'Bank account verification with Paystack',
      category: 'Drivers & Payouts',
      summary: 'Automated 10-digit NUBAN account lookup and 24-hour payouts.',
      details: [
        'Automated NUBAN Verification: To receive payouts, drivers add their 10-digit Nigerian bank account number in Profile > Payout & Bank Account. Paystack verifies the account name in real time.',
        'Name Matching Requirement: The name on your Nigerian bank account must correspond to your verified NIMC identity and driver profile.',
        'All Commercial Banks & Fintechs Supported: We support Access, GTBank, Zenith, UBA, FirstBank, Kuda, PalmPay, OPay, Moniepoint, and all CBN-licensed institutions.',
        'Daily Payout Schedule: Earnings from completed carpools are credited to your bank account within 24 hours of passenger drop-off confirmation.',
      ],
    },
  ];

  const filteredFaqs = faqs.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
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
              <X size={24} color={isLight ? '#0F172A' : '#FFFFFF'} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 40 }}
          >
            {/* Greeting */}
            <Text
              style={[
                styles.greetingText,
                { color: isLight ? '#475569' : '#94A3B8' },
              ]}
            >
              Hi {displayName} 👋
            </Text>
            <Text
              style={[
                styles.titleText,
                { color: isLight ? '#0F172A' : '#FFFFFF' },
              ]}
            >
              How can we help?
            </Text>

            {/* Quick Menu Card */}
            <View
              style={[
                styles.menuCard,
                {
                  backgroundColor: isLight ? '#F8FAFC' : '#181A20',
                  borderColor: isLight ? '#E2E8F0' : '#272B35',
                },
              ]}
            >
              {/* Option 1: Messages -> leads to Messages page */}
              <TouchableOpacity
                style={styles.menuRow}
                onPress={handleNavigateMessages}
                activeOpacity={0.7}
              >
                <View style={styles.menuRowLeft}>
                  <View style={[styles.menuIconBadge, { backgroundColor: 'rgba(37, 99, 235, 0.12)' }]}>
                    <MessageSquare size={18} color="#2563EB" />
                  </View>
                  <Text
                    style={[
                      styles.menuRowText,
                      { color: isLight ? '#0F172A' : '#FFFFFF' },
                    ]}
                  >
                    Messages
                  </Text>
                </View>
                <ChevronRight size={18} color="#94A3B8" />
              </TouchableOpacity>

              <View
                style={[
                  styles.divider,
                  { backgroundColor: isLight ? '#E2E8F0' : '#272B35' },
                ]}
              />

              {/* Option 2: Help & Community Guide -> opens full CommunityGuideModal */}
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => setIsCommunityGuideOpen(true)}
                activeOpacity={0.7}
              >
                <View style={styles.menuRowLeft}>
                  <View style={[styles.menuIconBadge, { backgroundColor: 'rgba(224, 107, 38, 0.12)' }]}>
                    <HelpCircle size={18} color="#E06B26" />
                  </View>
                  <Text
                    style={[
                      styles.menuRowText,
                      { color: isLight ? '#0F172A' : '#FFFFFF' },
                    ]}
                  >
                    Help & Community Guide
                  </Text>
                </View>
                <ChevronRight size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Send us a message button card -> leads to WhatsApp 09152486135 */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenWhatsApp}
              style={[
                styles.sendActionCard,
                {
                  backgroundColor: isLight ? '#FFFFFF' : '#181A20',
                  borderColor: isLight ? '#E2E8F0' : '#272B35',
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.sendIconWrap, { backgroundColor: '#16A34A' }]}>
                  <Send size={18} color="#FFFFFF" />
                </View>
                <View>
                  <Text
                    style={[
                      styles.sendActionText,
                      { color: isLight ? '#0F172A' : '#FFFFFF' },
                    ]}
                  >
                    Send us a message
                  </Text>
                  <Text
                    style={[
                      styles.sendActionSub,
                      { color: isLight ? '#64748B' : '#94A3B8' },
                    ]}
                  >
                    WhatsApp Support • 09152486135
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color="#94A3B8" />
            </TouchableOpacity>

            {/* Search Help Articles */}
            <View
              style={[
                styles.faqSearchContainer,
                {
                  backgroundColor: isLight ? '#F8FAFC' : '#181A20',
                  borderColor: isLight ? '#E2E8F0' : '#272B35',
                },
              ]}
            >
              <View
                style={[
                  styles.searchInputPill,
                  {
                    backgroundColor: isLight ? '#EEF2F6' : '#222630',
                  },
                ]}
              >
                <Search size={18} color="#94A3B8" />
                <TextInput
                  style={[
                    styles.searchInput,
                    { color: isLight ? '#0F172A' : '#FFFFFF' },
                  ]}
                  placeholder="Search questions or topics"
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {/* FAQs List with In-Depth Answers */}
              {filteredFaqs.map((faq, index) => {
                const isExpanded = expandedFaqId === faq.id;
                return (
                  <View key={faq.id}>
                    {index > 0 && (
                      <View
                        style={[
                          styles.divider,
                          { backgroundColor: isLight ? '#E2E8F0' : '#272B35' },
                        ]}
                      />
                    )}

                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.faqRow}
                      onPress={() => handleToggleFaq(faq.id)}
                    >
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text
                          style={[
                            styles.faqRowText,
                            {
                              color: isExpanded
                                ? '#E06B26'
                                : isLight
                                ? '#0F172A'
                                : '#F1F5F9',
                              fontWeight: isExpanded ? '800' : '600',
                            },
                          ]}
                        >
                          {faq.question}
                        </Text>
                        {!isExpanded && (
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.faqSummaryText,
                              { color: isLight ? '#64748B' : '#94A3B8' },
                            ]}
                          >
                            {faq.summary}
                          </Text>
                        )}
                      </View>
                      {isExpanded ? (
                        <ChevronDown size={18} color="#E06B26" />
                      ) : (
                        <ChevronRight size={18} color="#94A3B8" />
                      )}
                    </TouchableOpacity>

                    {/* Expanded Detail Box */}
                    {isExpanded && (
                      <View
                        style={[
                          styles.expandedFaqBox,
                          {
                            backgroundColor: isLight ? '#F1F5F9' : '#12141A',
                            borderColor: isLight ? '#E2E8F0' : '#1E2330',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.expandedSummary,
                            { color: isLight ? '#0F172A' : '#FFFFFF' },
                          ]}
                        >
                          {faq.summary}
                        </Text>

                        <View style={styles.expandedDetailsList}>
                          {faq.details.map((point, pIndex) => (
                            <View key={pIndex} style={styles.detailPointRow}>
                              <CheckCircle2 size={15} color="#10B981" style={{ marginTop: 2 }} />
                              <Text
                                style={[
                                  styles.detailPointText,
                                  { color: isLight ? '#334155' : '#CBD5E1' },
                                ]}
                              >
                                {point}
                              </Text>
                            </View>
                          ))}
                        </View>

                        {faq.actionLabel && faq.onAction && (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={faq.onAction}
                            style={styles.faqActionButton}
                          >
                            <Text style={styles.faqActionButtonText}>
                              {faq.actionLabel}
                            </Text>
                            <ExternalLink size={14} color="#FFFFFF" />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Quick Links: Terms & Conditions and Data Protection */}
            <View style={styles.legalLinksCard}>
              <TouchableOpacity
                onPress={() => setIsTermsOpen(true)}
                style={styles.legalLinkBtn}
              >
                <FileText size={16} color="#94A3B8" />
                <Text style={styles.legalLinkText}>Terms and Conditions</Text>
              </TouchableOpacity>

              <Text style={{ color: '#64748B' }}>•</Text>

              <TouchableOpacity
                onPress={() => setIsDataProtectionOpen(true)}
                style={styles.legalLinkBtn}
              >
                <ShieldCheck size={16} color="#94A3B8" />
                <Text style={styles.legalLinkText}>Data Protection Policy</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Sub Modals */}
      <CommunityGuideModal
        visible={isCommunityGuideOpen}
        onClose={() => setIsCommunityGuideOpen(false)}
      />
      <TermsModal
        visible={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
      />
      <DataProtectionModal
        visible={isDataProtectionOpen}
        onClose={() => setIsDataProtectionOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 122, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    padding: 6,
  },
  greetingText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 20,
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
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuRowText: {
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  sendActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  sendIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendActionText: {
    fontSize: 15,
    fontWeight: '800',
  },
  sendActionSub: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  faqSearchContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  searchInputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  faqRowText: {
    fontSize: 14,
    lineHeight: 20,
  },
  faqSummaryText: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  expandedFaqBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  expandedSummary: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  expandedDetailsList: {
    gap: 10,
  },
  detailPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  detailPointText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  faqActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 4,
  },
  faqActionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  legalLinksCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  legalLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legalLinkText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
