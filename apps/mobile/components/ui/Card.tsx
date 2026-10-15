import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { useAppStore } from '../../store/useAppStore';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'flat' | 'outline';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'elevated' }) => {
  const { theme, themeMode } = useAppStore();

  const getBorderColor = () => {
    if (variant === 'outline') return theme.surfaceBorder;
    return themeMode === 'light' ? 'rgba(0, 0, 0, 0.04)' : theme.surfaceBorder;
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surfaceCard,
          borderColor: getBorderColor(),
          shadowColor: themeMode === 'light' ? '#000000' : '#000000',
        },
        variant === 'elevated' && styles.shadow,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
  },
  shadow: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
});
