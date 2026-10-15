import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Compass, Route, MessageSquare, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/useAppStore';

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { theme, themeMode } = useAppStore();

  const getIcon = (name: string, isFocused: boolean) => {
    const color = isFocused
      ? theme.bottomBarActiveText
      : theme.bottomBarInactive;
    const size = 20;

    switch (name) {
      case 'index':
        return <Home size={size} color={color} />;
      case 'search':
        return <Compass size={size} color={color} />;
      case 'trips':
        return <Route size={size} color={color} />;
      case 'chat':
        return <MessageSquare size={size} color={color} />;
      case 'profile':
        return <User size={size} color={color} />;
      default:
        return <Home size={size} color={color} />;
    }
  };

  const getLabel = (name: string) => {
    switch (name) {
      case 'index':
        return 'Home';
      case 'search':
        return 'Corridors';
      case 'trips':
        return 'Trips';
      case 'chat':
        return 'Chat';
      case 'profile':
        return 'Profile';
      default:
        return name;
    }
  };

  return (
    <View
      style={[
        styles.tabBarWrapper,
        {
          paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: 'transparent',
        },
      ]}
    >
      <View
        style={[
          styles.tabBarContainer,
          {
            backgroundColor: theme.bottomBarBackground,
            borderColor: theme.bottomBarBorder,
            shadowColor: '#000000',
          },
        ]}
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch (e) {
              // haptic fallback
            }

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.8}
              onPress={onPress}
              style={[
                styles.tabItem,
                isFocused && [
                  styles.tabItemActive,
                  { backgroundColor: theme.bottomBarActive },
                ],
              ]}
            >
              {getIcon(route.name, isFocused)}
              {isFocused && (
                <Text
                  style={[
                    styles.activeLabel,
                    { color: theme.bottomBarActiveText },
                  ]}
                >
                  {getLabel(route.name)}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Corridors' }} />
      <Tabs.Screen name="trips" options={{ title: 'Trips' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 36,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    width: '100%',
    maxWidth: 420,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
  },
  tabItemActive: {
    paddingHorizontal: 16,
  },
  activeLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
});
