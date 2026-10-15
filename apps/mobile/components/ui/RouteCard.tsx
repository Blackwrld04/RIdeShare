import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import {
  ArrowUpDown,
  Calendar,
  Users,
  Search,
  ChevronDown,
} from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';

interface RouteCardProps {
  onSearchPress?: () => void;
  compact?: boolean;
}

export const RouteCard: React.FC<RouteCardProps> = ({ onSearchPress, compact = false }) => {
  const {
    theme,
    themeMode,
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

  const dates = ['Today 14 May', 'Tomorrow 15 May', '16 May', '17 May'];
  const seatOptions = [1, 2, 3, 4];

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
              placeholder="e.g. Berger Bus Stop, Lagos"
              placeholderTextColor="#9CA3AF"
              style={[styles.textInput, { color: theme.heroCardText }]}
            />
          </View>

          <View style={styles.horizontalDivider} />

          {/* To Input */}
          <View style={styles.inputRow}>
            <Text style={[styles.fieldLabel, { color: theme.heroCardSubtext }]}>To</Text>
            <TextInput
              value={searchDest}
              onChangeText={setSearchDest}
              placeholder="e.g. Victoria Island, Lagos"
              placeholderTextColor="#9CA3AF"
              style={[styles.textInput, { color: theme.heroCardText }]}
            />
          </View>
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
