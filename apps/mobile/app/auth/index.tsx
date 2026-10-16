import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowRight,
  ShieldCheck,
  Smartphone,
  UserRound,
  CarFront,
} from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/ui/Button';

const featureHighlights = [
  { title: 'Verified riders', description: 'NIN-backed identities', icon: ShieldCheck },
  { title: 'Safe corridors', description: 'Popular Lagos routes', icon: Smartphone },
  { title: 'Driver mode', description: 'Publish seats in minutes', icon: CarFront },
];

export default function AuthLandingScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppStore();
  const [phoneNumber, setPhoneNumber] = useState('8031234567');

  const handleContinue = () => {
    router.push('/auth/otp');
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}> 
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 20) + 12,
            paddingBottom: Math.max(insets.bottom, 20) + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder }]}>
            <Text style={[styles.backText, { color: theme.textPrimary }]}>←</Text>
          </TouchableOpacity>
          <View style={[styles.brandPill, { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder }]}> 
            <Text style={[styles.brandText, { color: theme.textPrimary }]}>RideShare</Text>
          </View>
        </View>

        <View style={styles.heroCard}> 
          <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>Welcome back</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Ride smarter across Nigeria.</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Book verified seats, earn from trusted commutes, and stay protected with escrow-backed payments.
          </Text>

          <View style={[styles.phoneInputRow, { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder }]}>
            <View style={styles.countryCodeBox}>
              <Text style={[styles.countryCodeText, { color: theme.textPrimary }]}>+234</Text>
            </View>
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              placeholder="801 234 5678"
              placeholderTextColor={theme.textMuted}
              style={[styles.phoneInput, { color: theme.textPrimary }]}
            />
          </View>

          <Button
            title="Continue with phone"
            onPress={handleContinue}
            variant="primary"
            size="lg"
            icon={<ArrowRight size={18} color={theme.primaryForeground} />}
            iconPosition="right"
            style={styles.primaryButton}
          />

          <TouchableOpacity onPress={() => router.push('/rides/create')} style={[styles.secondaryAction, { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder }]}>
            <CarFront size={18} color={theme.textPrimary} />
            <Text style={[styles.secondaryActionText, { color: theme.textPrimary }]}>I’m driving — publish a ride</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoStack}>
          {featureHighlights.map(({ title, description, icon: Icon }) => (
            <View key={title} style={[styles.featureItem, { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder }]}> 
              <View style={[styles.featureIcon, { backgroundColor: theme.accentSoft }]}> 
                <Icon size={18} color={theme.primary} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={[styles.featureTitle, { color: theme.textPrimary }]}>{title}</Text>
                <Text style={[styles.featureDescription, { color: theme.textSecondary }]}>{description}</Text>
              </View>
            </View>
          ))}
        </View>
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
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '700',
  },
  brandPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  brandText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroCard: {
    padding: 22,
    borderRadius: 28,
    borderWidth: 1,
    backgroundColor: '#12151A',
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    letterSpacing: -0.8,
    marginTop: 10,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 58,
    marginBottom: 18,
  },
  countryCodeBox: {
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
    marginRight: 12,
    paddingVertical: 8,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    marginBottom: 14,
  },
  secondaryAction: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryActionText: {
    fontWeight: '700',
    fontSize: 15,
  },
  infoStack: {
    marginTop: 22,
    gap: 12,
    paddingBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 12,
    lineHeight: 18,
  },
});
