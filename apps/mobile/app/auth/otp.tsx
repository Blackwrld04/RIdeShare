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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Phone,
  Mail,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import { api } from '../../services/api';

export default function OtpVerificationScreen() {
  const insets = useSafeAreaInsets();
  const { theme, themeMode, setUser } = useAppStore();
  const params = useLocalSearchParams<{ method?: string }>();

  const isLight = themeMode === 'light';

  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>(
    params.method === 'phone' ? 'phone' : 'email',
  );
  const [step, setStep] = useState<'input' | 'code'>('input');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [challengeId, setChallengeId] = useState<string>('');
  const [otpCode, setOtpCode] = useState('');
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'code' && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleSendCode = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    let identifier: string;
    if (authMethod === 'email') {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
      }
      identifier = trimmedEmail;
    } else {
      const cleanPhone = phoneNumber.replace(/\D/g, '').replace(/^0+/, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        Alert.alert('Invalid Number', 'Please enter a valid 10-digit Nigerian mobile number.');
        return;
      }
      identifier = `+234${cleanPhone}`;
    }

    setLoading(true);
    try {
      const res = await api.auth.requestOtp(identifier);
      if (res?.challengeId) {
        setChallengeId(res.challengeId);
      }
      setStep('code');
      setTimer(60);
    } catch (err: any) {
      Alert.alert(
        'Request Failed',
        err?.response?.data?.message || err?.message || 'Failed to request OTP',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    if (!otpCode || otpCode.length < 6) {
      Alert.alert('Incomplete Code', 'Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.verifyOtp(challengeId, otpCode);

      if (res?.accessToken) {
        try {
          const profile = await api.profile.get();
          setUser({
            ...profile,
            billingEmail: authMethod === 'email' ? email.trim().toLowerCase() : profile.billingEmail,
          });
        } catch {
          const cleanPhone = `+234${phoneNumber.replace(/\D/g, '').replace(/^0+/, '')}`;
          setUser({
            id: 'usr-' + Date.now(),
            phoneE164: authMethod === 'phone' ? cleanPhone : '+2348011112222',
            displayName:
              authMethod === 'email'
                ? email.split('@')[0] || 'Olajide Abdulquadri'
                : 'Olajide Abdulquadri',
            billingEmail: email.trim().toLowerCase(),
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
      Alert.alert(
        'Verification Failed',
        err?.response?.data?.message || err?.message || 'Invalid verification code',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: isLight ? '#F8FAFC' : '#0A0B0E' }]}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 20) + 10,
            paddingBottom: Math.max(insets.bottom, 20) + 20,
          },
        ]}
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            onPress={() => (step === 'code' ? setStep('input') : router.back())}
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

        </View>

        {/* Content Box */}
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Logo size={44} isDark={!isLight} />
          </View>

          <Text style={[styles.title, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
            {step === 'input' ? 'Sign in to RideShare' : 'Enter 6-Digit PIN'}
          </Text>

          <Text style={[styles.subtitle, { color: isLight ? '#64748B' : '#94A3B8' }]}>
            {step === 'input'
              ? authMethod === 'email'
                ? 'We will send a 6-digit verification code to your email inbox via secure Gmail SMTP.'
                : 'We will send a 6-digit SMS verification code to your Nigerian mobile phone number.'
              : authMethod === 'email'
                ? `Verification code sent to ${email}. Check your inbox or spam folder.`
                : `Verification code sent to +234 ${phoneNumber}.`}
          </Text>

          {step === 'input' ? (
            <View style={styles.inputSection}>
              {/* Method Switcher Tabs */}
              <View
                style={[
                  styles.tabBar,
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
                    setAuthMethod('email');
                  }}
                  style={[
                    styles.tabItem,
                    authMethod === 'email' && [
                      styles.tabItemActive,
                      {
                        backgroundColor: isLight ? '#FFFFFF' : '#1E222D',
                        shadowColor: '#000',
                      },
                    ],
                  ]}
                >
                  <Mail
                    size={16}
                    color={authMethod === 'email' ? '#10B981' : isLight ? '#64748B' : '#94A3B8'}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color:
                          authMethod === 'email'
                            ? isLight
                              ? '#0F172A'
                              : '#FFFFFF'
                            : isLight
                              ? '#64748B'
                              : '#94A3B8',
                        fontWeight: authMethod === 'email' ? '800' : '600',
                      },
                    ]}
                  >
                    Email Address
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    setAuthMethod('phone');
                  }}
                  style={[
                    styles.tabItem,
                    authMethod === 'phone' && [
                      styles.tabItemActive,
                      {
                        backgroundColor: isLight ? '#FFFFFF' : '#1E222D',
                        shadowColor: '#000',
                      },
                    ],
                  ]}
                >
                  <Phone
                    size={16}
                    color={authMethod === 'phone' ? '#10B981' : isLight ? '#64748B' : '#94A3B8'}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color:
                          authMethod === 'phone'
                            ? isLight
                              ? '#0F172A'
                              : '#FFFFFF'
                            : isLight
                              ? '#64748B'
                              : '#94A3B8',
                        fontWeight: authMethod === 'phone' ? '800' : '600',
                      },
                    ]}
                  >
                    Phone (+234)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Form Input Field */}
              {authMethod === 'email' ? (
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: isLight ? '#FFFFFF' : '#14161C',
                      borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)',
                    },
                  ]}
                >
                  <View style={styles.inputPrefixIcon}>
                    <Mail size={18} color="#10B981" />
                  </View>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
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
              ) : (
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: isLight ? '#FFFFFF' : '#14161C',
                      borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)',
                    },
                  ]}
                >
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
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    placeholder="801 234 5678"
                    placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                    style={[
                      styles.textInput,
                      { color: isLight ? '#0F172A' : '#FFFFFF', paddingLeft: 8 },
                    ]}
                  />
                </View>
              )}

            </View>
          ) : (
            <View style={styles.codeContainer}>
              <TextInput
                value={otpCode}
                onChangeText={setOtpCode}
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
                {timer > 0 ? (
                  <Text style={[styles.timerText, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                    Resend code in <Text style={{ color: '#10B981', fontWeight: '700' }}>{timer}s</Text>
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleSendCode} style={styles.resendButton}>
                    <RefreshCw size={14} color="#10B981" />
                    <Text style={styles.resendLink}>
                      Resend {authMethod === 'email' ? 'Email OTP' : 'SMS OTP'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.sandboxHint, { color: isLight ? '#94A3B8' : '#64748B' }]}>
                {authMethod === 'email'
                  ? 'Real OTP delivered via Gmail SMTP. Development code 000000 also accepted.'
                  : 'SMS verification sent. Sandbox test code 000000 also accepted.'}
              </Text>
            </View>
          )}

          <Button
            title={step === 'input' ? 'Send Verification Code' : 'Verify & Continue'}
            onPress={step === 'input' ? handleSendCode : handleVerifyCode}
            loading={loading}
            size="lg"
            variant="primary"
            style={styles.actionButton}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 24,
  },
  inputSection: {
    marginBottom: 20,
    gap: 14,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  tabItemActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  inputPrefixIcon: {
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
    paddingLeft: 4,
  },
  codeContainer: {
    marginBottom: 20,
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
    marginTop: 14,
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
  sandboxHint: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 12,
  },
  actionButton: {
    height: 54,
    borderRadius: 16,
  },
});
