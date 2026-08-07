// Authenticated area. Gated on enrollment: a user who hasn't picked a program
// yet is sent to the program-selection flow — the dashboard/tabs stay locked
// until they have an ACTIVE enrollment.
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useMyEnrollment } from '@/features/enrollments/api';
import { useThemeColors } from '@/theme/useTheme';

export default function AppLayout() {
  const colors = useThemeColors();
  const { data: enrollment, isPending, isFetching } = useMyEnrollment();

  // Wait while we don't yet know, AND while a cached `null` is being
  // re-checked. Redirecting on an unconfirmed null throws the user back out to
  // program selection the instant after they enrol — never bounce on a maybe.
  if (isPending || (!enrollment && isFetching)) {
    return (
      <View className="flex-1 items-center justify-center bg-base">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // No active enrollment -> must choose a program before entering the app.
  if (!enrollment) return <Redirect href="/(programs)" />;

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.base } }}
    />
  );
}
