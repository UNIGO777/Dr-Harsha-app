// Bottom tabs for the main app. Dark tab bar, accent for the active tab, lucide
// line icons matching the minimal aesthetic.
//
// Route filenames stay (home/library/progress/profile) so existing links keep
// working; only the visible labels + icons follow the product language:
// Plan · Activity · History · Support.
import { Tabs } from 'expo-router';
import { CalendarCheck, Dumbbell, LifeBuoy, LineChart } from 'lucide-react-native';

import { colors } from '@/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.microLabel,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64,
          paddingTop: 6,
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
        name="library"
        options={{
          title: 'ACTIVITY',
          tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'HISTORY',
          tabBarIcon: ({ color, size }) => <LineChart color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'SUPPORT',
          tabBarIcon: ({ color, size }) => <LifeBuoy color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
