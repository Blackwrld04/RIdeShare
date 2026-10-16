import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { HeaderGradient } from '../../components/ui/HeaderGradient';
import { RouteCard } from '../../components/ui/RouteCard';
import { RideCard } from '../../components/ui/RideCard';
import { getCorridorsForState, type NigerianCorridor } from '../../constants/theme';

export default function HomeScreen() {
  const {
    theme,
    themeMode,
    user,
    rides,
    homeState,
    activeTrip,
    setSearchOrigin,
    setSearchDest,
  } = useAppStore();

  const corridors = React.useMemo(() => getCorridorsForState(homeState), [homeState]);

  const handleCorridorSelect = (corridor: NigerianCorridor) => {
    setSearchOrigin(corridor.from);
    setSearchDest(corridor.to);
    router.push('/(tabs)/search');
  };

  const displayName = user?.displayName?.split(' ')[0] || 'Alex';

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header with Brand Logo and Greeting */}
        <HeaderGradient
          title={`Hello, ${displayName}! 👋`}
          subtitle="Travel where you want in good company. Spend smarter."
        >
          {/* Hero High-Contrast Route Search Card */}
          <View style={styles.routeCardWrapper}>
            <RouteCard onSearchPress={() => router.push('/(tabs)/search')} />
          </View>
        </HeaderGradient>

        {/* Best Rides Section (Screen 1 Inspiration) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Best Rides in {homeState}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
              <Text style={[styles.seeAllText, { color: theme.textSecondary }]}>
                See all
              </Text>
            </TouchableOpacity>
          </View>

          {/* Horizontal Best Rides Carousel */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ridesHorizontalScroll}
          >
            {rides.map((ride) => (
              <View key={ride.id} style={styles.horizontalCardWrapper}>
                <RideCard
                  ride={ride}
                  onPress={() => router.push(`/rides/${ride.id}`)}
                />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* High-Volume Nigerian Corridors */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithBadge}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                {homeState} Popular Corridors
              </Text>
              <View style={[styles.costCapBadge, { backgroundColor: theme.pillTagBg }]}>
                <Text style={[styles.costCapText, { color: theme.pillTagText }]}>
                  70% Cheaper
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
              <Text style={[styles.seeAllText, { color: theme.textSecondary }]}>
                See all
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.corridorsList}>
            {corridors.map((c) => (
              <TouchableOpacity
                key={c.id}
                activeOpacity={0.8}
                onPress={() => handleCorridorSelect(c)}
                style={[
                  styles.corridorItem,
                  {
                    backgroundColor: theme.surfaceCard,
                    borderColor: theme.surfaceBorder,
                  },
                ]}
              >
                <View style={styles.corridorMain}>
                  <View style={styles.corridorRouteRow}>
                    <Text
                      numberOfLines={1}
                      style={[styles.corridorCity, { color: theme.textPrimary }]}
                    >
                      {c.from.split(',')[0]}
                    </Text>
                    <ArrowRight
                      size={14}
                      color={themeMode === 'light' ? '#4B5563' : '#9CA3AF'}
                      style={{ marginHorizontal: 8 }}
                    />
                    <Text
                      numberOfLines={1}
                      style={[styles.corridorCity, { color: theme.textSecondary }]}
                    >
                      {c.to.split(',')[0]}
                    </Text>
                  </View>
                  <Text style={[styles.corridorMeta, { color: theme.textMuted }]}>
                    {c.distanceKm} km • Safe Hubs
                  </Text>
                </View>

                <View style={styles.corridorPriceBox}>
                  <Text style={[styles.corridorPrice, { color: theme.textPrimary }]}>
                    {c.priceNaira}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  routeCardWrapper: {
    marginTop: 4,
  },
  activeTripCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  activeTripHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeTripLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  activeTripMeta: {
    fontSize: 11,
    fontWeight: '800',
  },
  activeTripRoute: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  activeTripDriver: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  costCapBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  costCapText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ridesHorizontalScroll: {
    gap: 14,
    paddingRight: 20,
  },
  horizontalCardWrapper: {
    width: width * 0.82,
  },
  corridorsList: {
    gap: 10,
  },
  corridorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  corridorMain: {
    flex: 1,
  },
  corridorRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  corridorCity: {
    fontSize: 14,
    fontWeight: '700',
  },
  corridorMeta: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  corridorPriceBox: {
    paddingLeft: 12,
  },
  corridorPrice: {
    fontSize: 16,
    fontWeight: '800',
  },
});
