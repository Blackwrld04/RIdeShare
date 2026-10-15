import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, CheckCircle2, ChevronLeft } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/ui/Button';

const genders = ['Woman', 'Man', 'Prefer not to say'];

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const { theme, user, setUser } = useAppStore();
  const [name, setName] = useState(user?.displayName || 'Alina Okafor');
  const [gender, setGender] = useState('Woman');
  const [nin, setNin] = useState('');

  const isNinValid = useMemo(() => /^[0-9]{11}$/.test(nin), [nin]);

  const handleContinue = () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please provide your full name.');
      return;
    }

    if (nin && !isNinValid) {
      Alert.alert('Invalid NIN', 'NIN should be exactly 11 digits to pass the NIMC check.');
      return;
    }

    const nextUser = {
      ...(user ?? {
        id: 'usr-102',
        phoneE164: '+2348031234567',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        ninVerified: false,
        isDriver: true,
        rating: 4.9,
        totalTrips: 1,
      }),
      displayName: name.trim(),
      ninVerified: !!nin && isNinValid,
      ninLast4: nin ? nin.slice(-4) : undefined,
      bio: gender === 'Woman' ? 'Women-first commuting with verified daily routes.' : 'Comfortable commuting with a safe, trusted network.',
    };

    setUser(nextUser);
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}> 
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 8 }]}> 
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder }]}
          onPress={() => router.back()}
        >
          <ChevronLeft size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Complete profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.avatarCard, { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder }]}> 
          <View style={[styles.avatarCircle, { backgroundColor: theme.accentSoft }]}> 
            <Text style={[styles.avatarText, { color: theme.textPrimary }]}>{(name || 'A').charAt(0).toUpperCase()}</Text>
          </View>
          <TouchableOpacity style={[styles.cameraButton, { backgroundColor: theme.primary }]}> 
            <Camera size={16} color={theme.primaryForeground} />
          </TouchableOpacity>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Full name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter full name"
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder, color: theme.textPrimary }]}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Gender</Text>
          <View style={styles.genderRow}>
            {genders.map((option) => {
              const selected = option === gender;
              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => setGender(option)}
                  style={[
                    styles.genderChip,
                    {
                      backgroundColor: selected ? theme.primary : theme.surfaceCard,
                      borderColor: selected ? theme.primary : theme.surfaceBorder,
                    },
                  ]}
                >
                  <Text style={[styles.genderText, { color: selected ? theme.primaryForeground : theme.textPrimary }]}>{option}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>NIN verification</Text>
          <TextInput
            value={nin}
            onChangeText={setNin}
            keyboardType="number-pad"
            maxLength={11}
            placeholder="11-digit NIN"
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { backgroundColor: theme.surfaceCard, borderColor: theme.surfaceBorder, color: theme.textPrimary }]}
          />
          <View style={styles.ninMetaRow}>
            <CheckCircle2 size={16} color={nin && isNinValid ? '#10B981' : theme.textMuted} />
            <Text style={[styles.ninMetaText, { color: theme.textMuted }]}>
              {nin && isNinValid ? 'NIMC format validated' : 'Optional for preview. Enter 11 digits to validate.'}
            </Text>
          </View>
        </View>

        <Button title="Save profile" onPress={handleContinue} variant="dark" size="lg" style={styles.cta} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 18,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  avatarCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 18,
    marginBottom: 18,
    position: 'relative',
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 42,
    fontWeight: '800',
  },
  cameraButton: {
    position: 'absolute',
    right: 28,
    bottom: 18,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genderChip: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  genderText: {
    fontSize: 14,
    fontWeight: '700',
  },
  ninMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ninMetaText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  cta: {
    marginTop: 8,
  },
});
