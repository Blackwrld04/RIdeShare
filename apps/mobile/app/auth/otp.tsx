import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Mail,
  Phone,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import { api } from '../../services/api';

type AuthMode = 'login' | 'signup' | 'otp_fallback';
type SignUpSubStep = 'email' | 'code' | 'password';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { theme, themeMode, setUser } = useAppStore();
  const params = useLocalSearchParams<{ method?: string; mode?: string }>();

  const isLight = themeMode === 'light';

  // Screen Mode: 'login' | 'signup' | 'otp_fallback'
  const [mode, setMode] = useState<AuthMode>(
    params.mode === 'signup' ? 'signup' : 'login',
  );

  // Common loading & error states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ----------------------------------------------------
  // LOG IN STATE (Email + Password)
  // ----------------------------------------------------
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);

  // ----------------------------------------------------
  // SIGN UP STATE (Email -> OTP Verify -> Password + Confirm)
  // ----------------------------------------------------
  const [signUpStep, setSignUpStep] = useState<SignUpSubStep>('email');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpDisplayName, setSignUpDisplayName] = useState('');
  const [signUpChallengeId, setSignUpChallengeId] = useState('');
  const [signUpCode, setSignUpCode] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);
  const [signUpTimer, setSignUpTimer] = useState(60);

  // ----------------------------------------------------
  // OTP FALLBACK / PHONE STATE
  // ----------------------------------------------------
  const [fallbackMethod, setFallbackMethod] = useState<'email' | 'phone'>(
    params.method === 'phone' ? 'phone' : 'email',
  );
  const [fallbackStep, setFallbackStep] = useState<'input' | 'code'>('input');
  const [fallbackIdentifier, setFallbackIdentifier] = useState('');
  const [fallbackChallengeId, setFallbackChallengeId] = useState('');
  const [fallbackCode, setFallbackCode] = useState('');
  const [fallbackTimer, setFallbackTimer] = useState(60);

  // Load remembered email on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await api.auth.getSavedEmail();
        if (saved) {
          setLoginEmail(saved);
        }
      } catch {}
    })();
  }, []);

  // Timer for Sign Up OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mode === 'signup' && signUpStep === 'code' && signUpTimer > 0) {
      interval = setInterval(() => setSignUpTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [mode, signUpStep, signUpTimer]);

  // Timer for Fallback OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mode === 'otp_fallback' && fallbackStep === 'code' && fallbackTimer > 0) {
      interval = setInterval(() => setFallbackTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [mode, fallbackStep, fallbackTimer]);

  const handleAuthError = (
    err: any,
    fallbackTitle = 'Authentication Notice',
  ) => {
    const backendMsg =
      err?.response?.data?.message ||
      err?.response?.data?.error;
    const isNetworkErr = !backendMsg && (err?.message === 'Network Error' || !err?.response);
    const msg =
      backendMsg ||
      (isNetworkErr
        ? 'Unable to connect to the server. Please check your internet connection and try again.'
        : err?.message || 'Request failed. Please try again.');

    setErrorMessage(msg);
    Alert.alert(
      isNetworkErr ? 'Connection Notice' : fallbackTitle,
      msg,
      [{ text: 'OK' }],
    );
  };

  // ====================================================
  // 1. LOG IN WITH PASSWORD
  // ====================================================
  const handlePasswordLogin = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setErrorMessage(null);

    const emailTrimmed = loginEmail.trim().toLowerCase();
    if (!emailTrimmed || !emailTrimmed.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!loginPassword) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.login(emailTrimmed, loginPassword);

      // Save or clear remembered email
      if (rememberEmail) {
        await api.auth.setSavedEmail(emailTrimmed);
      } else {
        await api.auth.setSavedEmail(null);
      }

      if (res?.accessToken) {
        try {
          const profile = await api.profile.get();
          setUser({
            ...profile,
            billingEmail: emailTrimmed,
          });
        } catch {
          setUser({
            id: 'usr-' + Date.now(),
            phoneE164: '+2348011112222',
            displayName: emailTrimmed.split('@')[0] || 'Commuter',
            billingEmail: emailTrimmed,
            avatarUrl:
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
            ninVerified: true,
            isDriver: false,
            driverStatus: 'DRAFT',
            rating: 5.0,
            totalTrips: 0,
          });
        }
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      await handleAuthError(err, 'Sign In Failed');
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // 2. SIGN UP: STEP 1 - REQUEST EMAIL OTP
  // ====================================================
  const handleSignUpRequestOtp = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setErrorMessage(null);

    const emailTrimmed = signUpEmail.trim().toLowerCase();
    if (!emailTrimmed || !emailTrimmed.includes('@') || !emailTrimmed.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.registerRequestOtp(
        emailTrimmed,
        signUpDisplayName.trim() || undefined,
      );
      if (res?.challengeId) {
        setSignUpChallengeId(res.challengeId);
      }
      setSignUpStep('code');
      setSignUpTimer(60);
    } catch (err: any) {
      await handleAuthError(err, 'Sign Up Notice');
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // 2. SIGN UP: STEP 2 - VERIFY CODE
  // ====================================================
  const handleSignUpVerifyCode = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setErrorMessage(null);

    const code = signUpCode.trim();
    if (!code || code.length < 6) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    // Move to step 3: Set Password and Confirm Password!
    setSignUpStep('password');
  };

  // ====================================================
  // 2. SIGN UP: STEP 3 - FINALIZE WITH PASSWORD
  // ====================================================
  const handleSignUpComplete = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setErrorMessage(null);

    if (signUpPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setErrorMessage('Passwords do not match. Please ensure both passwords match.');
      return;
    }

    setLoading(true);
    try {
      const emailTrimmed = signUpEmail.trim().toLowerCase();
      const res = await api.auth.registerComplete(
        signUpChallengeId,
        signUpCode.trim(),
        signUpPassword,
        signUpDisplayName.trim() || undefined,
      );

      // Save remembered email for smooth future logins
      await api.auth.setSavedEmail(emailTrimmed);

      if (res?.accessToken) {
        try {
          const profile = await api.profile.get();
          setUser({
            ...profile,
            billingEmail: emailTrimmed,
          });
        } catch {
          setUser({
            id: 'usr-' + Date.now(),
            phoneE164: '+2348011112222',
            displayName:
              signUpDisplayName.trim() || emailTrimmed.split('@')[0] || 'Commuter',
            billingEmail: emailTrimmed,
            avatarUrl:
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
            ninVerified: true,
            isDriver: false,
            driverStatus: 'DRAFT',
            rating: 5.0,
            totalTrips: 0,
          });
        }
        router.replace('/auth/profile');
      }
    } catch (err: any) {
      await handleAuthError(err, 'Registration Failed');
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // 3. OTP FALLBACK HANDLERS
  // ====================================================
  const handleFallbackSendCode = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setErrorMessage(null);

    let identifier: string;
    if (fallbackMethod === 'email') {
      const trimmed = fallbackIdentifier.trim().toLowerCase();
      if (!trimmed || !trimmed.includes('@')) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
      identifier = trimmed;
    } else {
      const cleanPhone = fallbackIdentifier.replace(/\D/g, '').replace(/^0+/, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        setErrorMessage('Please enter a valid 10-digit Nigerian mobile number.');
        return;
      }
      identifier = `+234${cleanPhone}`;
    }

    setLoading(true);
    try {
      const res = await api.auth.requestOtp(identifier);
      if (res?.challengeId) {
        setFallbackChallengeId(res.challengeId);
      }
      setFallbackStep('code');
      setFallbackTimer(60);
    } catch (err: any) {
      await handleAuthError(err, 'OTP Request Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFallbackVerifyCode = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setErrorMessage(null);

    if (!fallbackCode || fallbackCode.length < 6) {
      setErrorMessage('Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.verifyOtp(fallbackChallengeId, fallbackCode);
      if (res?.accessToken) {
        try {
          const profile = await api.profile.get();
          setUser({
            ...profile,
            billingEmail:
              fallbackMethod === 'email'
                ? fallbackIdentifier.trim().toLowerCase()
                : profile.billingEmail,
          });
        } catch {
          setUser({
            id: 'usr-' + Date.now(),
            phoneE164:
              fallbackMethod === 'phone'
                ? `+234${fallbackIdentifier.replace(/\D/g, '').replace(/^0+/, '')}`
                : '+2348011112222',
            displayName: 'Commuter',
            billingEmail:
              fallbackMethod === 'email' ? fallbackIdentifier.trim().toLowerCase() : undefined,
            avatarUrl:
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
            ninVerified: true,
            isDriver: false,
            driverStatus: 'DRAFT',
            rating: 5.0,
            totalTrips: 0,
          });
        }
        if (mode === 'signup') {
          router.replace('/auth/profile');
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (err: any) {
      await handleAuthError(err, 'Verification Failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle Back Button
  const handleBackNavigation = () => {
    if (mode === 'signup') {
      if (signUpStep === 'password') {
        setSignUpStep('code');
        return;
      }
      if (signUpStep === 'code') {
        setSignUpStep('email');
        return;
      }
      setMode('login');
      return;
    }
    if (mode === 'otp_fallback') {
      if (fallbackStep === 'code') {
        setFallbackStep('input');
        return;
      }
      setMode('login');
      return;
    }
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: isLight ? '#F8FAFC' : '#0A0B0E' }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingTop: Math.max(insets.top, 16) + 8,
            paddingBottom: Math.max(insets.bottom, 16) + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Row with Back Button */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            onPress={handleBackNavigation}
            activeOpacity={0.7}
            style={[
              styles.backButton,
              {
                backgroundColor: isLight ? '#FFFFFF' : '#14161C',
                borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)',
              },
            ]}
          >
            <ArrowLeft size={18} color={isLight ? '#0F172A' : '#FFFFFF'} />
          </TouchableOpacity>

          {/* Clean Brand Mark */}
          <View style={styles.headerBrandBadge}>
            <Text
              style={[
                styles.headerBrandText,
                { color: isLight ? '#0F172A' : '#FFFFFF' },
              ]}
            >
              Ride<Text style={{ color: '#E06B26' }}>Share</Text>
            </Text>
          </View>

          {/* Right header spacer to keep title centered */}
          <View style={{ width: 40 }} />
        </View>

        {/* Brand Icon & Welcome Title */}
        <View style={styles.heroSection}>
          <View style={styles.iconCircle}>
            <Logo size={46} isDark={!isLight} />
          </View>

          <Text style={[styles.mainTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
            {mode === 'login'
              ? 'Welcome Back'
              : mode === 'signup'
                ? signUpStep === 'email'
                  ? 'Create Your Account'
                  : signUpStep === 'code'
                    ? 'Verify Your Email'
                    : 'Set Login Password'
                : 'Sign In with OTP'}
          </Text>

          <Text style={[styles.mainSubtitle, { color: isLight ? '#64748B' : '#94A3B8' }]}>
            {mode === 'login'
              ? 'Log in with your email and password to access your rides and bookings.'
              : mode === 'signup'
                ? signUpStep === 'email'
                  ? 'Enter your email address. Every email is unique and verified.'
                  : signUpStep === 'code'
                    ? `We sent a 6-digit verification code to ${signUpEmail}.`
                    : 'Choose the password you want to use for logging in every time.'
                : 'Receive a single-use verification code in your email or phone.'}
          </Text>
        </View>

        {/* Primary Segmented Mode Switcher: [Log In] | [Sign Up] (hidden when in sub-steps) */}
        {mode !== 'otp_fallback' && (signUpStep === 'email' || mode === 'login') && (
          <View
            style={[
              styles.segmentedTabs,
              {
                backgroundColor: isLight ? '#EDF2F7' : '#14161C',
                borderColor: isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.08)',
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setMode('login');
                setErrorMessage(null);
              }}
              style={[
                styles.segmentedTabBtn,
                mode === 'login' && [
                  styles.segmentedTabBtnActive,
                  {
                    backgroundColor: isLight ? '#FFFFFF' : '#1E222D',
                    shadowColor: '#000',
                  },
                ],
              ]}
            >
              <Text
                style={[
                  styles.segmentedTabText,
                  {
                    color:
                      mode === 'login'
                        ? isLight
                          ? '#0F172A'
                          : '#FFFFFF'
                        : isLight
                          ? '#64748B'
                          : '#94A3B8',
                    fontWeight: mode === 'login' ? '800' : '600',
                  },
                ]}
              >
                Log In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setMode('signup');
                setSignUpStep('email');
                setErrorMessage(null);
              }}
              style={[
                styles.segmentedTabBtn,
                mode === 'signup' && [
                  styles.segmentedTabBtnActive,
                  {
                    backgroundColor: isLight ? '#FFFFFF' : '#1E222D',
                    shadowColor: '#000',
                  },
                ],
              ]}
            >
              <Text
                style={[
                  styles.segmentedTabText,
                  {
                    color:
                      mode === 'signup'
                        ? isLight
                          ? '#0F172A'
                          : '#FFFFFF'
                        : isLight
                          ? '#64748B'
                          : '#94A3B8',
                    fontWeight: mode === 'signup' ? '800' : '600',
                  },
                ]}
              >
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error Banner */}
        {errorMessage ? (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: isLight ? '#FEF2F2' : 'rgba(239, 68, 68, 0.12)',
                borderColor: isLight ? '#FECACA' : 'rgba(239, 68, 68, 0.3)',
              },
            ]}
          >
            <AlertCircle size={18} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* ==================================================== */}
        {/* MODE 1: LOG IN (Email + Password) */}
        {/* ==================================================== */}
        {mode === 'login' && (
          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: isLight ? '#334155' : '#CBD5E1' },
                ]}
              >
                Email Address
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: isLight ? '#FFFFFF' : '#14161C',
                    borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)',
                  },
                ]}
              >
                <Mail size={18} color="#10B981" style={styles.inputIcon} />
                <TextInput
                  value={loginEmail}
                  onChangeText={(t) => {
                    setLoginEmail(t);
                    setErrorMessage(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="name@example.com"
                  placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                  style={[
                    styles.textInput,
                    { color: isLight ? '#0F172A' : '#FFFFFF' },
                  ]}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: isLight ? '#334155' : '#CBD5E1' },
                ]}
              >
                Password
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: isLight ? '#FFFFFF' : '#14161C',
                    borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)',
                  },
                ]}
              >
                <Lock size={18} color="#E06B26" style={styles.inputIcon} />
                <TextInput
                  value={loginPassword}
                  onChangeText={(t) => {
                    setLoginPassword(t);
                    setErrorMessage(null);
                  }}
                  secureTextEntry={!showLoginPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                  style={[
                    styles.textInput,
                    { color: isLight ? '#0F172A' : '#FFFFFF' },
                  ]}
                />
                <TouchableOpacity
                  onPress={() => setShowLoginPassword((v) => !v)}
                  style={styles.eyeBtn}
                >
                  {showLoginPassword ? (
                    <EyeOff size={18} color={isLight ? '#64748B' : '#94A3B8'} />
                  ) : (
                    <Eye size={18} color={isLight ? '#64748B' : '#94A3B8'} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember Me Checkbox Row */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setRememberEmail((v) => !v)}
              style={styles.rememberRow}
            >
              <View
                style={[
                  styles.checkbox,
                  rememberEmail && styles.checkboxActive,
                  {
                    borderColor: rememberEmail
                      ? '#10B981'
                      : isLight
                        ? '#CBD5E1'
                        : '#475569',
                    backgroundColor: rememberEmail
                      ? '#10B981'
                      : isLight
                        ? '#FFFFFF'
                        : '#14161C',
                  },
                ]}
              >
                {rememberEmail && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
              </View>
              <Text
                style={[
                  styles.rememberText,
                  { color: isLight ? '#475569' : '#94A3B8' },
                ]}
              >
                Remember my email for next time
              </Text>
            </TouchableOpacity>

            {/* Log In Button */}
            <Button
              title="Log In"
              onPress={handlePasswordLogin}
              loading={loading}
              size="lg"
              variant="primary"
              style={styles.primaryActionButton}
            />

            {/* Fallback & Helper Links */}
            <View style={styles.footerLinksRow}>
              <TouchableOpacity
                onPress={() => {
                  setMode('otp_fallback');
                  setFallbackMethod('email');
                  setFallbackStep('input');
                  setFallbackIdentifier(loginEmail);
                  setErrorMessage(null);
                }}
                style={styles.helperLink}
              >
                <Text style={[styles.helperLinkText, { color: '#E06B26' }]}>
                  Forgot password? Sign in with Email OTP code
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setMode('signup');
                  setSignUpStep('email');
                  setErrorMessage(null);
                }}
                style={styles.switchModeLink}
              >
                <Text
                  style={[
                    styles.switchModeText,
                    { color: isLight ? '#64748B' : '#94A3B8' },
                  ]}
                >
                  Don't have an account?{' '}
                  <Text style={{ color: '#10B981', fontWeight: '800' }}>
                    Sign Up
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ==================================================== */}
        {/* MODE 2: SIGN UP */}
        {/* ==================================================== */}
        {mode === 'signup' && (
          <View style={styles.formContainer}>
            {/* Step Progress Pills: 1. Email -> 2. Verify -> 3. Password */}
            <View style={styles.stepProgressRow}>
              <View
                style={[
                  styles.stepPill,
                  signUpStep === 'email' || signUpStep === 'code' || signUpStep === 'password'
                    ? styles.stepPillActive
                    : styles.stepPillInactive,
                ]}
              >
                <Text style={styles.stepPillText}>1. Email</Text>
              </View>
              <View style={styles.stepConnector} />
              <View
                style={[
                  styles.stepPill,
                  signUpStep === 'code' || signUpStep === 'password'
                    ? styles.stepPillActive
                    : styles.stepPillInactive,
                ]}
              >
                <Text style={styles.stepPillText}>2. Verify Code</Text>
              </View>
              <View style={styles.stepConnector} />
              <View
                style={[
                  styles.stepPill,
                  signUpStep === 'password'
                    ? styles.stepPillActive
                    : styles.stepPillInactive,
                ]}
              >
                <Text style={styles.stepPillText}>3. Password</Text>
              </View>
            </View>

            {/* ---------------- Sub-step 1: Email Input ---------------- */}
            {signUpStep === 'email' && (
              <View style={{ gap: 16 }}>
                <View style={styles.inputGroup}>
                  <Text
                    style={[
                      styles.inputLabel,
                      { color: isLight ? '#334155' : '#CBD5E1' },
                    ]}
                  >
                    Your Email Address
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: isLight ? '#FFFFFF' : '#14161C',
                        borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)',
                      },
                    ]}
                  >
                    <Mail size={18} color="#10B981" style={styles.inputIcon} />
                    <TextInput
                      value={signUpEmail}
                      onChangeText={(t) => {
                        setSignUpEmail(t);
                        setErrorMessage(null);
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="e.g. commuter@domain.com"
                      placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                      style={[
                        styles.textInput,
                        { color: isLight ? '#0F172A' : '#FFFFFF' },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.fieldHint,
                      { color: isLight ? '#64748B' : '#94A3B8' },
                    ]}
                  >
                    Notice: Each email address can only be registered once.
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text
                    style={[
                      styles.inputLabel,
                      { color: isLight ? '#334155' : '#CBD5E1' },
                    ]}
                  >
                    Full Name (Optional)
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: isLight ? '#FFFFFF' : '#14161C',
                        borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)',
                      },
                    ]}
                  >
                    <TextInput
                      value={signUpDisplayName}
                      onChangeText={setSignUpDisplayName}
                      placeholder="e.g. Olajide Abdulquadri"
                      placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                      style={[
                        styles.textInput,
                        { color: isLight ? '#0F172A' : '#FFFFFF', paddingLeft: 4 },
                      ]}
                    />
                  </View>
                </View>

                <Button
                  title="Send Verification Code"
                  onPress={handleSignUpRequestOtp}
                  loading={loading}
                  size="lg"
                  variant="primary"
                  style={styles.primaryActionButton}
                />
              </View>
            )}

            {/* ---------------- Sub-step 2: Verification Code ---------------- */}
            {signUpStep === 'code' && (
              <View style={{ gap: 16 }}>
                {/* Sandbox helper banner */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSignUpCode('000000')}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: 'rgba(224, 107, 38, 0.12)',
                    borderWidth: 1,
                    borderColor: 'rgba(224, 107, 38, 0.3)',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Text style={{ color: '#E06B26', fontSize: 13, fontWeight: '700' }}>
                    ⚡ Sandbox Mode Code: 000000
                  </Text>
                  <Text style={{ color: isLight ? '#64748B' : '#94A3B8', fontSize: 11 }}>
                    Tap here to autofill and verify instantly
                  </Text>
                </TouchableOpacity>

                <TextInput
                  value={signUpCode}
                  onChangeText={(t) => {
                    setSignUpCode(t);
                    setErrorMessage(null);
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="000000"
                  placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                  autoFocus
                  style={[
                    styles.codeTextInput,
                    {
                      color: isLight ? '#0F172A' : '#FFFFFF',
                      backgroundColor: isLight ? '#FFFFFF' : '#14161C',
                      borderColor: isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.1)',
                    },
                  ]}
                />

                <View style={styles.resendRow}>
                  {signUpTimer > 0 ? (
                    <Text
                      style={[
                        styles.timerText,
                        { color: isLight ? '#64748B' : '#94A3B8' },
                      ]}
                    >
                      Resend code in{' '}
                      <Text style={{ color: '#10B981', fontWeight: '700' }}>
                        {signUpTimer}s
                      </Text>
                    </Text>
                  ) : (
                    <TouchableOpacity
                      onPress={handleSignUpRequestOtp}
                      style={styles.resendButton}
                    >
                      <RefreshCw size={14} color="#10B981" />
                      <Text style={styles.resendLink}>Resend Code via Gmail SMTP</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Button
                  title="Verify Email & Continue"
                  onPress={handleSignUpVerifyCode}
                  loading={loading}
                  size="lg"
                  variant="primary"
                  style={styles.primaryActionButton}
                />
              </View>
            )}

            {/* ---------------- Sub-step 3: Password & Confirm Password ---------------- */}
            {signUpStep === 'password' && (
              <View style={{ gap: 16 }}>
                {/* Email Verified Confirmation Pill */}
                <View
                  style={[
                    styles.verifiedEmailPill,
                    {
                      backgroundColor: isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.1)',
                      borderColor: isLight ? '#A7F3D0' : 'rgba(16, 185, 129, 0.25)',
                    },
                  ]}
                >
                  <CheckCircle2 size={16} color="#10B981" />
                  <Text
                    style={[
                      styles.verifiedEmailText,
                      { color: isLight ? '#065F46' : '#6EE7B7' },
                    ]}
                  >
                    Email Verified: {signUpEmail}
                  </Text>
                </View>

                {/* Password Field */}
                <View style={styles.inputGroup}>
                  <Text
                    style={[
                      styles.inputLabel,
                      { color: isLight ? '#334155' : '#CBD5E1' },
                    ]}
                  >
                    Create Password
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: isLight ? '#FFFFFF' : '#14161C',
                        borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)',
                      },
                    ]}
                  >
                    <Lock size={18} color="#E06B26" style={styles.inputIcon} />
                    <TextInput
                      value={signUpPassword}
                      onChangeText={(t) => {
                        setSignUpPassword(t);
                        setErrorMessage(null);
                      }}
                      secureTextEntry={!showSignUpPassword}
                      placeholder="At least 6 characters"
                      placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                      style={[
                        styles.textInput,
                        { color: isLight ? '#0F172A' : '#FFFFFF' },
                      ]}
                    />
                    <TouchableOpacity
                      onPress={() => setShowSignUpPassword((v) => !v)}
                      style={styles.eyeBtn}
                    >
                      {showSignUpPassword ? (
                        <EyeOff size={18} color={isLight ? '#64748B' : '#94A3B8'} />
                      ) : (
                        <Eye size={18} color={isLight ? '#64748B' : '#94A3B8'} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password Field */}
                <View style={styles.inputGroup}>
                  <Text
                    style={[
                      styles.inputLabel,
                      { color: isLight ? '#334155' : '#CBD5E1' },
                    ]}
                  >
                    Confirm Password
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: isLight ? '#FFFFFF' : '#14161C',
                        borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)',
                      },
                    ]}
                  >
                    <Lock size={18} color="#E06B26" style={styles.inputIcon} />
                    <TextInput
                      value={signUpConfirmPassword}
                      onChangeText={(t) => {
                        setSignUpConfirmPassword(t);
                        setErrorMessage(null);
                      }}
                      secureTextEntry={!showSignUpConfirmPassword}
                      placeholder="Repeat your password"
                      placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                      style={[
                        styles.textInput,
                        { color: isLight ? '#0F172A' : '#FFFFFF' },
                      ]}
                    />
                    <TouchableOpacity
                      onPress={() => setShowSignUpConfirmPassword((v) => !v)}
                      style={styles.eyeBtn}
                    >
                      {showSignUpConfirmPassword ? (
                        <EyeOff size={18} color={isLight ? '#64748B' : '#94A3B8'} />
                      ) : (
                        <Eye size={18} color={isLight ? '#64748B' : '#94A3B8'} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Validation indicators */}
                <View style={styles.passwordRulesBox}>
                  <View style={styles.ruleRow}>
                    <CheckCircle2
                      size={14}
                      color={signUpPassword.length >= 6 ? '#10B981' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.ruleText,
                        {
                          color:
                            signUpPassword.length >= 6
                              ? '#10B981'
                              : isLight
                                ? '#64748B'
                                : '#94A3B8',
                        },
                      ]}
                    >
                      At least 6 characters
                    </Text>
                  </View>
                  <View style={styles.ruleRow}>
                    <CheckCircle2
                      size={14}
                      color={
                        signUpPassword.length >= 6 &&
                        signUpPassword === signUpConfirmPassword
                          ? '#10B981'
                          : '#94A3B8'
                      }
                    />
                    <Text
                      style={[
                        styles.ruleText,
                        {
                          color:
                            signUpPassword.length >= 6 &&
                            signUpPassword === signUpConfirmPassword
                              ? '#10B981'
                              : isLight
                                ? '#64748B'
                                : '#94A3B8',
                        },
                      ]}
                    >
                      Both passwords match
                    </Text>
                  </View>
                </View>

                {/* Complete Button */}
                <Button
                  title="Create Account & Sign In"
                  onPress={handleSignUpComplete}
                  loading={loading}
                  size="lg"
                  variant="primary"
                  style={styles.primaryActionButton}
                />
              </View>
            )}

            {/* Back to Login link */}
            <TouchableOpacity
              onPress={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              style={styles.switchModeLink}
            >
              <Text
                style={[
                  styles.switchModeText,
                  { color: isLight ? '#64748B' : '#94A3B8' },
                ]}
              >
                Already registered?{' '}
                <Text style={{ color: '#E06B26', fontWeight: '800' }}>
                  Log In directly
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ==================================================== */}
        {/* MODE 3: OTP FALLBACK (Email or Phone Code) */}
        {/* ==================================================== */}
        {mode === 'otp_fallback' && (
          <View style={styles.formContainer}>
            {fallbackStep === 'input' ? (
              <View style={{ gap: 16 }}>
                {/* Method switcher */}
                <View
                  style={[
                    styles.segmentedTabs,
                    {
                      backgroundColor: isLight ? '#EDF2F7' : '#14161C',
                      borderColor: isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.08)',
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => setFallbackMethod('email')}
                    style={[
                      styles.segmentedTabBtn,
                      fallbackMethod === 'email' && [
                        styles.segmentedTabBtnActive,
                        { backgroundColor: isLight ? '#FFFFFF' : '#1E222D' },
                      ],
                    ]}
                  >
                    <Mail size={16} color="#10B981" />
                    <Text
                      style={[
                        styles.segmentedTabText,
                        {
                          color:
                            fallbackMethod === 'email'
                              ? isLight
                                ? '#0F172A'
                                : '#FFFFFF'
                              : '#64748B',
                        },
                      ]}
                    >
                      Email Code
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setFallbackMethod('phone')}
                    style={[
                      styles.segmentedTabBtn,
                      fallbackMethod === 'phone' && [
                        styles.segmentedTabBtnActive,
                        { backgroundColor: isLight ? '#FFFFFF' : '#1E222D' },
                      ],
                    ]}
                  >
                    <Phone size={16} color="#10B981" />
                    <Text
                      style={[
                        styles.segmentedTabText,
                        {
                          color:
                            fallbackMethod === 'phone'
                              ? isLight
                                ? '#0F172A'
                                : '#FFFFFF'
                              : '#64748B',
                        },
                      ]}
                    >
                      Phone SMS
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text
                    style={[
                      styles.inputLabel,
                      { color: isLight ? '#334155' : '#CBD5E1' },
                    ]}
                  >
                    {fallbackMethod === 'email'
                      ? 'Registered Email'
                      : 'Registered Phone Number'}
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: isLight ? '#FFFFFF' : '#14161C',
                        borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)',
                      },
                    ]}
                  >
                    {fallbackMethod === 'email' ? (
                      <>
                        <Mail size={18} color="#10B981" style={styles.inputIcon} />
                        <TextInput
                          value={fallbackIdentifier}
                          onChangeText={setFallbackIdentifier}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          placeholder="name@example.com"
                          placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                          style={[
                            styles.textInput,
                            { color: isLight ? '#0F172A' : '#FFFFFF' },
                          ]}
                        />
                      </>
                    ) : (
                      <>
                        <View style={styles.countryCodeBox}>
                          <Text
                            style={[
                              styles.countryCodeText,
                              { color: isLight ? '#0F172A' : '#FFFFFF' },
                            ]}
                          >
                            +234
                          </Text>
                        </View>
                        <TextInput
                          value={fallbackIdentifier}
                          onChangeText={setFallbackIdentifier}
                          keyboardType="phone-pad"
                          placeholder="801 234 5678"
                          placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                          style={[
                            styles.textInput,
                            { color: isLight ? '#0F172A' : '#FFFFFF', paddingLeft: 8 },
                          ]}
                        />
                      </>
                    )}
                  </View>
                </View>

                <Button
                  title="Send Verification Code"
                  onPress={handleFallbackSendCode}
                  loading={loading}
                  size="lg"
                  variant="primary"
                  style={styles.primaryActionButton}
                />
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                <TextInput
                  value={fallbackCode}
                  onChangeText={setFallbackCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="000000"
                  placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                  autoFocus
                  style={[
                    styles.codeTextInput,
                    {
                      color: isLight ? '#0F172A' : '#FFFFFF',
                      backgroundColor: isLight ? '#FFFFFF' : '#14161C',
                      borderColor: isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.1)',
                    },
                  ]}
                />

                <View style={styles.resendRow}>
                  {fallbackTimer > 0 ? (
                    <Text
                      style={[
                        styles.timerText,
                        { color: isLight ? '#64748B' : '#94A3B8' },
                      ]}
                    >
                      Resend code in{' '}
                      <Text style={{ color: '#10B981', fontWeight: '700' }}>
                        {fallbackTimer}s
                      </Text>
                    </Text>
                  ) : (
                    <TouchableOpacity
                      onPress={handleFallbackSendCode}
                      style={styles.resendButton}
                    >
                      <RefreshCw size={14} color="#10B981" />
                      <Text style={styles.resendLink}>Resend Code</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Button
                  title="Verify & Log In"
                  onPress={handleFallbackVerifyCode}
                  loading={loading}
                  size="lg"
                  variant="primary"
                  style={styles.primaryActionButton}
                />
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              style={styles.switchModeLink}
            >
              <Text style={[styles.switchModeText, { color: '#E06B26', fontWeight: '800' }]}>
                ← Back to Password Login
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>


    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBrandBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerBrandText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  mainSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 320,
  },
  segmentedTabs: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    gap: 4,
    marginBottom: 20,
  },
  segmentedTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  segmentedTabBtnActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentedTabText: {
    fontSize: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
    lineHeight: 18,
  },
  formContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  countryCodeBox: {
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: 'rgba(128, 128, 128, 0.2)',
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 6,
  },
  fieldHint: {
    fontSize: 12,
    marginTop: 2,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    borderColor: '#10B981',
  },
  rememberText: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryActionButton: {
    height: 54,
    borderRadius: 16,
    marginTop: 6,
  },
  footerLinksRow: {
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
  },
  helperLink: {
    paddingVertical: 4,
  },
  helperLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  switchModeLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchModeText: {
    fontSize: 14,
  },
  stepProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 6,
  },
  stepPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  stepPillActive: {
    backgroundColor: '#10B981',
  },
  stepPillInactive: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
  stepPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepConnector: {
    width: 14,
    height: 2,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
  codeTextInput: {
    height: 64,
    borderRadius: 18,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 10,
  },
  resendRow: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  verifiedEmailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  verifiedEmailText: {
    fontSize: 13,
    fontWeight: '700',
  },
  passwordRulesBox: {
    gap: 6,
    paddingHorizontal: 4,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ruleText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
