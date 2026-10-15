import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  SlidersHorizontal,
} from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { RideCard } from '../../components/ui/RideCard';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { theme, rides, searchOrigin, searchDest } = useAppStore();

  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState<'Cheapest' | 'Fastest' | 'Women-only'>('Cheapest');

  const calendarDays = [
    { day: 'TUE', date: '16' },
    { day: 'WED', date: '17' },
    { day: 'THU', date: '18' },
    { day: 'FRI', date: '19' },
    { day: 'SAT', date: '20' },
    { day: 'SUN', date: '21' },
  ];

  const filteredRides = useMemo(() => {
    const sorted = [...rides];

    if (selectedFilter === 'Cheapest') {
      sorted.sort((a, b) => a.contributionKobo - b.contributionKobo);
    }

    if (selectedFilter === 'Fastest') {
      sorted.sort((a, b) => {
        const aMinutes = new Date(a.estimatedArrival).getTime() - new Date(a.departureTime).getTime();
        const bMinutes = new Date(b.estimatedArrival).getTime() - new Date(b.departureTime).getTime();
        return aMinutes - bMinutes;
      });
    }

    if (selectedFilter === 'Women-only') {
      return sorted.filter((ride) => ride.isFemaleOnly);
    }

    return sorted;
  }, [rides, selectedFilter]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 16) + 6,
            backgroundColor: theme.background,
          },
        ]}
      >
        {/* Navigation Bar */}
        <View style={styles.navRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.back()}
            style={[
              styles.navButton,
              {
                backgroundColor: theme.surfaceCard,
                borderColor: theme.surfaceBorder,
              },
            ]}
          >
            <ChevronLeft size={20} color={theme.textPrimary} />
          </TouchableOpacity>

          <Text style={[styles.navTitle, { color: theme.textPrimary }]}>
            Ride Overview
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.navButton,
              {
                backgroundColor: theme.surfaceCard,
                borderColor: theme.surfaceBorder,
              },
            ]}
          >
            <SlidersHorizontal size={18} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Date Subtitle */}
        <Text style={[styles.dateSubtitle, { color: theme.textSecondary }]}>
          Tue, 16 June 2026
        </Text>

        {/* Horizontal Calendar Date Strip (Screen 3 Reference) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.calendarScroll}
        >
          {calendarDays.map((item, index) => {
            const isSelected = selectedDateIndex === index;
            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.75}
                onPress={() => setSelectedDateIndex(index)}
                style={[
                  styles.calendarPill,
                  {
                    backgroundColor: isSelected ? theme.chipActiveBg : theme.surfaceCard,
                    borderColor: theme.surfaceBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    {
                      color: isSelected ? theme.chipActiveText : theme.textMuted,
                      fontWeight: isSelected ? '800' : '600',
                    },
                  ]}
                >
                  {item.day}
                </Text>
                <Text
                  style={[
                    styles.dateNumberText,
                    {
                      color: isSelected ? theme.chipActiveText : theme.textPrimary,
                      fontWeight: '800',
                    },
                  ]}
                >
                  {item.date}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Ride Results Feed */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.filterRow}>
          {(['Cheapest', 'Fastest', 'Women-only'] as const).map((option) => {
            const selected = selectedFilter === option;
            return (
              <TouchableOpacity
                key={option}
                activeOpacity={0.8}
                onPress={() => setSelectedFilter(option)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selected ? theme.chipActiveBg : theme.surfaceCard,
                    borderColor: theme.surfaceBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: selected ? theme.chipActiveText : theme.textSecondary },
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.resultsHeaderRow}>
          <Text style={[styles.resultsCount, { color: theme.textPrimary }]}>
            {filteredRides.length} rides available
          </Text>
          <TouchableOpacity>
            <Text style={[styles.seeAllText, { color: theme.textSecondary }]}>
              See all
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ridesList}>
          {filteredRides.map((ride, index) => (
            <RideCard
              key={ride.id}
              ride={ride}
              onPress={() => router.push(`/rides/${ride.id}`)}
              tag={index === 0 ? selectedFilter : undefined}
            />
          ))}
        </View>
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
    paddingBottom: 16,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  dateSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 14,
  },
  calendarScroll: {
    gap: 10,
    paddingRight: 20,
  },
  calendarPill: {
    width: 56,
    height: 78,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dayText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  dateNumberText: {
    fontSize: 17,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 110,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 16,
    fontWeight: '800',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ridesList: {
    gap: 4,
  },
});
