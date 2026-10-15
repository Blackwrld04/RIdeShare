import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface LogoProps {
  size?: number;
  showText?: boolean;
  textColor?: string;
  isDark?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 40,
  showText = false,
  textColor,
  isDark = true,
}) => {
  const primaryColor = isDark ? '#FFFFFF' : '#111827';
  const secondaryColor = isDark ? '#A1A1AA' : '#6B7280';
  const labelColor = textColor || (isDark ? '#FFFFFF' : '#111827');

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="logoGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={primaryColor} stopOpacity="1" />
            <Stop offset="100%" stopColor={secondaryColor} stopOpacity="0.8" />
          </LinearGradient>
          <LinearGradient id="logoGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={secondaryColor} stopOpacity="0.9" />
            <Stop offset="100%" stopColor={primaryColor} stopOpacity="0.6" />
          </LinearGradient>
        </Defs>

        {/* Outer Loop Left (C - Commute) */}
        <Path
          d="M 62 26 C 45 22 25 32 23 50 C 21 68 38 78 54 75"
          fill="none"
          stroke="url(#logoGrad1)"
          strokeWidth="11"
          strokeLinecap="round"
        />

        {/* Outer Loop Right (S - Share) */}
        <Path
          d="M 38 74 C 55 78 75 68 77 50 C 79 32 62 22 46 25"
          fill="none"
          stroke="url(#logoGrad2)"
          strokeWidth="11"
          strokeLinecap="round"
        />

        {/* Central Intersecting Mobility Node */}
        <Circle cx="50" cy="50" r="7" fill={primaryColor} />
        <Circle cx="50" cy="50" r="3" fill={isDark ? '#0A0B0E' : '#FFFFFF'} />
      </Svg>

      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.brandText, { color: labelColor }]}>CommuteShare</Text>
          <Text style={[styles.taglineText, { color: secondaryColor }]}>RIDE-SHARE</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textContainer: {
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  taglineText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: -1,
  },
});
