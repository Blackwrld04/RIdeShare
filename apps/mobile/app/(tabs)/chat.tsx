import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageSquare, ShieldCheck, ChevronRight } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../../components/ui/Card';

export default function ChatListScreen() {
  const insets = useSafeAreaInsets();
  const { theme, themeMode, bookings } = useAppStore();

  const conversations = [
    {
      bookingId: 'book-901',
      driverName: 'Olajide Abdulquadri',
      driverAvatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      lastMessage: 'Yes, I am waiting near the Oando station exit. Safe trip!',
      time: '06:18 AM',
      unreadCount: 1,
      route: 'Berger ➔ Lekki Phase 1',
    },
    {
      bookingId: 'book-902',
      driverName: 'Fatima Sanusi',
      driverAvatar:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      lastMessage: 'Pickup at Ikorodu BRT confirmed for tomorrow 7am.',
      time: 'Yesterday',
      unreadCount: 0,
      route: 'Ikorodu ➔ CMS / Marina',
    },
  ];

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
          Trip Messages
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          Direct driver communication for confirmed corridor rides
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {conversations.map((chat) => (
          <TouchableOpacity
            key={chat.bookingId}
            activeOpacity={0.8}
            onPress={() => router.push(`/chat/${chat.bookingId}`)}
          >
            <Card style={styles.chatCard}>
              <View style={styles.chatRow}>
                <Image source={{ uri: chat.driverAvatar }} style={styles.avatar} />
                <View style={styles.chatCol}>
                  <View style={styles.chatTopLine}>
                    <Text style={[styles.driverName, { color: theme.textPrimary }]}>
                      {chat.driverName}
                    </Text>
                    <Text style={[styles.chatTime, { color: theme.textMuted }]}>
                      {chat.time}
                    </Text>
                  </View>

                  <Text
                    numberOfLines={1}
                    style={[styles.routeText, { color: theme.primary }]}
                  >
                    {chat.route}
                  </Text>

                  <Text
                    numberOfLines={1}
                    style={[
                      styles.lastMessageText,
                      {
                        color: chat.unreadCount > 0 ? theme.textPrimary : theme.textMuted,
                        fontWeight: chat.unreadCount > 0 ? '700' : '400',
                      },
                    ]}
                  >
                    {chat.lastMessage}
                  </Text>
                </View>

                {chat.unreadCount > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{chat.unreadCount}</Text>
                  </View>
                ) : (
                  <ChevronRight size={16} color={theme.textMuted} />
                )}
              </View>
            </Card>
          </TouchableOpacity>
        ))}
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
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 10,
  },
  chatCard: {
    padding: 14,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  chatCol: {
    flex: 1,
  },
  chatTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverName: {
    fontSize: 14,
    fontWeight: '700',
  },
  chatTime: {
    fontSize: 11,
  },
  routeText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  lastMessageText: {
    fontSize: 12,
    marginTop: 3,
  },
  unreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF7A00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
