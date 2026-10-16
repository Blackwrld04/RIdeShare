import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MapPin,
  Search,
  X,
  Compass,
  Building2,
  GraduationCap,
  Store,
  Navigation,
  ChevronDown,
  CheckCircle2,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  searchNigerianLocations,
  NIGERIAN_STATES,
  type NigerianLandmark,
} from '../constants/nigerianLocations';
import { type Landmark } from '../constants/landmarks';
import { useAppStore } from '../store/useAppStore';

interface LocationPickerModalProps {
  visible: boolean;
  type: 'From' | 'To';
  currentValue?: string;
  onSelect: (landmark: Landmark) => void;
  onClose: () => void;
}

export function LocationPickerModal({
  visible,
  type,
  currentValue = '',
  onSelect,
  onClose,
}: LocationPickerModalProps) {
  const insets = useSafeAreaInsets();
  const { theme, themeMode, homeState } = useAppStore();
  const [query, setQuery] = useState(currentValue);

  // Default to the user's home state (e.g., Lagos, Rivers, FCT Abuja)
  const [activeState, setActiveState] = useState(homeState || 'Lagos');
  const [isStateSearchOpen, setIsStateSearchOpen] = useState(false);
  const [stateFilterQuery, setStateFilterQuery] = useState('');

  // Keep activeState in sync if user's home state changes in profile
  useEffect(() => {
    if (homeState) {
      setActiveState(homeState);
    }
  }, [homeState]);

  // Land marks filtered by query and active state
  // When query is empty -> shows landmarks only in activeState
  // When query is non-empty -> searches across Nigeria, prioritizing activeState
  const filteredLandmarks = useMemo(() => {
    return searchNigerianLocations(query, activeState === 'ALL' ? undefined : activeState);
  }, [query, activeState]);

  const isLight = themeMode === 'light';

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'CAMPUS':
        return <GraduationCap size={18} color="#8B5CF6" />;
      case 'SHOPPING_MALL':
      case 'MARKET':
        return <Store size={18} color="#F59E0B" />;
      case 'TRANSIT_HUB':
        return <Navigation size={18} color="#10B981" />;
      case 'JUNCTION':
        return <Compass size={18} color="#38BDF8" />;
      default:
        return <Building2 size={18} color="#10B981" />;
    }
  };

  // Filtered states for the quick state search dialog
  const matchingStates = useMemo(() => {
    const q = stateFilterQuery.trim().toLowerCase();
    if (!q) {
      // Suggest popular hubs first instead of dumping 37 states
      return NIGERIAN_STATES.filter((s) =>
        ['Lagos', 'FCT Abuja', 'Rivers', 'Oyo', 'Kano', 'Enugu', 'Delta', 'Anambra', 'Edo', 'Kaduna'].includes(s.name)
      );
    }
    return NIGERIAN_STATES.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.capital.toLowerCase().includes(q) ||
        s.majorCities.some((c) => c.toLowerCase().includes(q))
    );
  }, [stateFilterQuery]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: isLight ? '#FFFFFF' : '#0E1015',
            paddingTop: Math.max(insets.top, 16) + 10,
          },
        ]}
      >
        {/* Top Header Bar */}
        <View style={styles.headerRow}>
          <View>
            <Text
              style={[
                styles.headerTitle,
                { color: isLight ? '#0F172A' : '#FFFFFF' },
              ]}
            >
              Select {type} Location
            </Text>
            <Text style={[styles.headerSubtitle, { color: isLight ? '#64748B' : '#94A3B8' }]}>
              {activeState === 'ALL'
                ? 'Searching across all Nigerian states'
                : `Prioritizing ${activeState} landmarks & corridors`}
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.closeBtn}>
            <Text style={[styles.closeText, { color: isLight ? '#0F172A' : '#94A3B8' }]}>
              Close
            </Text>
          </TouchableOpacity>
        </View>

        {/* Spacious Search Input Pill */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: isLight ? '#F1F5F9' : '#14161C',
              borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)',
            },
          ]}
        >
          <MapPin
            size={22}
            color={type === 'From' ? '#10B981' : '#38BDF8'}
            style={styles.pinIcon}
          />
          <TextInput
            style={[
              styles.textInput,
              { color: isLight ? '#0F172A' : '#FFFFFF' },
            ]}
            placeholder={
              type === 'From'
                ? `Search bus stop, area, or terminal in ${activeState}...`
                : `Search destination landmark across Nigeria...`
            }
            placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="words"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && Platform.OS !== 'ios' && (
            <TouchableOpacity onPress={() => setQuery('')} style={{ padding: 6 }}>
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Active Region Pill & Searchable State Selector Trigger */}
        <View style={styles.activeRegionRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setIsStateSearchOpen(true);
            }}
            style={[
              styles.regionFilterPill,
              {
                backgroundColor: isLight ? '#F8FAFC' : '#1A1D26',
                borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)',
              },
            ]}
          >
            <View style={styles.regionIconDot}>
              <MapPin size={12} color="#10B981" />
            </View>
            <Text
              style={[
                styles.regionFilterText,
                { color: isLight ? '#0F172A' : '#FFFFFF' },
              ]}
            >
              Region: <Text style={{ fontWeight: '800', color: '#10B981' }}>{activeState === 'ALL' ? 'All Nigeria' : activeState}</Text>
            </Text>
            <ChevronDown size={16} color={isLight ? '#64748B' : '#94A3B8'} />
          </TouchableOpacity>

          {activeState !== 'ALL' && (
            <TouchableOpacity
              onPress={() => setActiveState('ALL')}
              style={[
                styles.allNigeriaBtn,
                {
                  backgroundColor: isLight ? '#F1F5F9' : '#1E222B',
                },
              ]}
            >
              <Text style={[styles.allNigeriaText, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                Search All States
              </Text>
            </TouchableOpacity>
          )}

          {activeState === 'ALL' && homeState && (
            <TouchableOpacity
              onPress={() => setActiveState(homeState)}
              style={[
                styles.allNigeriaBtn,
                {
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                },
              ]}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981' }}>
                Reset to {homeState}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Results List */}
        <FlatList
          data={filteredLandmarks}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 30 }}
          ItemSeparatorComponent={() => (
            <View
              style={[
                styles.separator,
                { backgroundColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)' },
              ]}
            />
          )}
          renderItem={({ item }) => {
            const isLocal = item.state.toLowerCase() === (homeState || 'lagos').toLowerCase();
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  onSelect(item);
                  onClose();
                }}
                style={styles.itemRow}
              >
                <View
                  style={[
                    styles.categoryIconWrap,
                    {
                      backgroundColor: isLight ? '#F1F5F9' : '#1A1C23',
                      borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.06)',
                    },
                  ]}
                >
                  {getCategoryIcon(item.category)}
                </View>
                <View style={styles.itemTextContainer}>
                  <View style={styles.itemNameRow}>
                    <Text
                      style={[
                        styles.itemName,
                        { color: isLight ? '#0F172A' : '#F8FAFC' },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <View
                      style={[
                        styles.stateBadge,
                        {
                          backgroundColor: isLocal
                            ? 'rgba(16, 185, 129, 0.12)'
                            : isLight
                            ? '#EFF6FF'
                            : '#1E293B',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.stateBadgeText,
                          {
                            color: isLocal ? '#10B981' : isLight ? '#2563EB' : '#38BDF8',
                          },
                        ]}
                      >
                        {isLocal ? `📍 ${item.state}` : `🚗 ${item.state}`}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.itemAddress,
                      { color: isLight ? '#64748B' : '#94A3B8' },
                    ]}
                    numberOfLines={1}
                  >
                    {item.address} • {item.city}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Search size={40} color={isLight ? '#CBD5E1' : '#475569'} />
              <Text style={[styles.emptyText, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                No landmarks found for "{query}".
              </Text>
              <Text style={[styles.emptySubtext, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                You can search any destination across all 36 states (e.g. Berger, Lekki, Wuse, Iwo Road, Gwarinpa, Waterlines) or switch regions using the button above.
              </Text>
            </View>
          )}
        />

        {/* Searchable State Switcher Modal (No 37-state dump) */}
        <Modal
          visible={isStateSearchOpen}
          animationType="fade"
          transparent
          onRequestClose={() => setIsStateSearchOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: isLight ? '#FFFFFF' : '#14161C',
                  borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)',
                },
              ]}
            >
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                  Filter Landmarks by State
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsStateSearchOpen(false);
                    setStateFilterQuery('');
                  }}
                  style={{ padding: 4 }}
                >
                  <X size={20} color={isLight ? '#64748B' : '#94A3B8'} />
                </TouchableOpacity>
              </View>

              {/* State search input inside modal */}
              <View
                style={[
                  styles.stateModalSearchBox,
                  {
                    backgroundColor: isLight ? '#F8FAFC' : '#1A1D26',
                    borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)',
                  },
                ]}
              >
                <Search size={18} color={isLight ? '#64748B' : '#94A3B8'} style={{ marginRight: 8 }} />
                <TextInput
                  style={[
                    styles.stateModalSearchInput,
                    { color: isLight ? '#0F172A' : '#FFFFFF' },
                  ]}
                  placeholder="Type state (e.g., Abuja, Rivers, Kano)..."
                  placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                  value={stateFilterQuery}
                  onChangeText={setStateFilterQuery}
                  autoFocus
                  clearButtonMode="while-editing"
                />
              </View>

              {/* Matching states list */}
              <ScrollView
                style={{ maxHeight: 280 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Option: All Nigeria */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    setActiveState('ALL');
                    setIsStateSearchOpen(false);
                    setStateFilterQuery('');
                  }}
                  style={[
                    styles.stateSelectRow,
                    {
                      backgroundColor:
                        activeState === 'ALL'
                          ? isLight
                            ? '#ECFDF5'
                            : '#12251D'
                          : 'transparent',
                    },
                  ]}
                >
                  <MapPin size={18} color="#10B981" style={{ marginRight: 10 }} />
                  <Text
                    style={[
                      styles.stateSelectText,
                      { color: isLight ? '#0F172A' : '#FFFFFF' },
                    ]}
                  >
                    All Nigeria (Interstate)
                  </Text>
                  {activeState === 'ALL' && <CheckCircle2 size={18} color="#10B981" />}
                </TouchableOpacity>

                {matchingStates.map((stateItem) => {
                  const isSelected = activeState === stateItem.name;
                  return (
                    <TouchableOpacity
                      key={stateItem.name}
                      activeOpacity={0.75}
                      onPress={() => {
                        setActiveState(stateItem.name);
                        setIsStateSearchOpen(false);
                        setStateFilterQuery('');
                      }}
                      style={[
                        styles.stateSelectRow,
                        {
                          backgroundColor: isSelected
                            ? isLight
                              ? '#ECFDF5'
                              : '#12251D'
                            : 'transparent',
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 20, marginRight: 10 }}>📍</Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.stateSelectText,
                            { color: isLight ? '#0F172A' : '#FFFFFF' },
                          ]}
                        >
                          {stateItem.name} {stateItem.name === 'FCT Abuja' ? '' : 'State'}
                        </Text>
                        <Text style={[styles.stateSelectSub, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                          Capital: {stateItem.capital}
                        </Text>
                      </View>
                      {isSelected && <CheckCircle2 size={18} color="#10B981" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 58,
    marginBottom: 12,
  },
  pinIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  activeRegionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  regionFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  regionIconDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  regionFilterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  allNigeriaBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  allNigeriaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  categoryIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  stateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  stateBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  itemAddress: {
    fontSize: 13,
    marginTop: 3,
  },
  separator: {
    height: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  stateModalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  stateModalSearchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  stateSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  stateSelectText: {
    fontSize: 15,
    fontWeight: '700',
  },
  stateSelectSub: {
    fontSize: 12,
    marginTop: 1,
  },
});
