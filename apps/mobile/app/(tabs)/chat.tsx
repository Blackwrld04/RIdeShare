import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageSquare, ShieldCheck, ChevronRight, Search, Star, Car } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../../components/ui/Card';
import { chatPipeline, type ChatConversation } from '../../services/chatService';

export default function ChatListScreen() {
  const insets = useSafeAreaInsets();
  const { theme, themeMode, bookings } = useAppStore();
  const [conversations, setConversations] = useState<ChatConversation[]>(chatPipeline.getConversations());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Sync any confirmed bookings into chat threads
    if (bookings && bookings.length > 0) {
      bookings.forEach((b) => {
        chatPipeline.ensureThreadForBooking(b);
      });
    }

    // Subscribe to reactive chat pipeline updates
    const unsubscribe = chatPipeline.subscribe((updated) => {
      setConversations(updated);
    });

    return () => {
      unsubscribe();
    };
  }, [bookings]);

  const filtered = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.driverName.toLowerCase().includes(q) ||
      c.route.toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q)
    );
  });

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

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
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              Trip Messages
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              Particular direct communication for confirmed corridor rides
            </Text>
          </View>
          {totalUnread > 0 && (
            <View style={styles.totalUnreadBadge}>
              <Text style={styles.totalUnreadText}>{totalUnread} new</Text>
            </View>
          )}
        </View>

        {/* Search Input */}
        <View style={[styles.searchBox, { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder }]}>
          <Search size={16} color={theme.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search driver, route, or message..."
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.textPrimary }]}
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.surfaceCard }]}>
              <MessageSquare size={32} color={theme.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Messages Found</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
              Confirmed trip communications will appear here with live driver updates.
            </Text>
          </View>
        ) : (
          filtered.map((chat) => (
            <TouchableOpacity
              key={chat.bookingId}
              activeOpacity={0.8}
              onPress={() => router.push(`/chat/${chat.bookingId}`)}
            >
              <Card style={styles.chatCard}>
                <View style={styles.chatRow}>
                  <View style={styles.avatarWrap}>
                    <Image source={{ uri: chat.driverAvatar }} style={styles.avatar} />
                    <View style={styles.verifiedDot}>
                      <ShieldCheck size={10} color="#FFFFFF" />
                    </View>
                  </View>

                  <View style={styles.chatCol}>
                    <View style={styles.chatTopLine}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <Text numberOfLines={1} style={[styles.driverName, { color: theme.textPrimary }]}>
                          {chat.driverName}
                        </Text>
                        <View style={styles.ratingPill}>
                          <Star size={10} color="#FF7A00" fill="#FF7A00" />
                          <Text style={styles.ratingText}>{chat.driverRating.toFixed(2)}</Text>
                        </View>
                      </View>
                      <Text style={[styles.chatTime, { color: theme.textMuted }]}>
                        {chat.time}
                      </Text>
                    </View>

                    <Text numberOfLines={1} style={[styles.routeText, { color: theme.primary }]}>
                      {chat.route}
                    </Text>

                    <View style={styles.vehicleRow}>
                      <Car size={11} color={theme.textMuted} style={{ marginRight: 4 }} />
                      <Text numberOfLines={1} style={[styles.vehicleText, { color: theme.textMuted }]}>
                        {chat.vehicleModel} • {chat.vehiclePlate}
                      </Text>
                    </View>

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.lastMessageText,
                        {
                          color: (chat.unreadCount || 0) > 0 ? theme.textPrimary : theme.textMuted,
                          fontWeight: (chat.unreadCount || 0) > 0 ? '700' : '400',
                        },
                      ]}
                    >
                      {chat.lastMessage}
                    </Text>
                  </View>

                  {(chat.unreadCount || 0) > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{chat.unreadCount}</Text>
                    </View>
                  ) : (
                    <ChevronRight size={16} color={theme.textMuted} />
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          ))
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  totalUnreadBadge: {
    backgroundColor: '#FF7A00',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  totalUnreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 10,
  },
  chatCard: {
    padding: 14,
    borderRadius: 16,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  verifiedDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatCol: {
    flex: 1,
  },
  chatTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '700',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 122, 0, 0.1)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF7A00',
  },
  chatTime: {
    fontSize: 11,
  },
  routeText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  vehicleText: {
    fontSize: 11,
  },
  lastMessageText: {
    fontSize: 13,
    lineHeight: 17,
  },
  unreadBadge: {
    backgroundColor: '#FF7A00',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
