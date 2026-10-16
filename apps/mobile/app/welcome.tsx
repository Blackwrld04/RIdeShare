import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Phone,
  Mail,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  TrendingDown,
  Users,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../store/useAppStore';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme, themeMode } = useAppStore();
  const [showMethods, setShowMethods] = useState(false);

  const handleStart = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setShowMethods(true);
  };

  const handleChooseMethod = (method: 'phone' | 'email') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.push({
      pathname: '/auth/otp',
      params: { method },
    });
  };

  const handleLoginExisting = () => {
    router.push('/auth/otp');
  };

  const isLight = themeMode === 'light';

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: isLight ? '#F8FAFC' : '#0A0B0E',
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: Math.max(insets.bottom, 20) + 10,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Top Header */}
        <View style={styles.brandRow}>
          <View style={styles.brandLeft}>
            <Image
              source={require('../assets/icon.png')}
              style={styles.headerLogoMini}
              resizeMode="contain"
            />
            <Text style={[styles.brandTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              Ride<Text style={{ color: '#10B981' }}>Share</Text>
            </Text>
          </View>
        </View>

        {!showMethods ? (
          /* Step 1: Splash / Welcome Hero Card */
          <View style={styles.heroContainer}>
            {/* Primary Hero Card Matching App Design */}
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: isLight ? '#FFFFFF' : '#14161C',
                  borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)',
                },
              ]}
            >
              {/* Prominent App Logo */}
              <View style={styles.logoWrapper}>
                <View
                  style={[
                    styles.logoContainer,
                    {
                      backgroundColor: isLight ? '#F1F5F9' : '#1C1F28',
                      borderColor: isLight ? '#CBD5E1' : 'rgba(16, 185, 129, 0.25)',
                    },
                  ]}
                >
                  <Image
                    source={require('../assets/icon.png')}
                    style={styles.heroLogoImage}
                    resizeMode="contain"
                  />
                </View>
              </View>

              <Text
                style={[
                  styles.heroCardHeading,
                  { color: isLight ? '#0F172A' : '#FFFFFF' },
                ]}
              >
                Safe, verified carpooling across Nigeria
              </Text>

              <Text
                style={[
                  styles.heroCardSubtext,
                  { color: isLight ? '#64748B' : '#94A3B8' },
                ]}
              >
                Share empty seats on daily inter-city commutes. Split fuel costs, beat highway surge fares, and travel safely with NIMC NIN-verified Nigerians.
              </Text>

              {/* Feature Highlights Grid */}
              <View style={styles.featuresList}>
                <View
                  style={[
                    styles.featureItem,
                    {
                      backgroundColor: isLight ? '#F8FAFC' : '#1C1E26',
                      borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.06)',
                    },
                  ]}
                >
                  <View style={[styles.featureIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                    <ShieldCheck size={18} color="#10B981" />
                  </View>
                  <View style={styles.featureTextBox}>
                    <Text style={[styles.featureTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                      NIMC NIN Identity Verified
                    </Text>
                    <Text style={[styles.featureSub, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                      Every driver and passenger is authenticated via national database.
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.featureItem,
                    {
                      backgroundColor: isLight ? '#F8FAFC' : '#1C1E26',
                      borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.06)',
                    },
                  ]}
                >
                  <View style={[styles.featureIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                    <TrendingDown size={18} color="#F59E0B" />
                  </View>
                  <View style={styles.featureTextBox}>
                    <Text style={[styles.featureTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                      Beat Highway Surge Fares
                    </Text>
                    <Text style={[styles.featureSub, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                      Fixed, fair fuel-split rates on Berger, Lekki, Kubwa & expressway corridors.
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.featureItem,
                    {
                      backgroundColor: isLight ? '#F8FAFC' : '#1C1E26',
                      borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.06)',
                    },
                  ]}
                >
                  <View style={[styles.featureIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
                    <MapPin size={18} color="#38BDF8" />
                  </View>
                  <View style={styles.featureTextBox}>
                    <Text style={[styles.featureTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                      All 36 States & FCT Abuja
                    </Text>
                    <Text style={[styles.featureSub, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                      Customized landmark stops and inter-city routes nationwide.
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={handleStart}
                style={[
                  styles.primaryPillBtn,
                  {
                    backgroundColor: isLight ? '#0F172A' : '#FFFFFF',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.primaryPillBtnText,
                    { color: isLight ? '#FFFFFF' : '#0A0B0E' },
                  ]}
                >
                  Get Started
                </Text>
                <ChevronRight size={18} color={isLight ? '#FFFFFF' : '#0A0B0E'} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleLoginExisting}
                style={styles.loginLinkBtn}
              >
                <Text style={[styles.loginLinkText, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                  Already have an account? <Text style={{ color: '#10B981', fontWeight: '800' }}>Log In</Text>
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.versionText, { color: isLight ? '#94A3B8' : '#64748B' }]}>
              RideShare Nigeria v2.4.0 • Encrypted & Escrow Protected
            </Text>
          </View>
        ) : (
          /* Step 2: Choose Sign-up Method Screen */
          <View style={styles.methodsContainer}>
            <View style={styles.methodsHeaderBox}>
              <Text
                style={[
                  styles.methodsHeading,
                  { color: isLight ? '#0F172A' : '#FFFFFF' },
                ]}
              >
                How do you want to continue?
              </Text>
              <Text
                style={[
                  styles.methodsSubheading,
                  { color: isLight ? '#64748B' : '#94A3B8' },
                ]}
              >
                Choose your preferred method to create your account or log in to RideShare.
              </Text>
            </View>

            {/* Option 1: Continue with Phone */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleChooseMethod('phone')}
              style={[
                styles.methodItem,
                {
                  backgroundColor: isLight ? '#FFFFFF' : '#14161C',
                  borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)',
                },
              ]}
            >
              <View style={[styles.methodIconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <Phone size={22} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.methodTitle,
                    { color: isLight ? '#0F172A' : '#FFFFFF' },
                  ]}
                >
                  Continue with Nigerian Phone (+234)
                </Text>
                <Text
                  style={[
                    styles.methodSub,
                    { color: isLight ? '#64748B' : '#94A3B8' },
                  ]}
                >
                  Instant SMS OTP verification
                </Text>
              </View>
              <ChevronRight size={20} color={isLight ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>

            {/* Option 2: Continue with Email */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleChooseMethod('email')}
              style={[
                styles.methodItem,
                {
                  backgroundColor: isLight ? '#FFFFFF' : '#14161C',
                  borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)',
                },
              ]}
            >
              <View style={[styles.methodIconWrapper, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
                <Mail size={22} color="#38BDF8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.methodTitle,
                    { color: isLight ? '#0F172A' : '#FFFFFF' },
                  ]}
                >
                  Continue with Email Address
                </Text>
                <Text
                  style={[
                    styles.methodSub,
                    { color: isLight ? '#64748B' : '#94A3B8' },
                  ]}
                >
                  Work or personal email authentication
                </Text>
              </View>
              <ChevronRight size={20} color={isLight ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>

            {/* Back to Hero */}
            <TouchableOpacity
              onPress={() => setShowMethods(false)}
              style={styles.backToWelcomeBtn}
            >
              <Text style={[styles.backToWelcomeText, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                ← Back to welcome screen
              </Text>
            </TouchableOpacity>

            {/* Already a member */}
            <View style={styles.alreadyMemberSection}>
              <Text
                style={[
                  styles.alreadyMemberTitle,
                  { color: isLight ? '#0F172A' : '#FFFFFF' },
                ]}
              >
                Already have an account?
              </Text>
              <TouchableOpacity onPress={handleLoginExisting}>
                <Text style={styles.loginGreenText}>Log in with OTP</Text>
              </TouchableOpacity>
            </View>

            {/* Direct multi-step register option */}
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <TouchableOpacity onPress={() => router.push('/auth/register')}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: isLight ? '#64748B' : '#94A3B8' }}>
                  New here? <Text style={{ color: '#10B981', fontWeight: '700' }}>Complete Full Registration</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Legal Notice */}
            <View
              style={[
                styles.legalNoticeContainer,
                { borderTopColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)' },
              ]}
            >
              <Text style={[styles.legalNoticeText, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                By signing up, you accept our <Text style={styles.legalLink}>Terms of Service</Text> and <Text style={styles.legalLink}>Community Guidelines</Text>.
              </Text>
              <Text style={[styles.legalNoticeText, { color: isLight ? '#64748B' : '#94A3B8', marginTop: 8 }]}>
                All payments are securely processed through Paystack Escrow. Drivers receive automated 24h bank settlement upon trip completion.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogoMini: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  countryTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  countryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    marginBottom: 24,
    alignItems: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoContainer: {
    width: 84,
    height: 84,
    borderRadius: 24,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  heroLogoImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  glowingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  glowingBadgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  heroCardHeading: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.6,
    marginBottom: 10,
  },
  heroCardSubtext: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
  },
  featuresList: {
    width: '100%',
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  featureIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextBox: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  primaryPillBtn: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryPillBtnText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  loginLinkBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  exploreLinkBtn: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  exploreText: {
    fontSize: 13,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 18,
    marginBottom: 6,
  },
  methodsContainer: {
    flex: 1,
  },
  methodsHeaderBox: {
    marginBottom: 24,
    marginTop: 6,
  },
  methodsHeading: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  methodsSubheading: {
    fontSize: 14,
    lineHeight: 20,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  methodIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  methodTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  methodSub: {
    fontSize: 12,
  },
  backToWelcomeBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  backToWelcomeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  alreadyMemberSection: {
    marginTop: 18,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  alreadyMemberTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  loginGreenText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10B981',
  },
  legalNoticeContainer: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 'auto',
  },
  legalNoticeText: {
    fontSize: 11,
    lineHeight: 16,
  },
  legalLink: {
    color: '#10B981',
    textDecorationLine: 'underline',
  },
});
