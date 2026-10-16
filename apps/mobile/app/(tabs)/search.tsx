import React, { useMemo, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  SlidersHorizontal,
  TrendingDown,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/useAppStore';
import { RideCard } from '../../components/ui/RideCard';
import { ALL_DEMO_RIDES, getRidesForState } from '../../constants/demoData';
import type { RideOffer } from '../../types';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const {
    theme,
    themeMode,
    rides,
    homeState,
    searchOrigin,
    searchDest,
    setSearchOrigin,
    setSearchDest,
    fetchRides,
  } = useAppStore();

  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Cheapest' | 'Fastest' | 'Women-only' | 'Top Drivers'>('All');

  // Ensure store has rides on mount
  useEffect(() => {
    fetchRides();
  }, []);

  // Filtered & sorted rides combining backend database rides and all corridor rides
  const displayRides = useMemo(() => {
    const map = new Map<string, RideOffer>();
    // 1. Add all Nigerian corridor demo rides
    ALL_DEMO_RIDES.forEach((r) => map.set(r.id, r));
    // 2. Add region-specific rides
    const regional = getRidesForState(homeState);
    regional.forEach((r) => map.set(r.id, r));
    // 3. Add database / store rides
    (rides || []).forEach((r) => map.set(r.id, r));

    const allRides = Array.from(map.values());
    let list = [...allRides];

    // Route search prioritization
    const fromKey = searchOrigin ? searchOrigin.split(',')[0].trim().toLowerCase() : '';
    const toKey = searchDest ? searchDest.split(',')[0].trim().toLowerCase() : '';

    if (fromKey || toKey) {
      const matched = list.filter((r) => {
        const matchOrigin = !fromKey || r.originTitle.toLowerCase().includes(fromKey) || r.originLandmark.toLowerCase().includes(fromKey);
        const matchDest = !toKey || r.destTitle.toLowerCase().includes(toKey) || r.destLandmark.toLowerCase().includes(toKey);
        return matchOrigin || matchDest;
      });

      const unmatched = list.filter((r) => !matched.some((m) => m.id === r.id));
      list = [...matched, ...unmatched];
    }

    // Apply sort / filter
    if (selectedFilter === 'Cheapest') {
      list.sort((a, b) => a.contributionKobo - b.contributionKobo);
    } else if (selectedFilter === 'Fastest') {
      list.sort((a, b) => {
        const aMin = new Date(a.estimatedArrival).getTime() - new Date(a.departureTime).getTime();
        const bMin = new Date(b.estimatedArrival).getTime() - new Date(b.departureTime).getTime();
        return aMin - bMin;
      });
    } else if (selectedFilter === 'Women-only') {
      const womenOnly = list.filter((r) => r.isFemaleOnly);
      list = womenOnly.length > 0 ? womenOnly : list;
    } else if (selectedFilter === 'Top Drivers') {
      const top = list.filter((r) => r.driverRating >= 4.90);
      list = top.length > 0 ? top : list;
    }

    return list;
  }, [rides, selectedFilter, searchOrigin, searchDest, homeState]);

  const isLight = themeMode === 'light';

  // Extract clean short route summary
  const routeSummary = useMemo(() => {
    if (searchOrigin && searchDest) {
      const from = searchOrigin.split(',')[0].trim();
      const to = searchDest.split(',')[0].trim();
      return `${from} → ${to}`;
    }
    return 'All Highway Corridors';
  }, [searchOrigin, searchDest]);

  const handleClearRouteFilter = () => {
    setSearchOrigin('');
    setSearchDest('');
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 16) + 4,
            backgroundColor: theme.background,
            borderBottomColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)',
          },
        ]}
      >
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
            <ChevronLeft size={22} color={theme.textPrimary} />
          </TouchableOpacity>

          <View style={styles.navTitleBox}>
            <Text style={[styles.navTitle, { color: theme.textPrimary }]}>
              Available Rides
            </Text>
            <Text numberOfLines={1} style={[styles.navSubtitle, { color: theme.textMuted }]}>
              {routeSummary}
            </Text>
          </View>

          {Boolean(searchOrigin || searchDest) ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                handleClearRouteFilter();
              }}
              style={[
                styles.navButton,
                {
                  backgroundColor: theme.surfaceCard,
                  borderColor: theme.surfaceBorder,
                },
              ]}
            >
              <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>All</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* Filter Chips Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(['All', 'Cheapest', 'Fastest', 'Women-only', 'Top Drivers'] as const).map((option) => {
            const selected = selectedFilter === option;
            return (
              <TouchableOpacity
                key={option}
                activeOpacity={0.8}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  setSelectedFilter(option);
                }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selected ? theme.chipActiveBg : theme.surfaceCard,
                    borderColor: selected ? theme.chipActiveBg : theme.surfaceBorder,
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
        </ScrollView>
      </View>

      {/* Main Content: List of Available Drives & Corridor Rides */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 90 },
        ]}
      >
        {/* Cost Protection Banner */}
        <View
          style={[
            styles.costCapBanner,
            {
              backgroundColor: theme.surfaceCard,
              borderColor: theme.surfaceBorder,
            },
          ]}
        >
          <TrendingDown size={18} color="#10B981" style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.costCapTitle, { color: theme.textPrimary }]}>
              RideShare Cost-Protection Active
            </Text>
            <Text style={[styles.costCapSub, { color: theme.textMuted }]}>
              Fares are capped to prevent surge pricing. Tap any ride to view seats and route details.
            </Text>
          </View>
        </View>

        {/* Results Counter */}
        <View style={styles.resultsHeaderRow}>
          <Text style={[styles.resultsCount, { color: theme.textPrimary }]}>
            {displayRides.length} {displayRides.length === 1 ? 'ride' : 'rides'} available
          </Text>
        </View>

        {/* Rides Feed */}
        <View style={styles.ridesList}>
          {displayRides.map((ride) => (
            <View key={ride.id} style={styles.rideCardOuterWrap}>
              <RideCard
                ride={ride}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  router.push(`/rides/${ride.id}`);
                }}
              />
            </View>
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
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitleBox: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  navSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  filterScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  costCapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  costCapTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  costCapSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultsCount: {
    fontSize: 16,
    fontWeight: '800',
  },
  resultsMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  ridesList: {
    gap: 12,
  },
  rideCardOuterWrap: {
    marginBottom: 4,
  },
});
