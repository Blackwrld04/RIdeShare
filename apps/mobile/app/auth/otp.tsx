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
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldCheck, Phone, ArrowLeft, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import { api } from '../../services/api';

export default function OtpVerificationScreen() {
  const insets = useSafeAreaInsets();
  const { theme, themeMode, setUser } = useAppStore();

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('8031234567');
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
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid Nigerian mobile phone number.');
      return;
    }

    setLoading(true);
    const fullPhone = `+234${phoneNumber.replace(/^0+/, '')}`;
    await api.auth.requestOtp(fullPhone);
    setLoading(false);
    setStep('code');
    setTimer(60);
  };

  const handleVerifyCode = async () => {
    if (!otpCode || otpCode.length < 6) {
      Alert.alert('Incomplete Code', 'Please enter the 6-digit SMS verification code.');
      return;
    }

    setLoading(true);
    const fullPhone = `+234${phoneNumber.replace(/^0+/, '')}`;
    const res = await api.auth.verifyOtp(fullPhone, otpCode);
    setLoading(false);

    if (res?.user) {
      setUser({
        id: res.user.id || 'usr-101',
        phoneE164: fullPhone,
        displayName: res.user.displayName || 'Alina Okafor',
        avatarUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        ninVerified: true,
        ninLast4: '8821',
        isDriver: true,
        driverStatus: 'APPROVED',
        rating: 4.95,
        totalTrips: 34,
      });

      router.replace('/auth/profile');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.background }]}
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
        <TouchableOpacity
          onPress={() => (step === 'code' ? setStep('phone') : router.back())}
          style={[styles.backButton, { backgroundColor: theme.surfaceSecondary }]}
        >
          <ArrowLeft size={18} color={theme.textPrimary} />
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Logo size={48} isDark={themeMode === 'dark'} />
          </View>

          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {step === 'phone' ? 'Verify Nigerian Mobile' : 'Enter 6-Digit PIN'}
          </Text>

          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {step === 'phone'
              ? 'We will send a 6-digit Termii SMS verification code to verify your Nigerian telecom number.'
              : `Code sent to +234 ${phoneNumber}. For sandbox testing, use code: 000000`}
          </Text>

          {step === 'phone' ? (
            <View style={[styles.phoneInputRow, { backgroundColor: theme.surfaceInput, borderColor: theme.surfaceBorder }]}>
              <View style={styles.countryCodeBox}>
                <Text style={[styles.countryCodeText, { color: theme.textPrimary }]}>+234 🇳🇬</Text>
              </View>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                placeholder="801 234 5678"
                placeholderTextColor={theme.textMuted}
                style={[styles.phoneTextInput, { color: theme.textPrimary }]}
              />
            </View>
          ) : (
            <View style={styles.codeContainer}>
              <TextInput
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.codeTextInput,
                  {
                    color: theme.textPrimary,
                    backgroundColor: theme.surfaceInput,
                    borderColor: theme.surfaceBorder,
                  },
                ]}
              />

              <View style={styles.resendRow}>
                {timer > 0 ? (
                  <Text style={[styles.timerText, { color: theme.textMuted }]}>
                    Resend code in {timer}s
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleSendCode}>
                    <Text style={[styles.resendLink, { color: theme.primary }]}>
                      Resend SMS OTP
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <Button
            title={step === 'phone' ? 'Send Verification Code' : 'Verify & Continue'}
            onPress={step === 'phone' ? handleSendCode : handleVerifyCode}
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
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 122, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 24,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  countryCodeBox: {
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  phoneTextInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    paddingLeft: 12,
  },
  codeContainer: {
    marginBottom: 20,
  },
  codeTextInput: {
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 10,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 12,
  },
  timerText: {
    fontSize: 13,
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionButton: {
    height: 56,
  },
});
