import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
  Modal,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronRight,
  Mail,
  Phone,
  UserPlus,
  X,
  ShieldCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../store/useAppStore';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme, themeMode } = useAppStore();
  const [showSheet, setShowSheet] = useState(false);

  const isLight = themeMode === 'light';

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, []);

  const handleOpenSheet = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setShowSheet(true);
  };

  const handleChooseMethod = (method: 'phone' | 'email') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setShowSheet(false);
    if (method === 'email') {
      router.push({
        pathname: '/auth/otp',
        params: { mode: 'signup', method: 'email' },
      });
    } else {
      router.push({
        pathname: '/auth/otp',
        params: { mode: 'otp_fallback', method: 'phone' },
      });
    }
  };

  const handleLoginExisting = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setShowSheet(false);
    router.push({
      pathname: '/auth/otp',
      params: { mode: 'login' },
    });
  };

  const handleOpenRegister = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setShowSheet(false);
    router.push({
      pathname: '/auth/otp',
      params: { mode: 'signup' },
    });
  };

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: isLight ? '#FFFFFF' : '#0B0D11',
        },
      ]}
    >
      {/* Full-Page Background Image covering the entire screen */}
      <Image
        source={require('../assets/welcome_screen_bg.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />

      {/* Subtle overlay to ensure maximum contrast and readability */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isLight
              ? 'rgba(255, 255, 255, 0.04)'
              : 'rgba(11, 13, 17, 0.45)',
          },
        ]}
      />

      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 16) + 4,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          },
        ]}
      >
        {/* Top Header with Progress Dash Indicators */}
        <View style={styles.topHeader}>
          {/* Subtle Brand Logo Mark */}
          <View style={styles.brandRow}>
            <Image
              source={require('../assets/icon.png')}
              style={styles.logoMark}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.brandName,
                { color: isLight ? '#0F172A' : '#FFFFFF' },
              ]}
            >
              Ride<Text style={{ color: '#E06B26' }}>Share</Text>
            </Text>
          </View>

          {/* Minimalist 2-Segment Indicator Bar */}
          <View style={styles.dashIndicatorRow}>
            <View
              style={[
                styles.dashBar,
                styles.dashBarActive,
                { backgroundColor: isLight ? '#0F172A' : '#FFFFFF' },
              ]}
            />
            <View
              style={[
                styles.dashBar,
                styles.dashBarInactive,
                { backgroundColor: isLight ? '#CBD5E1' : '#334155' },
              ]}
            />
          </View>
        </View>

        {/* Hero Typography */}
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.headline,
              { color: isLight ? '#0F172A' : '#FFFFFF' },
            ]}
          >
            Your <Text style={styles.italicCity}>City</Text>,{'\n'}One Tap Away
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: isLight ? '#334155' : '#CBD5E1' },
            ]}
          >
            Ride smarter with fast pickups, real-time tracking, and smooth travel
            anywhere in the city.
          </Text>
        </View>

        {/* Center Graphic Spacer: allows the luxury car and navigation route map in welcome_full_bg to be centered and clearly visible */}
        <View style={styles.centerSpacer} />

        {/* Bottom Action Area */}
        <View style={styles.bottomSection}>
          {/* Main Continue Pill Button matching Reference Photo */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleOpenSheet}
            style={[
              styles.continuePill,
              {
                backgroundColor: isLight ? '#111827' : '#141721',
                borderColor: isLight
                  ? 'transparent'
                  : 'rgba(255, 255, 255, 0.1)',
                borderWidth: isLight ? 0 : 1,
              },
            ]}
          >
            <Text style={styles.continueText}>Continue</Text>
            <View style={styles.arrowCircle}>
              <ChevronRight size={22} color="#FFFFFF" strokeWidth={2.6} />
            </View>
          </TouchableOpacity>

          {/* Secondary Quick Log-in Link */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleLoginExisting}
            style={styles.loginLink}
          >
            <Text
              style={[
                styles.loginLinkText,
                { color: isLight ? '#334155' : '#94A3B8' },
              ]}
            >
              Already have an account?{' '}
              <Text
                style={[
                  styles.loginLinkHighlight,
                  { color: isLight ? '#0F172A' : '#FFFFFF' },
                ]}
              >
                Log In
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sleek Method Selection Bottom Sheet */}
      <Modal
        visible={showSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSheet(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowSheet(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.sheetContainer,
                  {
                    backgroundColor: isLight ? '#FFFFFF' : '#141721',
                    paddingBottom: Math.max(insets.bottom, 20) + 12,
                  },
                ]}
              >
                {/* Pull-down drag bar */}
                <View style={styles.dragHandle} />

                {/* Sheet Title */}
                <View style={styles.sheetHeader}>
                  <Text
                    style={[
                      styles.sheetTitle,
                      { color: isLight ? '#0F172A' : '#FFFFFF' },
                    ]}
                  >
                    Get moving with RideShare
                  </Text>
                  <Text
                    style={[
                      styles.sheetSubtitle,
                      { color: isLight ? '#64748B' : '#94A3B8' },
                    ]}
                  >
                    Choose your preferred sign-in method
                  </Text>
                </View>

                {/* Options List */}
                <View style={styles.methodsList}>
                  {/* Option 1: Email Address */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleChooseMethod('email')}
                    style={[
                      styles.methodRow,
                      {
                        backgroundColor: isLight ? '#F8FAFC' : '#1C1F2B',
                        borderColor: isLight
                          ? '#E2E8F0'
                          : 'rgba(255, 255, 255, 0.08)',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.methodIconBadge,
                        { backgroundColor: 'rgba(224, 107, 38, 0.12)' },
                      ]}
                    >
                      <Mail size={20} color="#E06B26" />
                    </View>
                    <View style={styles.methodInfo}>
                      <Text
                        style={[
                          styles.methodName,
                          { color: isLight ? '#0F172A' : '#FFFFFF' },
                        ]}
                      >
                        Continue with Email Address
                      </Text>
                      <Text
                        style={[
                          styles.methodDesc,
                          { color: isLight ? '#64748B' : '#94A3B8' },
                        ]}
                      >
                        Verification code sent to your inbox
                      </Text>
                    </View>
                    <ChevronRight
                      size={18}
                      color={isLight ? '#94A3B8' : '#64748B'}
                    />
                  </TouchableOpacity>

                  {/* Option 2: Nigerian Mobile Phone */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleChooseMethod('phone')}
                    style={[
                      styles.methodRow,
                      {
                        backgroundColor: isLight ? '#F8FAFC' : '#1C1F2B',
                        borderColor: isLight
                          ? '#E2E8F0'
                          : 'rgba(255, 255, 255, 0.08)',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.methodIconBadge,
                        { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
                      ]}
                    >
                      <Phone size={20} color="#10B981" />
                    </View>
                    <View style={styles.methodInfo}>
                      <Text
                        style={[
                          styles.methodName,
                          { color: isLight ? '#0F172A' : '#FFFFFF' },
                        ]}
                      >
                        Continue with Nigerian Phone (+234)
                      </Text>
                      <Text
                        style={[
                          styles.methodDesc,
                          { color: isLight ? '#64748B' : '#94A3B8' },
                        ]}
                      >
                        Instant SMS OTP verification
                      </Text>
                    </View>
                    <ChevronRight
                      size={18}
                      color={isLight ? '#94A3B8' : '#64748B'}
                    />
                  </TouchableOpacity>

                  {/* Option 3: Full Multi-Step Registration */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleOpenRegister}
                    style={[
                      styles.methodRow,
                      {
                        backgroundColor: isLight ? '#F8FAFC' : '#1C1F2B',
                        borderColor: isLight
                          ? '#E2E8F0'
                          : 'rgba(255, 255, 255, 0.08)',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.methodIconBadge,
                        { backgroundColor: 'rgba(56, 189, 248, 0.12)' },
                      ]}
                    >
                      <UserPlus size={20} color="#0284C7" />
                    </View>
                    <View style={styles.methodInfo}>
                      <Text
                        style={[
                          styles.methodName,
                          { color: isLight ? '#0F172A' : '#FFFFFF' },
                        ]}
                      >
                        Create New Commuter / Driver Account
                      </Text>
                      <Text
                        style={[
                          styles.methodDesc,
                          { color: isLight ? '#64748B' : '#94A3B8' },
                        ]}
                      >
                        Step-by-step verified onboarding
                      </Text>
                    </View>
                    <ChevronRight
                      size={18}
                      color={isLight ? '#94A3B8' : '#64748B'}
                    />
                  </TouchableOpacity>
                </View>

                {/* Cancel / Dismiss button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowSheet(false)}
                  style={styles.sheetCancelBtn}
                >
                  <Text
                    style={[
                      styles.sheetCancelText,
                      { color: isLight ? '#64748B' : '#94A3B8' },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden',
    height: Platform.OS === 'web' ? ('100vh' as any) : '100%',
    maxHeight: Platform.OS === 'web' ? ('100vh' as any) : '100%',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    marginBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  brandName: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  dashIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dashBar: {
    height: 3.5,
    borderRadius: 2,
  },
  dashBarActive: {
    width: 48,
  },
  dashBarInactive: {
    width: 48,
  },
  textContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  headline: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  italicCity: {
    fontStyle: 'italic',
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    fontWeight: '500',
  },
  centerSpacer: {
    flex: 1,
  },
  bottomSection: {
    paddingTop: 6,
    paddingBottom: 4,
    gap: 12,
  },
  continuePill: {
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 26,
    paddingRight: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 5,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  arrowCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E06B26',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E06B26',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 2,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  loginLinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginLinkHighlight: {
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(150, 150, 150, 0.4)',
    alignSelf: 'center',
    marginBottom: 18,
  },
  sheetHeader: {
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 14,
  },
  methodsList: {
    gap: 12,
    marginBottom: 16,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
  },
  methodIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  methodDesc: {
    fontSize: 12,
  },
  sheetCancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  sheetCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
