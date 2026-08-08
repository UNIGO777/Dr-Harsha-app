// Profile edit flow. Sits outside (tabs) so the forms get the full screen and
// the tab bar can't be tapped mid-edit.
import { Stack } from 'expo-router';

import { useThemeColors } from '@/theme/useTheme';

export default function ProfileLayout() {
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
