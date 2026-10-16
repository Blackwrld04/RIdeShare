import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  ArrowUpDown,
  Calendar,
  Users,
  Search,
  ChevronDown,
  MapPin,
} from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { searchNigerianLocations, type NigerianLandmark } from '../../constants/nigerianLocations';

interface RouteCardProps {
  onSearchPress?: () => void;
  compact?: boolean;
}

export const RouteCard: React.FC<RouteCardProps> = ({ onSearchPress, compact = false }) => {
  const {
    theme,
    themeMode,
    homeState,
    searchOrigin,
    searchDest,
    searchDate,
    searchSeats,
    setSearchOrigin,
    setSearchDest,
    swapRoute,
    setSearchDate,
    setSearchSeats,
  } = useAppStore();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSeatPicker, setShowSeatPicker] = useState(false);
  const [focusedField, setFocusedField] = useState<'from' | 'to' | null>(null);

  const dates = ['Today 14 May', 'Tomorrow 15 May', '16 May', '17 May'];
  const seatOptions = [1, 2, 3, 4];

  const suggestions = useMemo(() => {
    const q = focusedField === 'from' ? searchOrigin : focusedField === 'to' ? searchDest : '';
    return searchNigerianLocations(q, homeState).slice(0, 5);
  }, [focusedField, searchOrigin, searchDest, homeState]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.heroCardBg,
          borderColor: theme.heroCardBorder,
        },
      ]}
    >
      {/* Route Inputs Wrapper */}
      <View style={styles.inputsWrapper}>
        {/* Track Line Indicator */}
        <View style={styles.trackLineContainer}>
          <View style={[styles.originDot, { backgroundColor: theme.pickupDot }]} />
          <View style={styles.verticalDottedLine} />
          <View style={[styles.destRing, { borderColor: theme.dropoffDot }]} />
        </View>

        {/* Inputs Column */}
        <View style={styles.fieldsContainer}>
          {/* From Input */}
          <View style={styles.inputRow}>
            <Text style={[styles.fieldLabel, { color: theme.heroCardSubtext }]}>From</Text>
            <TextInput
              value={searchOrigin}
              onChangeText={setSearchOrigin}
              onFocus={() => setFocusedField('from')}
              placeholder={homeState === 'Osun' ? 'e.g. Olaiya Flyover, Osogbo' : `e.g. Central Terminal, ${homeState}`}
              placeholderTextColor="#9CA3AF"
              style={[styles.textInput, { color: theme.heroCardText }]}
            />
          </View>

          {focusedField === 'from' && suggestions.length > 0 && (
            <View style={[styles.suggestionBox, { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder }]}>
              {suggestions.map((lm) => (
                <TouchableOpacity
                  key={lm.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSearchOrigin(`${lm.name}, ${lm.city}`, { latitude: lm.latitude, longitude: lm.longitude });
                    setFocusedField(null);
                  }}
                  style={styles.suggestionRow}
                >
                  <MapPin size={14} color="#FF6B00" style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.suggestionText, { color: theme.textPrimary }]}>{lm.name}</Text>
                    <Text style={{ fontSize: 11, color: theme.textMuted }}>{lm.city} • {lm.state}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.horizontalDivider} />

          {/* To Input */}
          <View style={styles.inputRow}>
            <Text style={[styles.fieldLabel, { color: theme.heroCardSubtext }]}>To</Text>
            <TextInput
              value={searchDest}
              onChangeText={setSearchDest}
              onFocus={() => setFocusedField('to')}
              placeholder={homeState === 'Osun' ? 'e.g. Mayfair Roundabout, Ile-Ife' : `e.g. Major Hub, ${homeState}`}
              placeholderTextColor="#9CA3AF"
              style={[styles.textInput, { color: theme.heroCardText }]}
            />
          </View>

          {focusedField === 'to' && suggestions.length > 0 && (
            <View style={[styles.suggestionBox, { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder }]}>
              {suggestions.map((lm) => (
                <TouchableOpacity
                  key={lm.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSearchDest(`${lm.name}, ${lm.city}`, { latitude: lm.latitude, longitude: lm.longitude });
                    setFocusedField(null);
                  }}
                  style={styles.suggestionRow}
                >
                  <MapPin size={14} color="#38BDF8" style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.suggestionText, { color: theme.textPrimary }]}>{lm.name}</Text>
                    <Text style={{ fontSize: 11, color: theme.textMuted }}>{lm.city} • {lm.state}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Circular Swap Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={swapRoute}
          style={[styles.swapButton, { backgroundColor: theme.heroCardButton }]}
        >
          <ArrowUpDown size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Date & Passenger Selectors Row */}
      <View style={styles.selectorsRow}>
        {/* Date Selector */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowDatePicker(!showDatePicker)}
          style={styles.selectorItem}
        >
          <Calendar size={16} color="#6B7280" />
          <View style={styles.selectorTextCol}>
            <Text style={[styles.selectorLabel, { color: theme.heroCardSubtext }]}>Date</Text>
            <Text style={[styles.selectorValue, { color: theme.heroCardText }]}>
              {searchDate}
            </Text>
          </View>
          <ChevronDown size={14} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.verticalDivider} />

        {/* Passengers Selector */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowSeatPicker(!showSeatPicker)}
          style={styles.selectorItem}
        >
          <Users size={16} color="#6B7280" />
          <View style={styles.selectorTextCol}>
            <Text style={[styles.selectorLabel, { color: theme.heroCardSubtext }]}>
              Passengers
            </Text>
            <Text style={[styles.selectorValue, { color: theme.heroCardText }]}>
              {searchSeats} {searchSeats === 1 ? 'passenger' : 'passengers'}
            </Text>
          </View>
          <ChevronDown size={14} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Expandable Date Picker Chips */}
      {showDatePicker && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.inlineChipsScroll}
        >
          {dates.map((d) => {
            const isSelected = searchDate === d;
            return (
              <TouchableOpacity
                key={d}
                onPress={() => {
                  setSearchDate(d);
                  setShowDatePicker(false);
                }}
                style={[
                  styles.inlineChip,
                  {
                    backgroundColor: isSelected ? theme.heroCardButton : '#F3F4F6',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.inlineChipText,
                    { color: isSelected ? '#FFFFFF' : '#374151' },
                  ]}
                >
                  {d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Expandable Seat Options */}
      {showSeatPicker && (
        <View style={styles.inlineSeatRow}>
          {seatOptions.map((s) => {
            const isSelected = searchSeats === s;
            return (
              <TouchableOpacity
                key={s}
                onPress={() => {
                  setSearchSeats(s);
                  setShowSeatPicker(false);
                }}
                style={[
                  styles.inlineSeatChip,
                  {
                    backgroundColor: isSelected ? theme.heroCardButton : '#F3F4F6',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.inlineChipText,
                    { color: isSelected ? '#FFFFFF' : '#374151' },
                  ]}
                >
                  {s} {s === 1 ? 'Seat' : 'Seats'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Search Primary Action Button */}
      {onSearchPress && (
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onSearchPress}
          style={[styles.searchButton, { backgroundColor: theme.heroCardButton }]}
        >
          <Text style={[styles.searchButtonText, { color: theme.heroCardButtonText }]}>
            Search
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  inputsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  trackLineContainer: {
    alignItems: 'center',
    width: 20,
    marginRight: 10,
    paddingVertical: 8,
  },
  originDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  verticalDottedLine: {
    width: 1.5,
    height: 36,
    backgroundColor: '#D1D5DB',
    marginVertical: 4,
  },
  destRing: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2.5,
    backgroundColor: 'transparent',
  },
  fieldsContainer: {
    flex: 1,
    paddingRight: 48,
  },
  inputRow: {
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  textInput: {
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 2,
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  suggestionBox: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  swapButton: {
    position: 'absolute',
    right: 0,
    top: '32%',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  selectorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  selectorItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorTextCol: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  selectorValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  verticalDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  inlineChipsScroll: {
    marginTop: 12,
    flexDirection: 'row',
  },
  inlineChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    marginRight: 8,
  },
  inlineChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inlineSeatRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  inlineSeatChip: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 16,
  },
  searchButton: {
    marginTop: 20,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
