// Auth flow: phone entry → OTP. A plain stack; screens are portrait, headerless.
import { Stack } from 'expo-router';

import { useThemeColors } from '@/theme/useTheme';

export default function AuthLayout() {
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
