import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  ShieldCheck,
  CreditCard,
  Phone,
  Moon,
  Sun,
  Car,
  ChevronRight,
  LogOut,
  UserCheck,
  Building2,
  AlertCircle,
  FileCheck,
  PlusCircle,
  MapPin,
  Search,
  X,
  CheckCircle2,
  Sparkles,
  Star,
  Users,
  HelpCircle,
  Bell,
  Lock,
  ArrowLeftRight,
  FileText,
  Calendar,
  MessageSquare,
  Mail,
  Edit3,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { HelpSupportModal } from '../../components/HelpSupportModal';
import { NIGERIAN_STATES } from '../../constants/nigerianLocations';
import { api } from '../../services/api';

type ProfileTab = 'about' | 'account';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const {
    theme,
    themeMode,
    toggleTheme,
    user,
    setUser,
    homeState,
    setHomeState,
    emergencyContacts,
    logout,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<ProfileTab>('about');
  const [driverMode, setDriverMode] = useState(user?.isDriver || false);

  // Modals state
  const [isChangingState, setIsChangingState] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState('');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isPersonalDetailsOpen, setIsPersonalDetailsOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isRatingsOpen, setIsRatingsOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isTransfersModalOpen, setIsTransfersModalOpen] = useState(false);
  const [isCommunicationOpen, setIsCommunicationOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isPostalModalOpen, setIsPostalModalOpen] = useState(false);
  const [isPaymentsOpen, setIsPaymentsOpen] = useState(false);
  const [isSavedPassengersOpen, setIsSavedPassengersOpen] = useState(false);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);

  // Form states for modals
  const [editName, setEditName] = useState(user?.displayName || 'Olajide Abdulquadri');
  const [editEmail, setEditEmail] = useState(user?.email || 'olajideabdulquadri22@gmail.com');
  const [editPhone, setEditPhone] = useState(user?.phoneE164 || '+234 803 234 5678');
  const [miniBio, setMiniBio] = useState(
    'Daily commuter on the Berger-Lekki expressway corridor. Punctual, friendly and safety-conscious.'
  );

  // Travel preferences
  const [chattiness, setChattiness] = useState('Happy to chat');
  const [musicPref, setMusicPref] = useState('Afrobeats & Radio OK');
  const [acPref, setAcPref] = useState('AC always on');
  const [smokingPref, setSmokingPref] = useState('No smoking allowed');

  // Communication toggles
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);

  // Vehicle form
  const [vehMake, setVehMake] = useState('Toyota');
  const [vehModel, setVehModel] = useState('Corolla');
  const [vehYear, setVehYear] = useState('2018');
  const [vehColor, setVehColor] = useState('Silver Metallic');
  const [vehPlate, setVehPlate] = useState('LAG-492-AA');

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const token = await api.auth.getToken();
        if (token) {
          const profile = await api.profile.get();
          setUser(profile);
          setDriverMode(profile.isDriver);
          if (profile.displayName) setEditName(profile.displayName);
          if (profile.email) setEditEmail(profile.email);
          if (profile.phoneE164) setEditPhone(profile.phoneE164);
        }
      } catch (e) {
        // Fallback to active state
      }
    };
    loadProfileData();
  }, []);

  const currentState = user?.state || homeState || 'Lagos';

  const matchingStates = useMemo(() => {
    const q = stateSearchQuery.trim().toLowerCase();
    if (!q) {
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
  }, [stateSearchQuery]);

  const handleSelectState = (stateName: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setHomeState(stateName);
    if (user) {
      setUser({ ...user, state: stateName });
    }
    setIsChangingState(false);
    setStateSearchQuery('');
    Alert.alert(
      'Region Updated',
      `Your active corridor region is now set to ${stateName}. All search and landmark suggestions will now prioritize ${stateName}.`
    );
  };

  const handleSavePersonalDetails = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (user) {
      setUser({
        ...user,
        displayName: editName,
        email: editEmail,
        phoneE164: editPhone,
      });
    }
    setIsPersonalDetailsOpen(false);
    Alert.alert('Profile Saved', 'Your personal details have been successfully updated.');
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your RideShare account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch {}
            await logout();
            router.replace('/welcome');
          },
        },
      ]
    );
  };

  // Completeness score
  const completenessSteps = useMemo(() => {
    let count = 0;
    if (user?.avatarUrl || true) count++; // Profile picture
    if (user?.ninVerified || true) count++; // NIN ID
    if (editEmail) count++; // Email confirmed
    if (editPhone) count++; // Phone confirmed
    if (miniBio) count++; // Mini bio
    if (driverMode || vehPlate) count++; // Vehicle or commuter preferences
    return count;
  }, [user, editEmail, editPhone, miniBio, driverMode, vehPlate]);

  const isLight = themeMode === 'light';

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
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Profile
        </Text>

        {/* 2-Tab Segmented Switch: About you | Account */}
        <View style={styles.topTabBar}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setActiveTab('about');
            }}
            style={[
              styles.topTabBtn,
              activeTab === 'about' && [
                styles.topTabBtnActive,
                { borderBottomColor: theme.primary },
              ],
            ]}
          >
            <Text
              style={[
                styles.topTabText,
                {
                  color: activeTab === 'about' ? theme.primary : theme.textMuted,
                  fontWeight: activeTab === 'about' ? '800' : '600',
                },
              ]}
            >
              About you
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setActiveTab('account');
            }}
            style={[
              styles.topTabBtn,
              activeTab === 'account' && [
                styles.topTabBtnActive,
                { borderBottomColor: theme.primary },
              ],
            ]}
          >
            <Text
              style={[
                styles.topTabText,
                {
                  color: activeTab === 'account' ? theme.primary : theme.textMuted,
                  fontWeight: activeTab === 'account' ? '800' : '600',
                },
              ]}
            >
              Account
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 90 },
        ]}
      >
        {/* ========================================================
            TAB 1: ABOUT YOU
           ======================================================== */}
        {activeTab === 'about' && (
          <View style={styles.tabContentWrap}>
            {/* User Identity Top Row */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsPersonalDetailsOpen(true)}
              style={[
                styles.identityRowCard,
                {
                  backgroundColor: theme.surfaceCard,
                  borderColor: theme.surfaceBorder,
                },
              ]}
            >
              <View style={styles.avatarWrap}>
                {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <View
                    style={[
                      styles.avatarPlaceholder,
                      { backgroundColor: isLight ? '#E2E8F0' : '#1E2330' },
                    ]}
                  >
                    <User size={38} color={theme.textMuted} />
                  </View>
                )}
              </View>

              <View style={styles.identityMeta}>
                <Text style={[styles.identityName, { color: theme.textPrimary }]}>
                  {user?.displayName || 'Olajide'}
                </Text>
                <Text style={[styles.identitySubtitle, { color: theme.textMuted }]}>
                  {driverMode ? 'Ambassador Driver • ★ 4.98' : 'Newcomer • ★ 4.95'}
                </Text>
              </View>

              <ChevronRight size={22} color={theme.textMuted} />
            </TouchableOpacity>

            {/* Complete Your Profile Box */}
            <View
              style={[
                styles.completeProfileBox,
                {
                  backgroundColor: isLight ? '#EFF6FF' : 'rgba(255, 122, 0, 0.08)',
                  borderColor: isLight ? '#BFDBFE' : 'rgba(255, 122, 0, 0.25)',
                },
              ]}
            >
              <Text style={[styles.completeTitle, { color: theme.textPrimary }]}>
                Complete your profile
              </Text>
              <Text style={[styles.completeSub, { color: theme.textMuted }]}>
                This helps build trust, encouraging members to travel with you.
              </Text>

              {/* Progress Count & Segmented Bars */}
              <View style={styles.progressRowBox}>
                <Text style={[styles.progressCounterText, { color: theme.textPrimary }]}>
                  {completenessSteps} out of 6 complete
                </Text>
                <View style={styles.segmentedBarWrap}>
                  {[1, 2, 3, 4, 5, 6].map((step) => {
                    const isDone = step <= completenessSteps;
                    return (
                      <View
                        key={step}
                        style={[
                          styles.segmentBar,
                          {
                            backgroundColor: isDone
                              ? '#10B981'
                              : isLight
                              ? '#CBD5E1'
                              : 'rgba(255, 255, 255, 0.15)',
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  Alert.alert(
                    'Profile Photo',
                    'Choose an option for your verified profile avatar:',
                    [
                      {
                        text: 'Upload New Photo',
                        onPress: () =>
                          Alert.alert('Photo Updated', 'Your profile picture has been refreshed.'),
                      },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }}
              >
                <Text style={[styles.addPhotoLink, { color: theme.primary }]}>
                  Add profile picture
                </Text>
              </TouchableOpacity>
            </View>

            {/* Edit personal details button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsPersonalDetailsOpen(true)}
              style={styles.editPersonalRow}
            >
              <Text style={[styles.editPersonalText, { color: theme.primary }]}>
                Edit personal details
              </Text>
              <ChevronRight size={18} color={theme.primary} />
            </TouchableOpacity>

            <View style={[styles.sectionDivider, { backgroundColor: theme.surfaceBorder }]} />

            {/* Verify your profile Section */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionHeaderTitle, { color: theme.textPrimary }]}>
                Verify your profile
              </Text>

              {/* Verify ID */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  Alert.alert(
                    'National Identity (NIN)',
                    `NIMC Identity Match: VERIFIED\nName: ${user?.displayName || 'Olajide Abdulquadri'}\nNational ID Number: •••• ${user?.ninLast4 || '8821'}\nStatus: Government NIN Match Confirmed.`
                  );
                }}
                style={styles.verificationRow}
              >
                <View style={styles.verifyIconCircle}>
                  <CheckCircle2 size={22} color="#10B981" />
                </View>
                <View style={styles.verifyTextCol}>
                  <Text style={[styles.verifyItemTitle, { color: theme.textPrimary }]}>
                    Verify ID
                  </Text>
                  <Text style={[styles.verifyItemSub, { color: theme.textMuted }]}>
                    NIMC National Identity Number: •••• {user?.ninLast4 || '8821'} (Verified)
                  </Text>
                </View>
                <Badge label="Verified" variant="verified" />
              </TouchableOpacity>

              {/* Confirm email */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  Alert.alert('Email Address', `Confirmed as ${editEmail} for receipts and notifications.`);
                }}
                style={styles.verificationRow}
              >
                <View style={styles.verifyIconCircle}>
                  <CheckCircle2 size={22} color="#10B981" />
                </View>
                <View style={styles.verifyTextCol}>
                  <Text style={[styles.verifyItemTitle, { color: theme.textPrimary }]}>
                    Confirm email
                  </Text>
                  <Text numberOfLines={1} style={[styles.verifyItemSub, { color: theme.textMuted }]}>
                    {editEmail}
                  </Text>
                </View>
                <Badge label="Confirmed" variant="verified" />
              </TouchableOpacity>

              {/* Confirm phone number */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  Alert.alert('Phone Number', `Verified as ${editPhone} via SMS OTP.`);
                }}
                style={styles.verificationRow}
              >
                <View style={styles.verifyIconCircle}>
                  <CheckCircle2 size={22} color="#10B981" />
                </View>
                <View style={styles.verifyTextCol}>
                  <Text style={[styles.verifyItemTitle, { color: theme.textPrimary }]}>
                    Confirm phone number
                  </Text>
                  <Text style={[styles.verifyItemSub, { color: theme.textMuted }]}>
                    {editPhone} (SMS OTP Verified)
                  </Text>
                </View>
                <Badge label="Verified" variant="verified" />
              </TouchableOpacity>
            </View>

            <View style={[styles.sectionDivider, { backgroundColor: theme.surfaceBorder }]} />

            {/* Your carpooling reliability */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionHeaderTitle, { color: theme.textPrimary }]}>
                Your carpooling reliability
              </Text>

              <View
                style={[
                  styles.reliabilityCard,
                  {
                    backgroundColor: theme.surfaceCard,
                    borderColor: theme.surfaceBorder,
                  },
                ]}
              >
                <View style={styles.reliabilityRow}>
                  <Calendar size={22} color="#10B981" style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reliabilityMainText, { color: theme.textPrimary }]}>
                      Never cancels bookings as a passenger
                    </Text>
                    <Text style={[styles.reliabilitySubText, { color: theme.textMuted }]}>
                      100% ride completion rate across Nigerian highway corridors
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={[styles.sectionDivider, { backgroundColor: theme.surfaceBorder }]} />

            {/* About you (Mini Bio & Preferences) */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionHeaderTitle, { color: theme.textPrimary }]}>
                About you
              </Text>

              {/* Add/Edit a mini bio */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsBioModalOpen(true)}
                style={styles.actionPlusRow}
              >
                <View style={styles.plusIconWrap}>
                  <PlusCircle size={22} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionPlusTitle, { color: theme.textPrimary }]}>
                    {miniBio ? 'Edit mini bio' : 'Add a mini bio'}
                  </Text>
                  <Text numberOfLines={2} style={[styles.actionPlusSub, { color: theme.textMuted }]}>
                    {miniBio || 'Tell members about yourself and your typical commute.'}
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.textMuted} />
              </TouchableOpacity>

              {/* Edit travel preferences */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsPreferencesOpen(true)}
                style={styles.actionPlusRow}
              >
                <View style={styles.plusIconWrap}>
                  <PlusCircle size={22} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionPlusTitle, { color: theme.textPrimary }]}>
                    Edit travel preferences
                  </Text>
                  <Text numberOfLines={1} style={[styles.actionPlusSub, { color: theme.textMuted }]}>
                    {chattiness} • {musicPref} • {acPref}
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={[styles.sectionDivider, { backgroundColor: theme.surfaceBorder }]} />

            {/* Vehicles Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderBetween}>
                <Text style={[styles.sectionHeaderTitle, { color: theme.textPrimary }]}>
                  Vehicles
                </Text>
                <Switch
                  value={driverMode}
                  onValueChange={(val) => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    setDriverMode(val);
                    if (user) {
                      setUser({ ...user, isDriver: val });
                    }
                  }}
                  thumbColor={driverMode ? '#FF7A00' : '#E5E7EB'}
                  trackColor={{ false: '#767577', true: '#FFD29D' }}
                />
              </View>

              {driverMode ? (
                <View
                  style={[
                    styles.vehicleCard,
                    {
                      backgroundColor: theme.surfaceCard,
                      borderColor: theme.surfaceBorder,
                    },
                  ]}
                >
                  <View style={styles.vehicleHeaderRow}>
                    <Car size={20} color="#FF7A00" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.vehicleTitle, { color: theme.textPrimary }]}>
                        {vehYear} {vehMake} {vehModel}
                      </Text>
                      <Text style={[styles.vehiclePlate, { color: theme.textMuted }]}>
                        {vehColor} • Plate: {vehPlate}
                      </Text>
                    </View>
                    <Badge label="FRSC Verified" variant="verified" />
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => router.push('/(tabs)/post')}
                    style={[styles.postRideBtn, { backgroundColor: theme.primary }]}
                  >
                    <Text style={styles.postRideBtnText}>Post a Corridor Ride</Text>
                    <ChevronRight size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setIsAddVehicleOpen(true)}
                  style={styles.actionPlusRow}
                >
                  <View style={styles.plusIconWrap}>
                    <PlusCircle size={22} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.actionPlusTitle, { color: theme.textPrimary }]}>
                      Add vehicle
                    </Text>
                    <Text style={[styles.actionPlusSub, { color: theme.textMuted }]}>
                      Enable driver mode to split fuel costs on your daily route.
                    </Text>
                  </View>
                  <ChevronRight size={18} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.sectionDivider, { backgroundColor: theme.surfaceBorder }]} />

            {/* Home State & Corridor Region */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionHeaderTitle, { color: theme.textPrimary }]}>
                Home State & Corridor Region
              </Text>

              <View
                style={[
                  styles.regionCard,
                  {
                    backgroundColor: theme.surfaceCard,
                    borderColor: theme.surfaceBorder,
                  },
                ]}
              >
                <MapPin size={22} color="#10B981" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.regionStateTitle, { color: theme.textPrimary }]}>
                    {currentState} {currentState === 'FCT Abuja' ? '' : 'State'}
                  </Text>
                  <Text style={[styles.regionStateSub, { color: theme.textMuted }]}>
                    Corridors and landmark suggestions prioritize this region
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setIsChangingState(true)}
                  style={[styles.changeRegionBtn, { backgroundColor: isLight ? '#E2E8F0' : '#1F2430' }]}
                >
                  <Text style={[styles.changeRegionBtnText, { color: theme.textPrimary }]}>Change</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ========================================================
            TAB 2: ACCOUNT
           ======================================================== */}
        {activeTab === 'account' && (
          <View style={styles.tabContentWrap}>
            {/* Group 1: Ratings, Saved passengers, Help */}
            <View
              style={[
                styles.accountGroupCard,
                {
                  backgroundColor: theme.surfaceCard,
                  borderColor: theme.surfaceBorder,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsRatingsOpen(true)}
                style={styles.accountRowItem}
              >
                <Text style={[styles.accountRowLabel, { color: theme.textPrimary }]}>
                  Ratings
                </Text>
                <View style={styles.accountRowRight}>
                  <Text style={[styles.accountRowBadge, { color: '#F59E0B' }]}>★ 4.95 (42)</Text>
                  <ChevronRight size={20} color={theme.textMuted} />
                </View>
              </TouchableOpacity>

              <View style={[styles.innerRowDivider, { backgroundColor: theme.surfaceBorder }]} />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsSavedPassengersOpen(true)}
                style={styles.accountRowItem}
              >
                <Text style={[styles.accountRowLabel, { color: theme.textPrimary }]}>
                  Saved passengers
                </Text>
                <ChevronRight size={20} color={theme.textMuted} />
              </TouchableOpacity>

              <View style={[styles.innerRowDivider, { backgroundColor: theme.surfaceBorder }]} />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsHelpOpen(true)}
                style={styles.accountRowItem}
              >
                <Text style={[styles.accountRowLabel, { color: theme.textPrimary }]}>
                  Help
                </Text>
                <ChevronRight size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Group 2: Communication preferences, Password, Postal address */}
            <View
              style={[
                styles.accountGroupCard,
                {
                  backgroundColor: theme.surfaceCard,
                  borderColor: theme.surfaceBorder,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsCommunicationOpen(true)}
                style={styles.accountRowItem}
              >
                <Text style={[styles.accountRowLabel, { color: theme.textPrimary }]}>
                  Communication preferences
                </Text>
                <ChevronRight size={20} color={theme.textMuted} />
              </TouchableOpacity>

              <View style={[styles.innerRowDivider, { backgroundColor: theme.surfaceBorder }]} />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsPasswordModalOpen(true)}
                style={styles.accountRowItem}
              >
                <Text style={[styles.accountRowLabel, { color: theme.textPrimary }]}>
                  Password
                </Text>
                <ChevronRight size={20} color={theme.textMuted} />
              </TouchableOpacity>

              <View style={[styles.innerRowDivider, { backgroundColor: theme.surfaceBorder }]} />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsPostalModalOpen(true)}
                style={styles.accountRowItem}
              >
                <Text style={[styles.accountRowLabel, { color: theme.textPrimary }]}>
                  Postal address
                </Text>
                <ChevronRight size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Group 3: Payout methods, Transfers, Payment methods, Payments & refunds */}
            <View
              style={[
                styles.accountGroupCard,
                {
                  backgroundColor: theme.surfaceCard,
                  borderColor: theme.surfaceBorder,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsPayoutModalOpen(true)}
                style={styles.accountRowItem}
              >
                <Text style={[styles.accountRowLabel, { color: theme.textPrimary }]}>
                  Payout methods
                </Text>
                <View style={styles.accountRowRight}>
                  <Text style={[styles.accountRowBadge, { color: '#10B981' }]}>Guaranty Trust Bank</Text>
                  <ChevronRight size={20} color={theme.textMuted} />
                </View>
              </TouchableOpacity>

              <View style={[styles.innerRowDivider, { backgroundColor: theme.surfaceBorder }]} />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsTransfersModalOpen(true)}
                style={styles.accountRowItem}
              >
                <Text style={[styles.accountRowLabel, { color: theme.textPrimary }]}>
                  Transfers
                </Text>
                <ChevronRight size={20} color={theme.textMuted} />
              </TouchableOpacity>

              <View style={[styles.innerRowDivider, { backgroundColor: theme.surfaceBorder }]} />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  Alert.alert(
                    'Saved Payment Methods',
                    'Paystack Secure Vault\n\nActive Card: •••• 4242 (Mastercard)\nStatus: Tokenized for instant 1-tap ride escrow reservation.'
                  );
                }}
                style={styles.accountRowItem}
              >
                <Text style={[styles.accountRowLabel, { color: theme.textPrimary }]}>
                  Payment methods
                </Text>
                <View style={styles.accountRowRight}>
                  <Text style={[styles.accountRowBadge, { color: theme.textMuted }]}>•••• 4242</Text>
                  <ChevronRight size={20} color={theme.textMuted} />
                </View>
              </TouchableOpacity>

              <View style={[styles.innerRowDivider, { backgroundColor: theme.surfaceBorder }]} />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsPaymentsOpen(true)}
                style={styles.accountRowItem}
              >
                <Text style={[styles.accountRowLabel, { color: theme.textPrimary }]}>
                  Payments & refunds
                </Text>
                <ChevronRight size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Group 4: Terms & Data Protection */}
            <View
              style={[
                styles.accountGroupCard,
                {
                  backgroundColor: theme.surfaceCard,
                  borderColor: theme.surfaceBorder,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  Alert.alert(
                    'Terms & Conditions',
                    'RideShare operates in compliance with Nigerian Federal and State carpooling regulations. Contributions are strictly for shared fuel split and vehicle operational costs without commercial passenger surcharge.'
                  );
                }}
                style={styles.accountRowItem}
              >
                <Text style={[styles.accountRowLabel, { color: theme.textPrimary }]}>
                  Terms and Conditions
                </Text>
                <ChevronRight size={20} color={theme.textMuted} />
              </TouchableOpacity>

              <View style={[styles.innerRowDivider, { backgroundColor: theme.surfaceBorder }]} />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  Alert.alert(
                    'Data Protection & Privacy',
                    'RideShare adheres to the Nigeria Data Protection Act (NDPA) and NDPR guidelines. Your national identity numbers and contact details are encrypted and never disclosed to unauthorized third parties.'
                  );
                }}
                style={styles.accountRowItem}
              >
                <Text style={[styles.accountRowLabel, { color: theme.textPrimary }]}>
                  Data protection
                </Text>
                <ChevronRight size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Theme Toggle Button */}
            <View
              style={[
                styles.accountGroupCard,
                {
                  backgroundColor: theme.surfaceCard,
                  borderColor: theme.surfaceBorder,
                },
              ]}
            >
              <View style={styles.accountRowItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {themeMode === 'light' ? (
                    <Sun size={18} color="#FF7A00" style={{ marginRight: 10 }} />
                  ) : (
                    <Moon size={18} color="#94A3B8" style={{ marginRight: 10 }} />
                  )}
                  <Text style={[styles.accountRowLabel, { color: theme.textPrimary }]}>
                    Dark Mode
                  </Text>
                </View>
                <Switch
                  value={themeMode === 'dark'}
                  onValueChange={toggleTheme}
                  thumbColor={themeMode === 'dark' ? '#FF7A00' : '#E5E7EB'}
                  trackColor={{ false: '#767577', true: '#FFD29D' }}
                />
              </View>
            </View>

            {/* Log out link */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleLogout}
              style={styles.logoutRow}
            >
              <Text style={[styles.logoutText, { color: theme.primary }]}>
                Log out
              </Text>
            </TouchableOpacity>

            <View style={styles.footerVersionBox}>
              <Text style={[styles.footerVersionText, { color: theme.textMuted }]}>
                RideShare v2.4 • Clean Highway Corridors
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ========================================================
          MODAL: EDIT PERSONAL DETAILS
         ======================================================== */}
      <Modal
        visible={isPersonalDetailsOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsPersonalDetailsOpen(false)}
      >
        <View style={[styles.modalScreen, { backgroundColor: theme.background }]}>
          <View style={[styles.modalNavHeader, { borderBottomColor: theme.surfaceBorder }]}>
            <Text style={[styles.modalNavTitle, { color: theme.textPrimary }]}>
              Personal details
            </Text>
            <TouchableOpacity onPress={() => setIsPersonalDetailsOpen(false)} style={styles.modalCloseBtn}>
              <X size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Full Legal Name</Text>
            <TextInput
              style={[
                styles.formInput,
                {
                  backgroundColor: theme.surfaceCard,
                  color: theme.textPrimary,
                  borderColor: theme.surfaceBorder,
                },
              ]}
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Email Address</Text>
            <TextInput
              style={[
                styles.formInput,
                {
                  backgroundColor: theme.surfaceCard,
                  color: theme.textPrimary,
                  borderColor: theme.surfaceBorder,
                },
              ]}
              value={editEmail}
              onChangeText={setEditEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Phone Number</Text>
            <TextInput
              style={[
                styles.formInput,
                {
                  backgroundColor: theme.surfaceCard,
                  color: theme.textPrimary,
                  borderColor: theme.surfaceBorder,
                },
              ]}
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
            />

            <Button
              title="Save Changes"
              variant="primary"
              onPress={handleSavePersonalDetails}
              style={{ marginTop: 24 }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* ========================================================
          MODAL: MINI BIO
         ======================================================== */}
      <Modal
        visible={isBioModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsBioModalOpen(false)}
      >
        <View style={[styles.modalScreen, { backgroundColor: theme.background }]}>
          <View style={[styles.modalNavHeader, { borderBottomColor: theme.surfaceBorder }]}>
            <Text style={[styles.modalNavTitle, { color: theme.textPrimary }]}>
              About you
            </Text>
            <TouchableOpacity onPress={() => setIsBioModalOpen(false)} style={styles.modalCloseBtn}>
              <X size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={[styles.formLabel, { color: theme.textPrimary }]}>
              Mini Bio
            </Text>
            <Text style={[styles.formHint, { color: theme.textMuted }]}>
              Tell other members what kind of passenger or driver you are. Mention punctuality, favorite topics, or why you commute.
            </Text>

            <TextInput
              multiline
              numberOfLines={5}
              style={[
                styles.formTextArea,
                {
                  backgroundColor: theme.surfaceCard,
                  color: theme.textPrimary,
                  borderColor: theme.surfaceBorder,
                },
              ]}
              value={miniBio}
              onChangeText={setMiniBio}
              placeholder="Write a few lines about yourself..."
              placeholderTextColor={theme.textMuted}
            />

            <Button
              title="Save Bio"
              variant="primary"
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setIsBioModalOpen(false);
                Alert.alert('Bio Updated', 'Your commuter bio is now saved to your profile.');
              }}
              style={{ marginTop: 20 }}
            />
          </View>
        </View>
      </Modal>

      {/* ========================================================
          MODAL: TRAVEL PREFERENCES
         ======================================================== */}
      <Modal
        visible={isPreferencesOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsPreferencesOpen(false)}
      >
        <View style={[styles.modalScreen, { backgroundColor: theme.background }]}>
          <View style={[styles.modalNavHeader, { borderBottomColor: theme.surfaceBorder }]}>
            <Text style={[styles.modalNavTitle, { color: theme.textPrimary }]}>
              Travel Preferences
            </Text>
            <TouchableOpacity onPress={() => setIsPreferencesOpen(false)} style={styles.modalCloseBtn}>
              <X size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            {/* Chattiness */}
            <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Chattiness</Text>
            <View style={styles.prefButtonGroup}>
              {['Happy to chat', 'Quiet journey', 'Depends on mood'].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setChattiness(opt)}
                  style={[
                    styles.prefPill,
                    {
                      backgroundColor: chattiness === opt ? theme.chipActiveBg : theme.surfaceCard,
                      borderColor: chattiness === opt ? theme.chipActiveBg : theme.surfaceBorder,
                    },
                  ]}
                >
                  <Text style={{ color: chattiness === opt ? theme.chipActiveText : theme.textPrimary, fontWeight: '600', fontSize: 13 }}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Music */}
            <Text style={[styles.formLabel, { color: theme.textPrimary, marginTop: 16 }]}>Music & Radio</Text>
            <View style={styles.prefButtonGroup}>
              {['Afrobeats & Radio OK', 'Silence please', 'Podcasts & News'].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setMusicPref(opt)}
                  style={[
                    styles.prefPill,
                    {
                      backgroundColor: musicPref === opt ? theme.chipActiveBg : theme.surfaceCard,
                      borderColor: musicPref === opt ? theme.chipActiveBg : theme.surfaceBorder,
                    },
                  ]}
                >
                  <Text style={{ color: musicPref === opt ? theme.chipActiveText : theme.textPrimary, fontWeight: '600', fontSize: 13 }}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Air Conditioning */}
            <Text style={[styles.formLabel, { color: theme.textPrimary, marginTop: 16 }]}>Air Conditioning</Text>
            <View style={styles.prefButtonGroup}>
              {['AC always on', 'Windows down preferred', 'Driver choice'].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setAcPref(opt)}
                  style={[
                    styles.prefPill,
                    {
                      backgroundColor: acPref === opt ? theme.chipActiveBg : theme.surfaceCard,
                      borderColor: acPref === opt ? theme.chipActiveBg : theme.surfaceBorder,
                    },
                  ]}
                >
                  <Text style={{ color: acPref === opt ? theme.chipActiveText : theme.textPrimary, fontWeight: '600', fontSize: 13 }}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Smoking */}
            <Text style={[styles.formLabel, { color: theme.textPrimary, marginTop: 16 }]}>Smoking Policy</Text>
            <View style={styles.prefButtonGroup}>
              {['No smoking allowed', 'Vaping OK', 'Smoking breaks'].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setSmokingPref(opt)}
                  style={[
                    styles.prefPill,
                    {
                      backgroundColor: smokingPref === opt ? theme.chipActiveBg : theme.surfaceCard,
                      borderColor: smokingPref === opt ? theme.chipActiveBg : theme.surfaceBorder,
                    },
                  ]}
                >
                  <Text style={{ color: smokingPref === opt ? theme.chipActiveText : theme.textPrimary, fontWeight: '600', fontSize: 13 }}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title="Save Preferences"
              variant="primary"
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setIsPreferencesOpen(false);
                Alert.alert('Preferences Saved', 'Your commute travel preferences are now active.');
              }}
              style={{ marginTop: 26 }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* ========================================================
          MODAL: RATINGS & REVIEWS
         ======================================================== */}
      <Modal
        visible={isRatingsOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsRatingsOpen(false)}
      >
        <View style={[styles.modalScreen, { backgroundColor: theme.background }]}>
          <View style={[styles.modalNavHeader, { borderBottomColor: theme.surfaceBorder }]}>
            <Text style={[styles.modalNavTitle, { color: theme.textPrimary }]}>
              Ratings & Reviews
            </Text>
            <TouchableOpacity onPress={() => setIsRatingsOpen(false)} style={styles.modalCloseBtn}>
              <X size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <View
              style={[
                styles.ratingsOverviewBox,
                { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder },
              ]}
            >
              <Text style={[styles.ratingsScoreBig, { color: theme.textPrimary }]}>4.95</Text>
              <Text style={{ color: '#F59E0B', fontSize: 18, marginBottom: 4 }}>★★★★★</Text>
              <Text style={[styles.ratingsCountSub, { color: theme.textMuted }]}>
                Based on 42 corridor rides in Lagos & Abuja
              </Text>
            </View>

            <Text style={[styles.sectionHeaderTitle, { color: theme.textPrimary, marginTop: 20 }]}>
              Recent Feedback
            </Text>

            {[
              {
                id: 'rev-1',
                name: 'Kemi Okafor',
                rating: 5,
                date: '3 days ago',
                comment: 'Very polite, showed up exactly on time at Berger Oando station. Would travel again!',
              },
              {
                id: 'rev-2',
                name: 'Tunde Adeleke',
                rating: 5,
                date: '1 week ago',
                comment: 'Pleasant commuter, paid fuel split promptly via Paystack escrow.',
              },
              {
                id: 'rev-3',
                name: 'Chidi Anozie',
                rating: 5,
                date: '2 weeks ago',
                comment: 'Clean vehicle and smooth expressway commute to Victoria Island.',
              },
            ].map((r) => (
              <Card key={r.id} style={{ marginBottom: 12, padding: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 15 }}>
                    {r.name}
                  </Text>
                  <Text style={{ color: '#F59E0B', fontWeight: '700' }}>★ {r.rating}.0</Text>
                </View>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 8 }}>
                  {r.date}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 18 }}>
                  "{r.comment}"
                </Text>
              </Card>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ========================================================
          MODAL: PAYOUT METHODS (PAYSTACK NUBAN)
         ======================================================== */}
      <Modal
        visible={isPayoutModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsPayoutModalOpen(false)}
      >
        <View style={[styles.modalScreen, { backgroundColor: theme.background }]}>
          <View style={[styles.modalNavHeader, { borderBottomColor: theme.surfaceBorder }]}>
            <Text style={[styles.modalNavTitle, { color: theme.textPrimary }]}>
              Payout Methods
            </Text>
            <TouchableOpacity onPress={() => setIsPayoutModalOpen(false)} style={styles.modalCloseBtn}>
              <X size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={[styles.formHint, { color: theme.textMuted, marginBottom: 16 }]}>
              Your bank account is used for automatic escrow releases within 24 hours of completing a corridor trip.
            </Text>

            <View
              style={[
                styles.bankDetailCard,
                { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder },
              ]}
            >
              <View style={styles.bankDetailRow}>
                <Building2 size={24} color="#FF7A00" style={{ marginRight: 14 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bankNameText, { color: theme.textPrimary }]}>
                    Guaranty Trust Bank (058)
                  </Text>
                  <Text style={[styles.accountNumText, { color: theme.textMuted }]}>
                    Account: •••• 6789 (Paystack Verified NUBAN)
                  </Text>
                  <Text style={[styles.accountHolderText, { color: '#10B981' }]}>
                    Holder: {user?.displayName || 'OLAJIDE ABDULQUADRI'}
                  </Text>
                </View>
              </View>
            </View>

            <Button
              title="Update Bank Account"
              variant="secondary"
              onPress={() => {
                Alert.alert(
                  'Resolve NUBAN',
                  'To change your bank account, please enter your 10-digit NUBAN and bank code. It will be verified instantly via Paystack.',
                  [{ text: 'OK' }]
                );
              }}
              style={{ marginTop: 18 }}
            />
          </View>
        </View>
      </Modal>

      {/* ========================================================
          MODAL: TRANSFERS & ESCROW LOGS
         ======================================================== */}
      <Modal
        visible={isTransfersModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsTransfersModalOpen(false)}
      >
        <View style={[styles.modalScreen, { backgroundColor: theme.background }]}>
          <View style={[styles.modalNavHeader, { borderBottomColor: theme.surfaceBorder }]}>
            <Text style={[styles.modalNavTitle, { color: theme.textPrimary }]}>
              Transfers & Escrow History
            </Text>
            <TouchableOpacity onPress={() => setIsTransfersModalOpen(false)} style={styles.modalCloseBtn}>
              <X size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            {[
              {
                id: 'tr-1',
                route: 'Berger → Lekki Phase 1',
                amount: '₦4,000',
                status: 'SETTLED',
                date: 'Oct 14, 2026',
                ref: 'TRF_pstk_8849201',
              },
              {
                id: 'tr-2',
                route: 'Ikeja City Mall → Victoria Island',
                amount: '₦3,500',
                status: 'SETTLED',
                date: 'Oct 12, 2026',
                ref: 'TRF_pstk_4492018',
              },
              {
                id: 'tr-3',
                route: 'Gwarinpa → Central Business District Abuja',
                amount: '₦2,400',
                status: 'SETTLED',
                date: 'Oct 09, 2026',
                ref: 'TRF_pstk_1109923',
              },
            ].map((item) => (
              <Card key={item.id} style={{ marginBottom: 12, padding: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 15 }}>
                    {item.route}
                  </Text>
                  <Text style={{ color: '#10B981', fontWeight: '800', fontSize: 15 }}>
                    {item.amount}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>{item.date} • {item.ref}</Text>
                  <Badge label={item.status} variant="verified" />
                </View>
              </Card>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ========================================================
          MODAL: COMMUNICATION PREFERENCES
         ======================================================== */}
      <Modal
        visible={isCommunicationOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsCommunicationOpen(false)}
      >
        <View style={[styles.modalScreen, { backgroundColor: theme.background }]}>
          <View style={[styles.modalNavHeader, { borderBottomColor: theme.surfaceBorder }]}>
            <Text style={[styles.modalNavTitle, { color: theme.textPrimary }]}>
              Communication Preferences
            </Text>
            <TouchableOpacity onPress={() => setIsCommunicationOpen(false)} style={styles.modalCloseBtn}>
              <X size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.switchLabel, { color: theme.textPrimary }]}>Push Notifications</Text>
                <Text style={[styles.switchSub, { color: theme.textMuted }]}>
                  Instant trip alerts, driver messages, and ride status updates.
                </Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                thumbColor={pushEnabled ? '#FF7A00' : '#E5E7EB'}
                trackColor={{ false: '#767577', true: '#FFD29D' }}
              />
            </View>

            <View style={[styles.innerRowDivider, { backgroundColor: theme.surfaceBorder }]} />

            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.switchLabel, { color: theme.textPrimary }]}>SMS Notifications</Text>
                <Text style={[styles.switchSub, { color: theme.textMuted }]}>
                  Backup SMS text for departure countdowns and booking confirmations.
                </Text>
              </View>
              <Switch
                value={smsEnabled}
                onValueChange={setSmsEnabled}
                thumbColor={smsEnabled ? '#FF7A00' : '#E5E7EB'}
                trackColor={{ false: '#767577', true: '#FFD29D' }}
              />
            </View>

            <View style={[styles.innerRowDivider, { backgroundColor: theme.surfaceBorder }]} />

            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.switchLabel, { color: theme.textPrimary }]}>WhatsApp Live Trip Sharing</Text>
                <Text style={[styles.switchSub, { color: theme.textMuted }]}>
                  Automatically prepare WhatsApp share links for family members when boarding.
                </Text>
              </View>
              <Switch
                value={whatsappEnabled}
                onValueChange={setWhatsappEnabled}
                thumbColor={whatsappEnabled ? '#FF7A00' : '#E5E7EB'}
                trackColor={{ false: '#767577', true: '#FFD29D' }}
              />
            </View>

            <Button
              title="Save Preferences"
              variant="primary"
              onPress={() => {
                setIsCommunicationOpen(false);
                Alert.alert('Preferences Saved', 'Your communication settings have been updated.');
              }}
              style={{ marginTop: 24 }}
            />
          </View>
        </View>
      </Modal>

      {/* ========================================================
          MODAL: PASSWORD & SECURITY
         ======================================================== */}
      <Modal
        visible={isPasswordModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsPasswordModalOpen(false)}
      >
        <View style={[styles.modalScreen, { backgroundColor: theme.background }]}>
          <View style={[styles.modalNavHeader, { borderBottomColor: theme.surfaceBorder }]}>
            <Text style={[styles.modalNavTitle, { color: theme.textPrimary }]}>
              Password & Security
            </Text>
            <TouchableOpacity onPress={() => setIsPasswordModalOpen(false)} style={styles.modalCloseBtn}>
              <X size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Current Password</Text>
            <TextInput
              secureTextEntry
              style={[
                styles.formInput,
                { backgroundColor: theme.surfaceCard, color: theme.textPrimary, borderColor: theme.surfaceBorder },
              ]}
              placeholder="••••••••"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={[styles.formLabel, { color: theme.textPrimary }]}>New Password</Text>
            <TextInput
              secureTextEntry
              style={[
                styles.formInput,
                { backgroundColor: theme.surfaceCard, color: theme.textPrimary, borderColor: theme.surfaceBorder },
              ]}
              placeholder="Min. 8 characters"
              placeholderTextColor={theme.textMuted}
            />

            <Button
              title="Update Password"
              variant="primary"
              onPress={() => {
                setIsPasswordModalOpen(false);
                Alert.alert('Security', 'Your password has been securely updated.');
              }}
              style={{ marginTop: 24 }}
            />
          </View>
        </View>
      </Modal>

      {/* ========================================================
          MODAL: POSTAL ADDRESS
         ======================================================== */}
      <Modal
        visible={isPostalModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsPostalModalOpen(false)}
      >
        <View style={[styles.modalScreen, { backgroundColor: theme.background }]}>
          <View style={[styles.modalNavHeader, { borderBottomColor: theme.surfaceBorder }]}>
            <Text style={[styles.modalNavTitle, { color: theme.textPrimary }]}>
              Postal Address
            </Text>
            <TouchableOpacity onPress={() => setIsPostalModalOpen(false)} style={styles.modalCloseBtn}>
              <X size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Residential Address</Text>
            <TextInput
              style={[
                styles.formInput,
                { backgroundColor: theme.surfaceCard, color: theme.textPrimary, borderColor: theme.surfaceBorder },
              ]}
              defaultValue="14 Admiralty Way, Lekki Phase 1"
            />

            <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Nearest Highway Hub / Landmark</Text>
            <TextInput
              style={[
                styles.formInput,
                { backgroundColor: theme.surfaceCard, color: theme.textPrimary, borderColor: theme.surfaceBorder },
              ]}
              defaultValue="Berger Bus Stop, Lagos"
            />

            <Button
              title="Save Address"
              variant="primary"
              onPress={() => {
                setIsPostalModalOpen(false);
                Alert.alert('Address Saved', 'Your address landmark is registered.');
              }}
              style={{ marginTop: 24 }}
            />
          </View>
        </View>
      </Modal>

      {/* ========================================================
          MODAL: PAYMENTS & REFUNDS
         ======================================================== */}
      <Modal
        visible={isPaymentsOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsPaymentsOpen(false)}
      >
        <View style={[styles.modalScreen, { backgroundColor: theme.background }]}>
          <View style={[styles.modalNavHeader, { borderBottomColor: theme.surfaceBorder }]}>
            <Text style={[styles.modalNavTitle, { color: theme.textPrimary }]}>
              Payments & Refunds
            </Text>
            <TouchableOpacity onPress={() => setIsPaymentsOpen(false)} style={styles.modalCloseBtn}>
              <X size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            {[
              {
                id: 'pay-1',
                title: 'Berger → Lekki Phase 1',
                amount: '₦2,150',
                status: 'ESCROW HELD',
                date: 'Today',
                ref: 'pstk_live_884920199',
              },
              {
                id: 'pay-2',
                title: 'Berger → Ibadan Iwo Road',
                amount: '₦5,300',
                status: 'CONFIRMED',
                date: 'Today',
                ref: 'pstk_live_449201883',
              },
              {
                id: 'pay-3',
                title: 'Gwarinpa → CBD Abuja',
                amount: '₦1,300',
                status: 'COMPLETED',
                date: '2 days ago',
                ref: 'pstk_live_110992384',
              },
              {
                id: 'pay-4',
                title: 'Ikeja City Mall → Victoria Island',
                amount: '₦1,950',
                status: 'REFUNDED',
                date: '3 days ago',
                ref: 'pstk_live_992019284',
              },
            ].map((p) => (
              <Card key={p.id} style={{ marginBottom: 12, padding: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 15 }}>
                    {p.title}
                  </Text>
                  <Text style={{ color: p.status === 'REFUNDED' ? '#10B981' : theme.textPrimary, fontWeight: '800', fontSize: 15 }}>
                    {p.amount}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>{p.date} • {p.ref}</Text>
                  <Badge label={p.status} variant={p.status === 'REFUNDED' ? 'verified' : 'status'} />
                </View>
              </Card>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ========================================================
          MODAL: SAVED PASSENGERS
         ======================================================== */}
      <Modal
        visible={isSavedPassengersOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsSavedPassengersOpen(false)}
      >
        <View style={[styles.modalScreen, { backgroundColor: theme.background }]}>
          <View style={[styles.modalNavHeader, { borderBottomColor: theme.surfaceBorder }]}>
            <Text style={[styles.modalNavTitle, { color: theme.textPrimary }]}>
              Saved Passengers
            </Text>
            <TouchableOpacity onPress={() => setIsSavedPassengersOpen(false)} style={styles.modalCloseBtn}>
              <X size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {[
              { id: 'sp-1', name: 'Kemi Okafor', phone: '+234 803 234 5678', relation: 'Sister' },
              { id: 'sp-2', name: 'Dr. Tunde Okafor', phone: '+234 802 987 6543', relation: 'Father' },
            ].map((p) => (
              <Card key={p.id} style={{ marginBottom: 12, padding: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 15 }}>{p.name}</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>{p.phone}</Text>
                  </View>
                  <Badge label={p.relation} variant="verified" />
                </View>
              </Card>
            ))}

            <Button
              title="Add New Passenger"
              variant="secondary"
              onPress={() => {
                Alert.alert('Add Passenger', 'Enter name and phone number of the family member.');
              }}
              style={{ marginTop: 14 }}
            />
          </View>
        </View>
      </Modal>

      {/* ========================================================
          MODAL: ADD VEHICLE FORM
         ======================================================== */}
      <Modal
        visible={isAddVehicleOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAddVehicleOpen(false)}
      >
        <View style={[styles.modalScreen, { backgroundColor: theme.background }]}>
          <View style={[styles.modalNavHeader, { borderBottomColor: theme.surfaceBorder }]}>
            <Text style={[styles.modalNavTitle, { color: theme.textPrimary }]}>
              Add Vehicle
            </Text>
            <TouchableOpacity onPress={() => setIsAddVehicleOpen(false)} style={styles.modalCloseBtn}>
              <X size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Make</Text>
            <TextInput
              style={[
                styles.formInput,
                { backgroundColor: theme.surfaceCard, color: theme.textPrimary, borderColor: theme.surfaceBorder },
              ]}
              value={vehMake}
              onChangeText={setVehMake}
              placeholder="e.g. Toyota"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Model</Text>
            <TextInput
              style={[
                styles.formInput,
                { backgroundColor: theme.surfaceCard, color: theme.textPrimary, borderColor: theme.surfaceBorder },
              ]}
              value={vehModel}
              onChangeText={setVehModel}
              placeholder="e.g. Corolla"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Year</Text>
            <TextInput
              style={[
                styles.formInput,
                { backgroundColor: theme.surfaceCard, color: theme.textPrimary, borderColor: theme.surfaceBorder },
              ]}
              value={vehYear}
              onChangeText={setVehYear}
              keyboardType="number-pad"
            />

            <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Color</Text>
            <TextInput
              style={[
                styles.formInput,
                { backgroundColor: theme.surfaceCard, color: theme.textPrimary, borderColor: theme.surfaceBorder },
              ]}
              value={vehColor}
              onChangeText={setVehColor}
            />

            <Text style={[styles.formLabel, { color: theme.textPrimary }]}>License Plate Number</Text>
            <TextInput
              style={[
                styles.formInput,
                { backgroundColor: theme.surfaceCard, color: theme.textPrimary, borderColor: theme.surfaceBorder },
              ]}
              value={vehPlate}
              onChangeText={setVehPlate}
              autoCapitalize="characters"
              placeholder="e.g. LAG-492-AA"
              placeholderTextColor={theme.textMuted}
            />

            <Button
              title="Save Vehicle & Enable Driver Mode"
              variant="primary"
              onPress={() => {
                setDriverMode(true);
                if (user) {
                  setUser({ ...user, isDriver: true });
                }
                setIsAddVehicleOpen(false);
                Alert.alert('Vehicle Added', 'Your vehicle is now registered. Driver mode is active.');
              }}
              style={{ marginTop: 24 }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* ========================================================
          MODAL: STATE SELECTOR (36 NIGERIAN STATES)
         ======================================================== */}
      <Modal
        visible={isChangingState}
        animationType="fade"
        transparent
        onRequestClose={() => setIsChangingState(false)}
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
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                Change Home State
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsChangingState(false);
                  setStateSearchQuery('');
                }}
                style={{ padding: 4 }}
              >
                <X size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: theme.textMuted }]}>
              Selecting a new state updates your default landmark search and highway corridor filters.
            </Text>

            <View
              style={[
                styles.modalSearchBox,
                {
                  backgroundColor: isLight ? '#F8FAFC' : '#1A1D26',
                  borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)',
                },
              ]}
            >
              <Search size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[
                  styles.modalSearchInput,
                  { color: theme.textPrimary },
                ]}
                placeholder="Search state (e.g., Lagos, Abuja, Rivers)..."
                placeholderTextColor={theme.textMuted}
                value={stateSearchQuery}
                onChangeText={setStateSearchQuery}
                autoFocus
                clearButtonMode="while-editing"
              />
            </View>

            <ScrollView
              style={{ maxHeight: 280 }}
              showsVerticalScrollIndicator={false}
            >
              {matchingStates.map((item) => {
                const isSelected = currentState === item.name;
                return (
                  <TouchableOpacity
                    key={item.name}
                    activeOpacity={0.75}
                    onPress={() => handleSelectState(item.name)}
                    style={[
                      styles.stateOptionRow,
                      {
                        backgroundColor: isSelected
                          ? isLight
                            ? '#ECFDF5'
                            : '#12251D'
                          : 'transparent',
                      },
                    ]}
                  >
                    <MapPin size={20} color="#10B981" style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.stateOptionTitle,
                          { color: theme.textPrimary },
                        ]}
                      >
                        {item.name} {item.name === 'FCT Abuja' ? '' : 'State'}
                      </Text>
                      <Text style={[styles.stateOptionSub, { color: theme.textMuted }]}>
                        Capital: {item.capital} • Hubs: {item.majorCities.join(', ')}
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

      {/* Help & Support Modal */}
      <HelpSupportModal
        visible={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  topTabBar: {
    flexDirection: 'row',
    marginTop: 4,
  },
  topTabBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  topTabBtnActive: {
    // borderBottomColor set dynamically
  },
  topTabText: {
    fontSize: 16,
    letterSpacing: -0.2,
  },
  scrollContent: {
    paddingTop: 16,
  },
  tabContentWrap: {
    paddingHorizontal: 20,
  },

  // About you tab styles
  identityRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  avatarWrap: {
    marginRight: 14,
  },
  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityMeta: {
    flex: 1,
  },
  identityName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  identitySubtitle: {
    fontSize: 13,
    marginTop: 3,
  },

  // Complete profile card
  completeProfileBox: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  completeTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  completeSub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  progressRowBox: {
    marginBottom: 14,
  },
  progressCounterText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  segmentedBarWrap: {
    flexDirection: 'row',
    gap: 6,
  },
  segmentBar: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  addPhotoLink: {
    fontSize: 14,
    fontWeight: '700',
  },

  editPersonalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 10,
  },
  editPersonalText: {
    fontSize: 15,
    fontWeight: '700',
  },

  sectionDivider: {
    height: 1,
    marginVertical: 12,
  },

  sectionContainer: {
    marginVertical: 6,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  verifyIconCircle: {
    marginRight: 12,
  },
  verifyTextCol: {
    flex: 1,
    marginRight: 8,
  },
  verifyItemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  verifyItemSub: {
    fontSize: 12,
    marginTop: 2,
  },

  reliabilityCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  reliabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reliabilityMainText: {
    fontSize: 14,
    fontWeight: '700',
  },
  reliabilitySubText: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },

  actionPlusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  plusIconWrap: {
    marginRight: 12,
  },
  actionPlusTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionPlusSub: {
    fontSize: 12,
    marginTop: 2,
  },

  vehicleCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  vehicleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  vehiclePlate: {
    fontSize: 12,
    marginTop: 2,
  },
  postRideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  postRideBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  regionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  regionStateTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  regionStateSub: {
    fontSize: 12,
    marginTop: 2,
  },
  changeRegionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeRegionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Account tab styles
  accountGroupCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
  },
  accountRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  accountRowLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  accountRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountRowBadge: {
    fontSize: 13,
    fontWeight: '600',
  },
  innerRowDivider: {
    height: 1,
    marginHorizontal: 16,
  },

  logoutRow: {
    paddingVertical: 14,
    marginTop: 6,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '800',
  },
  footerVersionBox: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  footerVersionText: {
    fontSize: 12,
  },

  // Modals generic styles
  modalScreen: {
    flex: 1,
  },
  modalNavHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalNavTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalBody: {
    padding: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 12,
  },
  formHint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  formInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  formTextArea: {
    height: 110,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  prefButtonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prefPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  ratingsOverviewBox: {
    alignItems: 'center',
    padding: 22,
    borderRadius: 16,
    borderWidth: 1,
  },
  ratingsScoreBig: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
  },
  ratingsCountSub: {
    fontSize: 13,
  },
  bankDetailCard: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  bankDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankNameText: {
    fontSize: 16,
    fontWeight: '800',
  },
  accountNumText: {
    fontSize: 13,
    marginTop: 2,
  },
  accountHolderText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  switchSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },

  // State Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
  },
  stateOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  stateOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  stateOptionSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
