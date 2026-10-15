import React from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { ShieldCheck, Star, Sparkles, CheckCircle2 } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';

interface BadgeProps {
  label: string;
  variant?: 'verified' | 'rating' | 'price' | 'status' | 'amenity' | 'custom';
  statusType?: 'success' | 'warning' | 'danger' | 'info';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'amenity',
  statusType = 'success',
  style,
  textStyle,
  icon,
}) => {
  const { theme, themeMode } = useAppStore();

  const getBadgeStyle = () => {
    switch (variant) {
      case 'verified':
        return {
          backgroundColor: themeMode === 'light' ? '#ECFDF5' : '#064E3B',
          borderColor: themeMode === 'light' ? '#A7F3D0' : '#047857',
        };
      case 'rating':
        return {
          backgroundColor: themeMode === 'light' ? '#FEF3C7' : '#2D2305',
          borderColor: themeMode === 'light' ? '#FDE68A' : '#78350F',
        };
      case 'price':
        return {
          backgroundColor: themeMode === 'light' ? '#FFF7ED' : '#2C180B',
          borderColor: themeMode === 'light' ? '#FFEDD5' : '#7C2D12',
        };
      case 'status':
        return {
          backgroundColor:
            statusType === 'success'
              ? themeMode === 'light'
                ? '#ECFDF5'
                : '#064E3B'
              : statusType === 'warning'
                ? themeMode === 'light'
                  ? '#FFFBEB'
                  : '#451A03'
                : '#FEF2F2',
          borderColor:
            statusType === 'success' ? '#10B981' : statusType === 'warning' ? '#F59E0B' : '#EF4444',
        };
      default:
        return {
          backgroundColor: theme.surfaceSecondary,
          borderColor: theme.surfaceBorder,
        };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'verified':
        return themeMode === 'light' ? '#065F46' : '#34D399';
      case 'rating':
        return themeMode === 'light' ? '#92400E' : '#FBBF24';
      case 'price':
        return themeMode === 'light' ? '#C2410C' : '#FB923C';
      case 'status':
        return statusType === 'success'
          ? themeMode === 'light'
            ? '#065F46'
            : '#34D399'
          : statusType === 'warning'
            ? '#B45309'
            : '#DC2626';
      default:
        return theme.textSecondary;
    }
  };

  return (
    <View style={[styles.badge, getBadgeStyle(), style]}>
      {variant === 'verified' && (
        <ShieldCheck
          size={12}
          color={getTextColor()}
          style={styles.icon}
        />
      )}
      {variant === 'rating' && (
        <Star
          size={11}
          color={getTextColor()}
          fill={getTextColor()}
          style={styles.icon}
        />
      )}
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.text, { color: getTextColor() }, textStyle]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});
