import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Moon, Sun, Search } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import { Logo } from './Logo';

interface HeaderGradientProps {
  title?: string;
  subtitle?: string;
  showProfile?: boolean;
  children?: React.ReactNode;
}

export const HeaderGradient: React.FC<HeaderGradientProps> = ({
  title,
  subtitle,
  showProfile = true,
  children,
}) => {
  const insets = useSafeAreaInsets();
  const { theme, themeMode, toggleTheme } = useAppStore();

  return (
    <LinearGradient
      colors={theme.headerGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top, 16) + 8 },
      ]}
    >
      {showProfile && (
        <View style={styles.topRow}>
          {/* Brand Logo & Title */}
          <View style={styles.brandContainer}>
            <Logo size={32} showText={true} isDark={themeMode === 'dark'} />
          </View>

          {/* Action Icons: Search, Theme Toggle & Notifications */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/search')}
              style={[
                styles.iconCircle,
                {
                  backgroundColor:
                    themeMode === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                  borderColor: theme.surfaceBorder,
                },
              ]}
            >
              <Search
                size={18}
                color={themeMode === 'light' ? '#111827' : '#FFFFFF'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleTheme}
              activeOpacity={0.8}
              style={[
                styles.iconCircle,
                {
                  backgroundColor:
                    themeMode === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                  borderColor: theme.surfaceBorder,
                },
              ]}
            >
              {themeMode === 'light' ? (
                <Moon size={18} color="#111827" />
              ) : (
                <Sun size={18} color="#F5B800" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.iconCircle,
                {
                  backgroundColor:
                    themeMode === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                  borderColor: theme.surfaceBorder,
                },
              ]}
            >
              <Bell size={18} color={themeMode === 'light' ? '#111827' : '#FFFFFF'} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Greeting Banner */}
      {(title || subtitle) && (
        <View style={styles.greetingContainer}>
          {title && (
            <Text
              style={[
                styles.titleText,
                { color: theme.textPrimary },
              ]}
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text
              style={[
                styles.subtitleText,
                { color: theme.textSecondary },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>
      )}

      {/* Embedded Child (e.g. Hero Search Card) */}
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
  },
  greetingContainer: {
    marginBottom: 20,
  },
  titleText: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
    lineHeight: 20,
  },
});
