import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Phone,
  Send,
  ShieldCheck,
  Star,
  Car,
  KeyRound,
  MapPin,
  AlertTriangle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/useAppStore';
import { chatPipeline, type ChatConversation } from '../../services/chatService';
import type { ChatMessage } from '../../types';

export default function ChatScreen() {
  const { bookingId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme, themeMode, user, bookings, activeTrip } = useAppStore();
  const scrollViewRef = useRef<ScrollView>(null);

  const [thread, setThread] = useState<ChatConversation | null>(() => {
    return chatPipeline.getThread(String(bookingId));
  });
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    const id = String(bookingId);
    let currentThread = chatPipeline.getThread(id);

    // If not found, check if it belongs to an active booking or trip
    if (!currentThread) {
      const matchedBooking = bookings.find((b) => b.id === id) || (activeTrip?.id === id ? activeTrip : null);
      if (matchedBooking) {
        currentThread = chatPipeline.ensureThreadForBooking(matchedBooking);
      }
    }

    if (currentThread) {
      setThread(currentThread);
      chatPipeline.markAsRead(id);
    }

    // Subscribe to chat pipeline updates
    const unsubscribe = chatPipeline.subscribe(() => {
      const updated = chatPipeline.getThread(id);
      if (updated) {
        setThread({ ...updated });
        chatPipeline.markAsRead(id);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [bookingId, bookings, activeTrip]);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [thread?.messages.length]);

  const handleCallDriver = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const phone = thread?.driverPhone || '+2349152486135';
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Driver Phone', `Driver contact number: ${phone}`);
    });
  };

  const quickChips = [
    'At the meeting spot',
    'Arriving in 2 mins',
    'What is the departure code?',
    'Hazard lights spotted',
    'Do you have trunk space for luggage?',
  ];

  // PRD 5.4 CHAT-02: Anti-Scam Filter
  const forbiddenPhrases = [
    'send to my account',
    'pay cash',
    'transfer to my opay',
    'transfer to my palm',
    'cancel and pay me direct',
    'outside the app',
    'pay direct',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const content = textToSend || inputText.trim();
    if (!content) return;

    // Check anti-scam violations
    const lower = content.toLowerCase();
    const hasViolation = forbiddenPhrases.some((phrase) => lower.includes(phrase));
    if (hasViolation) {
      Alert.alert(
        '⚠️ Anti-Scam Policy Notice',
        'RideShare strictly requires 100% cashless Paystack escrow. Paying cash or transferring outside the app voids passenger safety insurance and is prohibited.',
      );
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    setInputText('');
    const id = String(bookingId);
    await chatPipeline.sendMessage(id, content, user?.displayName || 'You');
  };

  const currentDriverName = thread?.driverName || 'Verified Driver';
  const currentDriverAvatar =
    thread?.driverAvatar ||
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80';
  const currentRating = thread?.driverRating || 4.95;
  const currentVehicle = thread?.vehicleModel || 'Verified Carpool Vehicle';
  const currentPlate = thread?.vehiclePlate || 'LAG-101-RS';
  const currentRoute = thread?.route || 'Corridor Route';
  const currentLandmark = thread?.pickupLandmark || 'Designated Landmark';
  const currentCode = thread?.departureCode || '4812';
  const messagesList = thread?.messages || [];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      {/* Header with Particular Driver Details */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 16) + 6,
            backgroundColor: theme.surface,
            borderBottomColor: theme.surfaceBorder,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: theme.surfaceSecondary }]}
        >
          <ChevronLeft size={20} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={styles.driverAvatarWrap}>
          <Image source={{ uri: currentDriverAvatar }} style={styles.headerAvatar} />
          <View style={styles.headerVerifiedBadge}>
            <ShieldCheck size={9} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.driverHeaderCol}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text numberOfLines={1} style={[styles.driverNameHeader, { color: theme.textPrimary }]}>
              {currentDriverName}
            </Text>
            <View style={styles.ratingBadge}>
              <Star size={10} color="#FF7A00" fill="#FF7A00" />
              <Text style={styles.ratingBadgeText}>{currentRating.toFixed(2)}</Text>
            </View>
          </View>
          <Text numberOfLines={1} style={[styles.driverStatusHeader, { color: theme.textMuted }]}>
            {currentVehicle} • {currentPlate}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleCallDriver}
          style={[styles.phoneButton, { backgroundColor: 'rgba(255, 122, 0, 0.12)' }]}
        >
          <Phone size={18} color="#FF7A00" />
        </TouchableOpacity>
      </View>

      {/* Security & Corridor Verification Banner */}
      <View style={[styles.securityBanner, { backgroundColor: themeMode === 'light' ? '#EFF6FF' : '#1E2330', borderColor: theme.surfaceBorder }]}>
        <View style={styles.securityBannerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}>
            <MapPin size={14} color="#2563EB" />
            <Text numberOfLines={1} style={[styles.securityLandmarkText, { color: theme.textPrimary }]}>
              {currentLandmark}
            </Text>
          </View>
          <View style={styles.codePill}>
            <KeyRound size={12} color="#10B981" />
            <Text style={styles.codePillLabel}>PIN:</Text>
            <Text style={styles.codePillValue}>{currentCode}</Text>
          </View>
        </View>
        <Text style={[styles.securityHint, { color: theme.textMuted }]}>
          Share PIN with driver only after confirming vehicle ({currentPlate}) at the landmark.
        </Text>
      </View>

      {/* Messages Scroll View */}
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.messagesScroll}
      >
        <View style={styles.dateStamp}>
          <Text style={[styles.dateStampText, { color: theme.textMuted }]}>
            Corridor Trip • {currentRoute}
          </Text>
        </View>

        {messagesList.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageRow,
              msg.isSelf ? styles.selfRow : styles.otherRow,
            ]}
          >
            {!msg.isSelf && (
              <Image source={{ uri: currentDriverAvatar }} style={styles.messageSenderAvatar} />
            )}
            <View
              style={[
                styles.bubble,
                msg.isSelf
                  ? [
                      styles.selfBubble,
                      {
                        backgroundColor: '#FF7A00',
                      },
                    ]
                  : [
                      styles.otherBubble,
                      {
                        backgroundColor: theme.surfaceCard,
                        borderColor: theme.surfaceBorder,
                      },
                    ],
              ]}
            >
              {!msg.isSelf && (
                <Text style={styles.bubbleSenderName}>{currentDriverName}</Text>
              )}
              <Text
                style={[
                  styles.messageText,
                  {
                    color: msg.isSelf ? '#FFFFFF' : theme.textPrimary,
                  },
                ]}
              >
                {msg.body}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  {
                    color: msg.isSelf ? 'rgba(255, 255, 255, 0.75)' : theme.textMuted,
                  },
                ]}
              >
                {msg.createdAt}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Quick Response Transit Chips */}
      <View style={[styles.quickChipsBar, { backgroundColor: theme.surface, borderTopColor: theme.surfaceBorder }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}>
          {quickChips.map((chip, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => handleSendMessage(chip)}
              activeOpacity={0.7}
              style={[
                styles.quickChipPill,
                {
                  backgroundColor: theme.surfaceSecondary,
                  borderColor: theme.surfaceBorder,
                },
              ]}
            >
              <Text style={[styles.quickChipText, { color: theme.textSecondary }]}>
                {chip}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Chat Input Bar */}
      <View
        style={[
          styles.inputContainer,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: theme.surface,
            borderTopColor: theme.surfaceBorder,
          },
        ]}
      >
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder={`Message ${currentDriverName.split(' ')[0]}...`}
          placeholderTextColor={theme.textMuted}
          style={[
            styles.textInput,
            {
              backgroundColor: theme.surfaceCard,
              color: theme.textPrimary,
              borderColor: theme.surfaceBorder,
            },
          ]}
          multiline
          maxLength={500}
        />

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleSendMessage()}
          style={[
            styles.sendButton,
            {
              backgroundColor: inputText.trim() ? '#FF7A00' : theme.surfaceSecondary,
            },
          ]}
          disabled={!inputText.trim()}
        >
          <Send
            size={18}
            color={inputText.trim() ? '#FFFFFF' : theme.textMuted}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarWrap: {
    position: 'relative',
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  headerVerifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverHeaderCol: {
    flex: 1,
  },
  driverNameHeader: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 122, 0, 0.1)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    gap: 2,
  },
  ratingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF7A00',
  },
  driverStatusHeader: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  phoneButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityBanner: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  securityBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  securityLandmarkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  codePillLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  codePillValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 1,
  },
  securityHint: {
    fontSize: 10,
    marginTop: 3,
  },
  messagesScroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  dateStamp: {
    alignItems: 'center',
    marginBottom: 16,
  },
  dateStampText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    gap: 8,
  },
  selfRow: {
    justifyContent: 'flex-end',
  },
  otherRow: {
    justifyContent: 'flex-start',
  },
  messageSenderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  selfBubble: {
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  bubbleSenderName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF7A00',
    marginBottom: 3,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  quickChipsBar: {
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  quickChipPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  textInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    borderRadius: 21,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
