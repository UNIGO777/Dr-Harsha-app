// Bottom tabs for the main app. Dark tab bar, accent for the active tab, lucide
// line icons matching the minimal aesthetic.
//
// Tab ORDER here is the order shown; it is not the filesystem order.
// Plan · Progress · Wallet · Alerts · Profile.
//
// The tab label is ALERTS rather than NOTIFICATIONS: at five tabs there is
// ~70px per label, and the longer word truncates.
import { Tabs } from 'expo-router';
import { Bell, CalendarCheck, LineChart, UserRound, Wallet } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/theme/useTheme';

const TAB_BAR_HEIGHT = 64;

export default function TabsLayout() {
  const colors = useThemeColors();
  // Edge-to-edge is on by default from SDK 55 (and mandatory on Android 15+),
  // so the app draws UNDER the system bars. Without adding the bottom inset the
  // gesture bar sits on top of the tab bar and swallows the labels.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.microLabel,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          // Grow the bar by the inset and pad the content up out of it, so the
          // icons+labels keep their full height on gesture-nav and 3-button
          // devices alike (insets.bottom is 0 where there is no system bar).
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter-SemiBold',
          fontSize: 10,
          letterSpacing: 1,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'PLAN',
          tabBarIcon: ({ color, size }) => <CalendarCheck color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'PROGRESS',
          tabBarIcon: ({ color, size }) => <LineChart color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'WALLET',
          tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'ALERTS',
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'PROFILE',
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
