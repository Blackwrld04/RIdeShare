import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
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
} from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { theme, themeMode, toggleTheme, user, emergencyContacts } = useAppStore();
  const [driverMode, setDriverMode] = useState(user?.isDriver || false);

  const handleBankResolution = () => {
    Alert.alert(
      'Paystack NUBAN Account',
      'Bank Account: 0123456789\nBank: Guaranty Trust Bank (058)\nResolved Name: ALINA OKAFOR\nStatus: Verified for automated 24h escrow payouts',
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 16) + 8,
            backgroundColor: theme.surface,
            borderBottomColor: theme.surfaceBorder,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Profile & Trust Cockpit
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Identity Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Image
              source={{
                uri:
                  user?.avatarUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
              }}
              style={styles.avatar}
            />
            <View style={styles.profileMeta}>
              <Text style={[styles.userName, { color: theme.textPrimary }]}>
                {user?.displayName}
              </Text>
              <Text style={[styles.userPhone, { color: theme.textMuted }]}>
                {user?.phoneE164}
              </Text>
              <View style={styles.trustBadgesRow}>
                <Badge label="NIN Verified" variant="verified" />
                <Badge label="★ 4.95 Rating" variant="rating" />
              </View>
            </View>
          </View>
        </Card>

        {/* NIMC Government National ID (NIN) KYC Card */}
        <Card style={styles.kycCard}>
          <View style={styles.kycHeaderRow}>
            <View style={styles.kycIconBox}>
              <UserCheck size={20} color="#10B981" />
            </View>
            <View style={styles.kycMeta}>
              <Text style={[styles.kycTitle, { color: theme.textPrimary }]}>
                National Identity Number (NIN)
              </Text>
              <Text style={[styles.kycSub, { color: theme.textMuted }]}>
                NIMC Identity Match • Last 4 digits: •••• {user?.ninLast4 || '8821'}
              </Text>
            </View>
            <Badge label="Active" variant="verified" />
          </View>
        </Card>

        {/* FRSC Driver & Vehicle Section */}
        <Card style={styles.driverSectionCard}>
          <View style={styles.driverToggleRow}>
            <View style={styles.driverIconBox}>
              <Car size={20} color="#FF7A00" />
            </View>
            <View style={styles.driverMeta}>
              <Text style={[styles.driverTitle, { color: theme.textPrimary }]}>
                Driver Mode
              </Text>
              <Text style={[styles.driverSub, { color: theme.textMuted }]}>
                Offer rides and split fuel costs
              </Text>
            </View>
            <Switch
              value={driverMode}
              onValueChange={setDriverMode}
              thumbColor={driverMode ? '#FF7A00' : '#E5E7EB'}
              trackColor={{ false: '#767577', true: '#FFD29D' }}
            />
          </View>

          {driverMode && (
            <View style={[styles.vehicleDetailsBox, { backgroundColor: theme.surfaceInput }]}>
              <View style={styles.vehicleRow}>
                <FileCheck size={16} color="#10B981" />
                <Text style={[styles.vehicleText, { color: theme.textPrimary }]}>
                  FRSC Driver License: VERIFIED
                </Text>
              </View>
              <View style={[styles.vehicleRow, { marginTop: 6 }]}>
                <Car size={16} color="#FF7A00" />
                <Text style={[styles.vehicleText, { color: theme.textSecondary }]}>
                  2018 Toyota Corolla • Plate: LAG-492-AA
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Paystack Escrow NUBAN Bank Account Card */}
        <TouchableOpacity activeOpacity={0.8} onPress={handleBankResolution}>
          <Card style={styles.bankCard}>
            <View style={styles.bankRow}>
              <View style={styles.bankIconBox}>
                <Building2 size={20} color="#FF7A00" />
              </View>
              <View style={styles.bankMeta}>
                <Text style={[styles.bankTitle, { color: theme.textPrimary }]}>
                  Bank Account (NUBAN)
                </Text>
                <Text style={[styles.bankSub, { color: theme.textMuted }]}>
                  Guaranty Trust Bank • •••• 6789 (Paystack Verified)
                </Text>
              </View>
              <ChevronRight size={18} color={theme.textMuted} />
            </View>
          </Card>
        </TouchableOpacity>

        {/* Emergency Contacts for Anti-One-Chance SOS */}
        <Card style={styles.contactsCard}>
          <View style={styles.contactsHeader}>
            <Phone size={18} color="#EF4444" />
            <Text style={[styles.contactsTitle, { color: theme.textPrimary }]}>
              Emergency SOS Contacts ({emergencyContacts.length})
            </Text>
          </View>

          {emergencyContacts.map((contact) => (
            <View
              key={contact.id}
              style={[
                styles.contactItem,
                { borderBottomColor: theme.surfaceBorder },
              ]}
            >
              <View>
                <Text style={[styles.contactName, { color: theme.textPrimary }]}>
                  {contact.name}
                </Text>
                <Text style={[styles.contactPhone, { color: theme.textMuted }]}>
                  {contact.phoneE164}
                </Text>
              </View>
              {contact.isPrimary && <Badge label="Primary" variant="verified" />}
            </View>
          ))}
        </Card>

        {/* Appearance & Theme Toggle Button */}
        <Card style={styles.themeCard}>
          <View style={styles.themeRow}>
            <View style={styles.themeIconBox}>
              {themeMode === 'light' ? (
                <Sun size={20} color="#FF7A00" />
              ) : (
                <Moon size={20} color="#94A3B8" />
              )}
            </View>
            <View style={styles.themeMeta}>
              <Text style={[styles.themeTitle, { color: theme.textPrimary }]}>
                Theme Style
              </Text>
              <Text style={[styles.themeSub, { color: theme.textMuted }]}>
                Current: {themeMode === 'light' ? 'Warm Sunrise Light' : 'Vanta Dark'}
              </Text>
            </View>
            <Button
              title={themeMode === 'light' ? 'Dark' : 'Light'}
              size="sm"
              variant="secondary"
              onPress={toggleTheme}
            />
          </View>
        </Card>

        {/* Version Footnote */}
        <View style={styles.footerInfo}>
          <Text style={[styles.versionText, { color: theme.textMuted }]}>
            CommuteShare Nigeria v2.1 • Nigeria Corridors
          </Text>
        </View>
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
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 12,
  },
  profileCard: {
    padding: 18,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileMeta: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
  },
  userPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  trustBadgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  kycCard: {
    padding: 16,
  },
  kycHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  kycIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kycMeta: {
    flex: 1,
  },
  kycTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  kycSub: {
    fontSize: 11,
    marginTop: 2,
  },
  driverSectionCard: {
    padding: 16,
  },
  driverToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverMeta: {
    flex: 1,
  },
  driverTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  driverSub: {
    fontSize: 11,
    marginTop: 2,
  },
  vehicleDetailsBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehicleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bankCard: {
    padding: 16,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bankIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankMeta: {
    flex: 1,
  },
  bankTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bankSub: {
    fontSize: 11,
    marginTop: 2,
  },
  contactsCard: {
    padding: 16,
  },
  contactsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  contactsTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  contactName: {
    fontSize: 13,
    fontWeight: '700',
  },
  contactPhone: {
    fontSize: 11,
    marginTop: 2,
  },
  themeCard: {
    padding: 16,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 122, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeMeta: {
    flex: 1,
  },
  themeTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  themeSub: {
    fontSize: 11,
    marginTop: 2,
  },
  footerInfo: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 11,
  },
});
