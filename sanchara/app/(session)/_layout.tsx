// The workout flow: pain check-in → player → summary. Kept outside (app)/(tabs)
// so the session runs full-bleed with no tab bar competing for attention.
import { Stack } from 'expo-router';

import { useThemeColors } from '@/theme/useTheme';

export default function SessionLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.base },
        // Mid-session the user should use the in-screen controls (which record
        // state on the server), not a swipe that would silently orphan it.
        gestureEnabled: false,
      }}
    />
  );
}
