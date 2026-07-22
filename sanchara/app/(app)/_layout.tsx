// Authenticated area. Gated on enrollment: a user who hasn't picked a program
// yet is sent to the program-selection flow — the dashboard/tabs stay locked
// until they have an ACTIVE enrollment.
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useMyEnrollment } from '@/features/enrollments/api';
import { colors } from '@/theme/tokens';

export default function AppLayout() {
  const { data: enrollment, isLoading } = useMyEnrollment();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-base">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // No active enrollment -> must choose a program before entering the app.
  if (!enrollment) return <Redirect href="/(programs)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
