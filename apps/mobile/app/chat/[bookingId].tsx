import React, { useState } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Phone,
  Plus,
  Send,
  ShieldAlert,
  Star,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/useAppStore';
import type { ChatMessage } from '../../types';

export default function ChatScreen() {
  const { bookingId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme, themeMode, activeTrip } = useAppStore();

  const driver = activeTrip?.ride || {
    driverName: 'Olajide Abdulquadri',
    driverRating: 4.98,
    vehicle: { model: 'Toyota Corolla', registrationNumber: 'LAG-492-AA' },
  };

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      bookingId: String(bookingId),
      senderId: 'driver-1',
      senderName: driver.driverName,
      body: 'Hello! I am waiting near the Oando station exit in Berger. Are you close?',
      isSelf: false,
      createdAt: '11:59 AM',
      read: true,
    },
    {
      id: 'm2',
      bookingId: String(bookingId),
      senderId: 'usr-101',
      senderName: 'You',
      body: 'Yes, I just arrived at the pedestrian bridge. Walking towards the fuel station now.',
      isSelf: true,
      createdAt: '12:01 PM',
      read: true,
    },
    {
      id: 'm3',
      bookingId: String(bookingId),
      senderId: 'driver-1',
      senderName: driver.driverName,
      body: 'Great! My hazard lights are blinking on the Silver Corolla (LAG-492-AA). Take your time.',
      isSelf: false,
      createdAt: '12:02 PM',
      read: true,
    },
  ]);

  const quickChips = [
    'At the meeting spot',
    'Arriving in 2 mins',
    'Traffic at bridge',
    'Hazard lights spotted',
  ];

  // PRD 5.4 CHAT-02: Anti-Scam Filter
  const forbiddenPhrases = [
    'send to my account',
    'pay cash',
    'transfer to my opay',
    'transfer to my palm',
    'cancel and pay me direct',
    'outside the app',
  ];

  const handleSendMessage = (textToSend?: string) => {
    const content = textToSend || inputText.trim();
    if (!content) return;

    // Check anti-scam violations
    const lower = content.toLowerCase();
    const hasViolation = forbiddenPhrases.some((phrase) => lower.includes(phrase));
    if (hasViolation) {
      Alert.alert(
        '⚠️ Anti-Scam Policy Notice',
        'CommuteShare strictly requires 100% cashless Paystack escrow. Paying cash or transferring outside the app voids passenger safety insurance and is prohibited.',
      );
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      bookingId: String(bookingId),
      senderId: 'usr-101',
      senderName: 'You',
      body: content,
      isSelf: true,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      {/* Header (Sample Screen 1 Top Right) */}
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

        <View style={styles.driverHeaderCol}>
          <Text style={[styles.driverNameHeader, { color: theme.textPrimary }]}>
            {driver.driverName}
          </Text>
          <Text style={[styles.driverStatusHeader, { color: theme.textMuted }]}>
            ★ {driver.driverRating} • Top rated driver
          </Text>
        </View>

        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.messagesScroll}
      >
        <View style={styles.dateStamp}>
          <Text style={[styles.dateStampText, { color: theme.textMuted }]}>
            Today at 11:59 AM
          </Text>
        </View>

        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageRow,
              msg.isSelf ? styles.selfRow : styles.otherRow,
            ]}
          >
            <View
              style={[
                styles.bubble,
                msg.isSelf
                  ? [
                      styles.selfBubble,
                      {
                        backgroundColor: themeMode === 'light' ? '#111827' : '#FF7A00',
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
              <Text
                style={[
                  styles.messageText,
                  {
                    color: msg.isSelf
                      ? '#FFFFFF'
                      : theme.textPrimary,
                  },
                ]}
              >
                {msg.body}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  {
                    color: msg.isSelf ? 'rgba(255, 255, 255, 0.7)' : theme.textMuted,
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
      <View style={[styles.quickChipsBar, { backgroundColor: theme.surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

      {/* Chat Input Bar (Sample Screen 1 Top Right) */}
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
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.attachButton, { backgroundColor: theme.surfaceSecondary }]}
        >
          <Plus size={20} color={theme.textPrimary} />
        </TouchableOpacity>

        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor={theme.textMuted}
          style={[
            styles.chatInput,
            {
              backgroundColor: theme.surfaceInput,
              color: theme.textPrimary,
            },
          ]}
        />

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleSendMessage()}
          style={styles.sendButton}
        >
          <Send size={16} color="#FFFFFF" />
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverHeaderCol: {
    alignItems: 'center',
  },
  driverNameHeader: {
    fontSize: 16,
    fontWeight: '800',
  },
  driverStatusHeader: {
    fontSize: 11,
    marginTop: 1,
  },
  headerRight: {
    width: 38,
  },
  messagesScroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  dateStamp: {
    alignItems: 'center',
    marginBottom: 16,
  },
  dateStampText: {
    fontSize: 11,
    fontWeight: '500',
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  selfRow: {
    justifyContent: 'flex-end',
  },
  otherRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  selfBubble: {
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  quickChipsBar: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  quickChipPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 11,
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
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF7A00',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
