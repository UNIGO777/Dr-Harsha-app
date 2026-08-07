// Program selection flow (shown after onboarding, before the dashboard is
// reachable). Plain stack: list -> detail.
import { Stack } from 'expo-router';

import { useThemeColors } from '@/theme/useTheme';

export default function ProgramsLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.base },
      }}
    />
  );
}
