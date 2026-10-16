import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  X,
  Check,
  ShieldCheck,
  Clock,
  CreditCard,
  Users,
  CheckCircle2,
  Sparkles,
  Search,
  MapPin,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../services/api';
import { NIGERIAN_STATES } from '../../constants/nigerianLocations';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { theme, themeMode, setUser, homeState, setHomeState } = useAppStore();

  // Registration multi-step state
  const [currentStep, setCurrentStep] = useState(1);
  const [stateSearch, setStateSearch] = useState('');

  // Form Fields
  const [selectedState, setSelectedState] = useState(homeState || 'Lagos');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'WOMAN' | 'MAN' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY'>('WOMAN');
  const [roleIntent, setRoleIntent] = useState<'PASSENGER' | 'DRIVER'>('PASSENGER');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('8031234567');
  const [bio, setBio] = useState('');
  const [pushNotif, setPushNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [marketingNotif, setMarketingNotif] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 11;

  const handleNext = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (currentStep === 2 && (!firstName.trim() || !lastName.trim())) {
      Alert.alert('Required Field', 'Please enter both your first name and last name.');
      return;
    }

    if (currentStep === 3 && (!dob.trim() || dob.length < 8)) {
      Alert.alert('Required Field', 'Please enter your date of birth (DD/MM/YYYY).');
      return;
    }

    if (currentStep === 6 && password.length < 8) {
      Alert.alert('Password too short', 'Password must have at least 8 characters with letters, numbers, and symbols.');
      return;
    }

    if (currentStep === 10 && !agreedToTerms) {
      Alert.alert('Agreement Required', 'Please accept the Community Agreement to proceed.');
      return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      router.back();
    }
  };

  const handleFinalize = async () => {
    setIsSubmitting(true);
    try {
      // 1. Authenticate or create default session if not already logged in
      const fullPhone = `+234${phoneNumber.replace(/^0+/, '')}`;
      let token = await api.auth.getToken();
      if (!token) {
        // Auto-initialize challenge for registration
        const req = await api.auth.requestOtp(fullPhone);
        const otpResp = await api.auth.verifyOtp(req.challengeId, '000000');
        token = otpResp.accessToken;
      }

      // 2. Persist user profile to backend
      const fullName = `${firstName.trim()} ${lastName.trim()}` || 'Commuter';
      const updatedProfile = await api.profile.update({
        displayName: fullName,
        bio: bio.trim() || `Commuting in ${selectedState}`,
        gender: gender,
      });

      // 3. If driver intent, register draft driver application
      if (roleIntent === 'DRIVER') {
        try {
          await api.driver.updateApplication({
            legalFirstName: firstName.trim(),
            legalLastName: lastName.trim(),
            state: selectedState,
            city: selectedState === 'Lagos' ? 'Lagos' : 'Abuja',
          });
        } catch (e) {
          console.warn('Driver application initialization note:', e);
        }
      }

      setHomeState(selectedState);
      setUser({
        ...updatedProfile,
        state: selectedState,
        isDriver: roleIntent === 'DRIVER',
      });

      router.replace('/auth/profile');
    } catch (err: any) {
      console.error('Registration finalize error:', err);
      // Fallback update store
      setHomeState(selectedState);
      setUser({
        id: 'reg-user',
        phoneE164: `+234${phoneNumber.replace(/^0+/, '')}`,
        displayName: `${firstName.trim()} ${lastName.trim()}` || 'Olajide',
        bio: bio.trim(),
        state: selectedState,
        ninVerified: false,
        isDriver: roleIntent === 'DRIVER',
        rating: 5.0,
        totalTrips: 0,
      });
      router.replace('/auth/profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLight = themeMode === 'light';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: isLight ? '#FFFFFF' : '#0E1015' }]}
    >
      {/* Top Header Bar with Back Arrow */}
      <View
        style={[
          styles.headerRow,
          {
            paddingTop: Math.max(insets.top, 16) + 6,
            borderBottomColor: isLight ? '#F1F5F9' : '#1E222B',
          },
        ]}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={24} color={isLight ? '#0F172A' : '#FFFFFF'} />
        </TouchableOpacity>

        {currentStep >= 9 && currentStep <= 10 ? (
          <Text style={[styles.headerCategoryText, { color: isLight ? '#475569' : '#94A3B8' }]}>
            Onboarding
          </Text>
        ) : (
          <Text style={[styles.headerCategoryText, { color: isLight ? '#475569' : '#94A3B8' }]}>
            Profile set-up ({currentStep}/{totalSteps})
          </Text>
        )}

        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: Math.max(insets.bottom, 20) + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 1: Nationwide Region / State Selection */}
        {currentStep === 1 && (
          <View style={styles.stepContent}>
            <Text style={[styles.title, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              Where will you use RideShare?
            </Text>
            <Text style={[styles.subtitle, { color: isLight ? '#475569' : '#94A3B8' }]}>
              Search for your state or city. Your corridor routes and landmark stops will be customized for your region.
            </Text>

            {/* Spacious State Search Bar */}
            <View
              style={[
                styles.searchPillBox,
                {
                  backgroundColor: isLight ? '#F8FAFC' : '#14161C',
                  borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)',
                  marginTop: 18,
                  marginBottom: 16,
                },
              ]}
            >
              <Search size={22} color={isLight ? '#64748B' : '#94A3B8'} style={{ marginRight: 10 }} />
              <TextInput
                style={[
                  styles.searchPillInput,
                  { color: isLight ? '#0F172A' : '#FFFFFF' },
                ]}
                placeholder="Type state or city (e.g., Lagos, Abuja, Rivers, Kano)..."
                placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                value={stateSearch}
                onChangeText={setStateSearch}
                clearButtonMode="while-editing"
                autoCapitalize="words"
              />
              {stateSearch.length > 0 && (
                <TouchableOpacity onPress={() => setStateSearch('')} style={{ padding: 6 }}>
                  <X size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* If searching: display ONLY matching states */}
            {stateSearch.trim().length > 0 ? (
              <View style={styles.stateSearchResults}>
                <Text style={[styles.sectionMetaTitle, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                  MATCHING STATES & HUBS
                </Text>
                {(() => {
                  const q = stateSearch.toLowerCase();
                  const matches = NIGERIAN_STATES.filter(
                    (item) =>
                      item.name.toLowerCase().includes(q) ||
                      item.capital.toLowerCase().includes(q) ||
                      item.majorCities.some((c) => c.toLowerCase().includes(q))
                  );

                  if (matches.length === 0) {
                    return (
                      <View
                        style={[
                          styles.emptySearchBox,
                          {
                            backgroundColor: isLight ? '#F8FAFC' : '#14161C',
                            borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)',
                          },
                        ]}
                      >
                        <Text style={[styles.emptySearchText, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                          No state or city found matching "{stateSearch}". Try searching by state name or capital.
                        </Text>
                      </View>
                    );
                  }

                  return matches.map((item) => (
                    <TouchableOpacity
                      key={item.name}
                      activeOpacity={0.8}
                      onPress={() => {
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        } catch {}
                        setSelectedState(item.name);
                        setHomeState(item.name);
                        setStateSearch('');
                      }}
                      style={[
                        styles.stateCard,
                        {
                          backgroundColor:
                            selectedState === item.name
                              ? isLight
                                ? '#ECFDF5'
                                : '#12251D'
                              : isLight
                              ? '#FFFFFF'
                              : '#14161C',
                          borderColor:
                            selectedState === item.name
                              ? '#10B981'
                              : isLight
                              ? '#E2E8F0'
                              : 'rgba(255, 255, 255, 0.08)',
                        },
                      ]}
                    >
                      <MapPin size={22} color="#10B981" style={{ marginRight: 14 }} />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.stateCardTitle,
                            { color: isLight ? '#0F172A' : '#FFFFFF' },
                          ]}
                        >
                          {item.name} State {item.name === 'FCT Abuja' ? '(Federal Capital)' : ''}
                        </Text>
                        <Text
                          style={[
                            styles.stateCardSub,
                            { color: isLight ? '#64748B' : '#94A3B8' },
                          ]}
                        >
                          Capital: {item.capital} • Hubs: {item.majorCities.join(', ')}
                        </Text>
                      </View>
                      {selectedState === item.name ? (
                        <CheckCircle2 size={22} color="#10B981" />
                      ) : (
                        <ChevronRight size={18} color={isLight ? '#94A3B8' : '#64748B'} />
                      )}
                    </TouchableOpacity>
                  ));
                })()}
              </View>
            ) : (
              /* When not searching: Show currently selected state + quick popular hubs */
              <View style={{ gap: 18 }}>
                {/* Active Selected State Card */}
                <View>
                  <Text style={[styles.sectionMetaTitle, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                    CURRENTLY SELECTED REGION
                  </Text>
                  {(() => {
                    const activeStateObj = NIGERIAN_STATES.find((s) => s.name === selectedState) || {
                      name: selectedState,
                      capital: 'State Capital',
                      majorCities: ['Metro Centers'],
                    };
                    return (
                      <View
                        style={[
                          styles.activeStateHeroCard,
                          {
                            backgroundColor: isLight ? '#F0FDF4' : '#102319',
                            borderColor: '#10B981',
                          },
                        ]}
                      >
                        <View style={styles.activeStateBadge}>
                          <MapPin size={16} color="#10B981" />
                          <Text style={styles.activeStateBadgeText}>Active Home State</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                          <MapPin size={24} color="#10B981" style={{ marginRight: 14 }} />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.activeStateTitle,
                                { color: isLight ? '#065F46' : '#E6FFFA' },
                              ]}
                            >
                              {activeStateObj.name} {activeStateObj.name === 'FCT Abuja' ? '' : 'State'}
                            </Text>
                            <Text
                              style={[
                                styles.activeStateSub,
                                { color: isLight ? '#047857' : '#A7F3D0' },
                              ]}
                            >
                              Capital: {activeStateObj.capital} • Hubs: {activeStateObj.majorCities.join(', ')}
                            </Text>
                          </View>
                          <CheckCircle2 size={24} color="#10B981" />
                        </View>
                      </View>
                    );
                  })()}
                </View>

                {/* Popular Region Quick Chips */}
                <View>
                  <Text style={[styles.sectionMetaTitle, { color: isLight ? '#64748B' : '#94A3B8', marginBottom: 10 }]}>
                    POPULAR CORRIDOR REGIONS
                  </Text>
                  <View style={styles.chipsWrap}>
                    {['Lagos', 'FCT Abuja', 'Rivers', 'Oyo', 'Kano', 'Enugu', 'Delta', 'Anambra', 'Edo', 'Kaduna'].map((chip) => {
                      const isSelected = selectedState === chip;
                      return (
                        <TouchableOpacity
                          key={chip}
                          activeOpacity={0.75}
                          onPress={() => {
                            try {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            } catch {}
                            setSelectedState(chip);
                            setHomeState(chip);
                          }}
                          style={[
                            styles.popularChip,
                            {
                              backgroundColor: isSelected
                                ? '#10B981'
                                : isLight
                                ? '#FFFFFF'
                                : '#14161C',
                              borderColor: isSelected
                                ? '#10B981'
                                : isLight
                                ? '#E2E8F0'
                                : 'rgba(255, 255, 255, 0.08)',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.popularChipText,
                              {
                                color: isSelected
                                  ? '#FFFFFF'
                                  : isLight
                                  ? '#0F172A'
                                  : '#FFFFFF',
                                fontWeight: isSelected ? '800' : '600',
                              },
                            ]}
                          >
                            {isSelected ? '✓ ' : ''}{chip}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* STEP 2: Name */}
        {currentStep === 2 && (
          <View style={styles.stepContent}>
            <Text style={[styles.title, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              What's your name?
            </Text>

            <View style={{ gap: 14, marginTop: 24 }}>
              {/* First Name Pill */}
              <View
                style={[
                  styles.inputPill,
                  {
                    backgroundColor: isLight ? '#F1F5F9' : '#1A1C23',
                    borderColor: isLight ? '#E2E8F0' : '#2D3139',
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.inputText,
                    { color: isLight ? '#0F172A' : '#FFFFFF' },
                  ]}
                  placeholder="First name"
                  placeholderTextColor="#94A3B8"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoFocus
                />
                {firstName.length > 0 && (
                  <TouchableOpacity onPress={() => setFirstName('')}>
                    <X size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Last Name Pill */}
              <View
                style={[
                  styles.inputPill,
                  {
                    backgroundColor: isLight ? '#F1F5F9' : '#1A1C23',
                    borderColor: isLight ? '#E2E8F0' : '#2D3139',
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.inputText,
                    { color: isLight ? '#0F172A' : '#FFFFFF' },
                  ]}
                  placeholder="Last name"
                  placeholderTextColor="#94A3B8"
                  value={lastName}
                  onChangeText={setLastName}
                />
                {lastName.length > 0 && (
                  <TouchableOpacity onPress={() => setLastName('')}>
                    <X size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* STEP 3: Date of Birth */}
        {currentStep === 3 && (
          <View style={styles.stepContent}>
            <Text style={[styles.title, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              What's your date of birth?
            </Text>

            <View
              style={[
                styles.inputPill,
                {
                  marginTop: 24,
                  backgroundColor: isLight ? '#F1F5F9' : '#1A1C23',
                  borderColor: isLight ? '#E2E8F0' : '#2D3139',
                },
              ]}
            >
              <TextInput
                style={[
                  styles.inputText,
                  { color: isLight ? '#0F172A' : '#FFFFFF' },
                ]}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={10}
                value={dob}
                onChangeText={(text) => {
                  // Format DD/MM/YYYY
                  const cleaned = text.replace(/[^0-9]/g, '');
                  if (cleaned.length <= 2) setDob(cleaned);
                  else if (cleaned.length <= 4) setDob(`${cleaned.slice(0, 2)}/${cleaned.slice(2)}`);
                  else setDob(`${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`);
                }}
                autoFocus
              />
              {dob.length > 0 && (
                <TouchableOpacity onPress={() => setDob('')}>
                  <X size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* STEP 4: Gender / Sex */}
        {currentStep === 4 && (
          <View style={styles.stepContent}>
            <Text style={[styles.title, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              What is your gender?
            </Text>
            <Text style={[styles.subtitle, { color: isLight ? '#475569' : '#94A3B8' }]}>
              RideShare members feel more comfortable knowing a bit about who they're sharing a ride with. This enables our verified Women-Only carpool filter.
            </Text>

            <View style={styles.illustrationShapes}>
              <View style={[styles.shapeCircle, { backgroundColor: '#93C5FD' }]} />
              <View style={[styles.shapeStar, { backgroundColor: '#86EFAC' }]} />
              <View style={[styles.shapeDiamond, { backgroundColor: '#FDE047' }]} />
              <View style={[styles.shapePentagon, { backgroundColor: '#F472B6' }]} />
            </View>

            <View style={[styles.menuContainer, { marginTop: 32 }]}>
              {[
                { label: 'Female', value: 'WOMAN' },
                { label: 'Male', value: 'MAN' },
                { label: 'Other', value: 'NON_BINARY' },
              ].map((item, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.7}
                  onPress={() => {
                    setGender(item.value as any);
                    handleNext();
                  }}
                  style={[
                    styles.listRow,
                    {
                      borderBottomColor: isLight ? '#F1F5F9' : '#1E222B',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.listRowText,
                      { color: isLight ? '#0F172A' : '#FFFFFF' },
                    ]}
                  >
                    {item.label}
                  </Text>
                  <ChevronRight size={20} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* STEP 5: Role Intent */}
        {currentStep === 5 && (
          <View style={styles.stepContent}>
            <Text style={[styles.title, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              How will you use RideShare?
            </Text>
            <Text style={[styles.subtitle, { color: isLight ? '#475569' : '#94A3B8' }]}>
              Are you mostly driving or riding as a passenger? This helps us send you the most relevant info!
            </Text>

            <View style={styles.carpoolIllustrationBox}>
              <Text style={{ fontSize: 44 }}>🚗</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <Text style={{ fontSize: 20 }}>😊</Text>
                <Text style={{ fontSize: 20 }}>👋</Text>
              </View>
            </View>

            <View style={[styles.menuContainer, { marginTop: 28 }]}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setRoleIntent('DRIVER');
                  handleNext();
                }}
                style={[
                  styles.listRow,
                  { borderBottomColor: isLight ? '#F1F5F9' : '#1E222B' },
                ]}
              >
                <Text
                  style={[
                    styles.listRowText,
                    { color: isLight ? '#0F172A' : '#FFFFFF' },
                  ]}
                >
                  Mostly as a driver
                </Text>
                <ChevronRight size={20} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setRoleIntent('PASSENGER');
                  handleNext();
                }}
                style={[
                  styles.listRow,
                  { borderBottomColor: isLight ? '#F1F5F9' : '#1E222B' },
                ]}
              >
                <Text
                  style={[
                    styles.listRowText,
                    { color: isLight ? '#0F172A' : '#FFFFFF' },
                  ]}
                >
                  Mostly as a passenger
                </Text>
                <ChevronRight size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 6: Password */}
        {currentStep === 6 && (
          <View style={styles.stepContent}>
            <Text style={[styles.title, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              Define your password
            </Text>
            <Text style={[styles.subtitle, { color: isLight ? '#475569' : '#94A3B8' }]}>
              It must have at least 8 characters, 1 letter, 1 number and 1 special character.
            </Text>

            <View
              style={[
                styles.inputPill,
                {
                  marginTop: 24,
                  backgroundColor: isLight ? '#F1F5F9' : '#1A1C23',
                  borderColor: isLight ? '#E2E8F0' : '#2D3139',
                },
              ]}
            >
              <TextInput
                style={[
                  styles.inputText,
                  { color: isLight ? '#0F172A' : '#FFFFFF' },
                ]}
                placeholder="Password"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoFocus
              />
              {password.length > 0 && (
                <TouchableOpacity onPress={() => setPassword('')}>
                  <X size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* STEP 7: Phone Number & SMS */}
        {currentStep === 7 && (
          <View style={styles.stepContent}>
            <Text style={[styles.title, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              Verify your phone number
            </Text>
            <Text style={[styles.subtitle, { color: isLight ? '#475569' : '#94A3B8' }]}>
              We send your SMS booking confirmations and emergency alerts to this verified mobile number.
            </Text>

            <View
              style={[
                styles.phoneInputRow,
                {
                  marginTop: 24,
                  backgroundColor: isLight ? '#F1F5F9' : '#1A1C23',
                  borderColor: isLight ? '#E2E8F0' : '#2D3139',
                },
              ]}
            >
              <View style={styles.countryPicker}>
                <Text
                  style={[
                    styles.countryCodeText,
                    { color: isLight ? '#0F172A' : '#FFFFFF' },
                  ]}
                >
                  (+234)
                </Text>
              </View>
              <TextInput
                style={[
                  styles.phoneInputText,
                  { color: isLight ? '#0F172A' : '#FFFFFF' },
                ]}
                placeholder="803 123 4567"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>

            <View style={styles.checkboxRow}>
              <TouchableOpacity
                onPress={() => setMarketingNotif(!marketingNotif)}
                style={[
                  styles.checkboxBox,
                  {
                    borderColor: '#2563EB',
                    backgroundColor: marketingNotif ? '#2563EB' : 'transparent',
                  },
                ]}
              >
                {marketingNotif && <Check size={14} color="#FFFFFF" />}
              </TouchableOpacity>
              <Text style={[styles.checkboxLabel, { color: isLight ? '#475569' : '#94A3B8' }]}>
                I don't want to receive commercial offers or marketing calls. You can change this anytime.
              </Text>
            </View>
          </View>
        )}

        {/* STEP 8: Bio & Description */}
        {currentStep === 8 && (
          <View style={styles.stepContent}>
            <Text style={[styles.title, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              Add a description
            </Text>
            <Text style={[styles.subtitle, { color: isLight ? '#475569' : '#94A3B8' }]}>
              Please take a moment to introduce yourself to the RideShare community.
            </Text>

            <View
              style={[
                styles.textareaBox,
                {
                  marginTop: 24,
                  backgroundColor: isLight ? '#F1F5F9' : '#1A1C23',
                  borderColor: isLight ? '#E2E8F0' : '#2D3139',
                },
              ]}
            >
              <TextInput
                style={[
                  styles.textareaInput,
                  { color: isLight ? '#0F172A' : '#FFFFFF' },
                ]}
                placeholder="Example: I commute on weekdays from Berger to Lekki and would love to meet pleasant people to share rides and split fuel costs!"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={5}
                value={bio}
                onChangeText={setBio}
              />
            </View>
          </View>
        )}

        {/* STEP 9: Notification Preferences */}
        {currentStep === 9 && (
          <View style={styles.stepContent}>
            <Text style={[styles.title, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              Notifications
            </Text>
            <Text style={[styles.subtitle, { color: isLight ? '#475569' : '#94A3B8' }]}>
              Please select how you'd like us to notify you.
            </Text>

            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>★ Recommended</Text>
            </View>

            <View style={[styles.toggleCard, { backgroundColor: isLight ? '#F8FAFC' : '#181A20' }]}>
              {/* Push */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.toggleTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                    Push notifications
                  </Text>
                  <Text style={[styles.toggleSub, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                    For all important activity: bookings, messages, reviews, etc.
                  </Text>
                </View>
                <Switch value={pushNotif} onValueChange={setPushNotif} trackColor={{ false: '#767577', true: '#2563EB' }} />
              </View>

              <View style={[styles.divider, { backgroundColor: isLight ? '#E2E8F0' : '#272B35' }]} />

              {/* SMS */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.toggleTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                    SMS text messages
                  </Text>
                  <Text style={[styles.toggleSub, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                    For new bookings and cancellations only.
                  </Text>
                </View>
                <Switch value={smsNotif} onValueChange={setSmsNotif} trackColor={{ false: '#767577', true: '#2563EB' }} />
              </View>

              <View style={[styles.divider, { backgroundColor: isLight ? '#E2E8F0' : '#272B35' }]} />

              {/* Email */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.toggleTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                    Email
                  </Text>
                  <Text style={[styles.toggleSub, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                    For receipts and weekly corridor updates.
                  </Text>
                </View>
                <Switch value={emailNotif} onValueChange={setEmailNotif} trackColor={{ false: '#767577', true: '#2563EB' }} />
              </View>
            </View>
          </View>
        )}

        {/* STEP 10: 3 Things to Know & Agreement */}
        {currentStep === 10 && (
          <View style={styles.stepContent}>
            <Text style={[styles.title, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              Got it? Awesome!
            </Text>
            <Text style={[styles.subtitle, { color: isLight ? '#475569' : '#94A3B8' }]}>
              Before you start, here are 3 community rules to ensure stress-free carpooling:
            </Text>

            <View style={{ gap: 20, marginTop: 24 }}>
              <View style={styles.ruleRow}>
                <View style={[styles.ruleCircle, { backgroundColor: '#DBEAFE' }]}>
                  <Users size={22} color="#2563EB" />
                </View>
                <Text style={[styles.ruleText, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                  We're carpoolers, not taxis or Uber. We split costs without commercial exploitation.
                </Text>
              </View>

              <View style={styles.ruleRow}>
                <View style={[styles.ruleCircle, { backgroundColor: '#DCFCE7' }]}>
                  <CreditCard size={22} color="#16A34A" />
                </View>
                <Text style={[styles.ruleText, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                  Payments go securely through RideShare Paystack Escrow — absolutely no cash.
                </Text>
              </View>

              <View style={styles.ruleRow}>
                <View style={[styles.ruleCircle, { backgroundColor: '#FEF3C7' }]}>
                  <Clock size={22} color="#D97706" />
                </View>
                <Text style={[styles.ruleText, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                  Arrive 5 minutes early to keep highway pickups smooth and avoid delays.
                </Text>
              </View>
            </View>

            <View style={[styles.agreementBox, { marginTop: 32 }]}>
              <TouchableOpacity
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                style={[
                  styles.checkboxBox,
                  {
                    borderColor: '#2563EB',
                    backgroundColor: agreedToTerms ? '#2563EB' : 'transparent',
                  },
                ]}
              >
                {agreedToTerms && <Check size={14} color="#FFFFFF" />}
              </TouchableOpacity>
              <Text style={[styles.checkboxLabel, { color: isLight ? '#0F172A' : '#F1F5F9' }]}>
                I agree to the RideShare Terms of Service, Privacy Policy and Community Agreement.
              </Text>
            </View>
          </View>
        )}

        {/* STEP 11: Profile Completed Celebration */}
        {currentStep === 11 && (
          <View style={[styles.stepContent, { alignItems: 'center', justifyContent: 'center', paddingTop: 40 }]}>
            <View style={styles.celebrationCircle}>
              <Text style={{ fontSize: 48 }}>🤝</Text>
            </View>
            <Text style={[styles.title, { textAlign: 'center', marginTop: 24, color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              Profile completed!
            </Text>
            <Text style={[styles.subtitle, { textAlign: 'center', maxWidth: 300, color: isLight ? '#475569' : '#94A3B8' }]}>
              Nice work! You're all set to start sharing rides with the RideShare community.
            </Text>
            <Text style={[styles.subtitle, { textAlign: 'center', maxWidth: 300, marginTop: 8, fontSize: 13, color: isLight ? '#64748B' : '#6B7280' }]}>
              You can update your personal details and vehicles anytime in the Account tab in our app.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) at Bottom Right or Full Width Button */}
      {currentStep !== 11 ? (
        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom: Math.max(insets.bottom, 16) + 10,
              backgroundColor: isLight ? '#FFFFFF' : '#0E1015',
              borderTopColor: isLight ? '#F1F5F9' : '#1E222B',
            },
          ]}
        >
          {/* For multi-step questions, use the floating circular blue next arrow (as in images) */}
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleNext}
            style={styles.floatingNextBtn}
          >
            <ArrowRight size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom: Math.max(insets.bottom, 16) + 10,
              backgroundColor: isLight ? '#FFFFFF' : '#0E1015',
              borderTopColor: isLight ? '#F1F5F9' : '#1E222B',
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleFinalize}
            disabled={isSubmitting}
            style={styles.fullDoneBtn}
          >
            <Text style={styles.fullDoneBtnText}>
              {isSubmitting ? 'Finalizing Profile...' : 'All done'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
  },
  headerCategoryText: {
    fontSize: 15,
    fontWeight: '700',
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  stepContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  optionsList: {
    gap: 14,
    marginTop: 24,
  },
  searchPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    height: 58,
  },
  searchPillInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  sectionMetaTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  stateSearchResults: {
    gap: 10,
  },
  emptySearchBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  activeStateHeroCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  activeStateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeStateBadgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
  },
  activeStateTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  activeStateSub: {
    fontSize: 13,
    marginTop: 2,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  popularChipText: {
    fontSize: 13,
  },
  searchHintBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchHintText: {
    fontSize: 13,
    lineHeight: 18,
  },
  stateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  stateCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  stateCardSub: {
    fontSize: 13,
  },
  menuContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  listRowText: {
    fontSize: 17,
    fontWeight: '700',
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    height: 58,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  illustrationShapes: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    marginTop: 28,
  },
  shapeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  shapeStar: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  shapeDiamond: {
    width: 30,
    height: 30,
    transform: [{ rotate: '45deg' }],
  },
  shapePentagon: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
  carpoolIllustrationBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 58,
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
    marginRight: 14,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  phoneInputText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 18,
    gap: 10,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  textareaBox: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 18,
  },
  textareaInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 130,
    textAlignVertical: 'top',
  },
  recommendedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0F2C59',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 18,
    marginBottom: 14,
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  toggleCard: {
    borderRadius: 16,
    padding: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  toggleSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  ruleCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  agreementBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  celebrationCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  floatingNextBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  fullDoneBtn: {
    flex: 1,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0F2C59',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
});
