// 13-field onboarding flow across ~11 steps. Stack with a slide animation; the
// running draft is held in the zustand onboardingStore, not in route params.
import { Stack } from 'expo-router';

import { useThemeColors } from '@/theme/useTheme';

export default function OnboardingLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colors.base },
      }}
    />
  );
}
