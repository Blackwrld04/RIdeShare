import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAppStore } from '../store/useAppStore';

export default function RootIndex() {
  const { isAuthenticated, isInitializing, theme } = useAppStore();

  if (isInitializing) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background || '#0A0B0E',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/welcome" />;
  }

  return <Redirect href="/(tabs)" />;
}
