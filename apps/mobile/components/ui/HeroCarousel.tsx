import React, { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { ArrowRight, CheckCheck, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';

const slides = [
  {
    id: 'hero-1',
    tag: 'Highway Commute',
    title: 'Safe corridor lifts',
    subtitle: 'Berger to Lekki in one predictable fare — no surge surprises.',
    accent: '70% cheaper',
    icon: ShieldCheck,
  },
  {
    id: 'hero-2',
    tag: 'Women-first rides',
    title: 'Verified female-only rides',
    subtitle: 'Comfort-focused trips with NIN checks and trusted routes.',
    accent: 'Women-only',
    icon: Sparkles,
  },
  {
    id: 'hero-3',
    tag: 'Cost cap guarantee',
    title: 'No illegal markups',
    subtitle: 'System-protected pricing keeps corridors fair and transparent.',
    accent: 'PRD capped',
    icon: CheckCheck,
  },
];

export const HeroCarousel: React.FC = () => {
  const { theme } = useAppStore();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeSlide = useMemo(() => slides[activeIndex], [activeIndex]);
  const ActiveIcon = activeSlide.icon;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    const firstVisible = viewableItems[0]?.index;
    if (firstVisible !== null && firstVisible !== undefined) {
      setActiveIndex(firstVisible);
    }
  }).current;

  return (
    <View style={styles.wrapper}>
      <FlatList
        ref={flatListRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={slides}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity activeOpacity={0.9} style={[styles.card, { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder }]}>
              <View style={styles.upperRow}>
                <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
                  <Text style={[styles.badgeText, { color: theme.primary }]}>{item.tag}</Text>
                </View>
                <View style={styles.iconWrap}>
                  <Icon size={18} color={theme.primary} />
                </View>
              </View>

              <Text style={[styles.title, { color: theme.textPrimary }]}>{item.title}</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{item.subtitle}</Text>

              <View style={styles.ctaRow}>
                <Text style={[styles.accentText, { color: theme.textPrimary }]}>{item.accent}</Text>
                <ArrowRight size={16} color={theme.textPrimary} />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.dotsRow}>
        {slides.map((slide, index) => (
          <TouchableOpacity
            key={slide.id}
            onPress={() => flatListRef.current?.scrollToIndex({ index, animated: true })}
            style={[
              styles.dot,
              {
                backgroundColor: index === activeIndex ? theme.primary : theme.surfaceSecondary,
                borderColor: index === activeIndex ? theme.primary : theme.surfaceBorder,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 8,
    marginBottom: 10,
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    width: 300,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  upperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF3E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
  },
  ctaRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accentText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
});
