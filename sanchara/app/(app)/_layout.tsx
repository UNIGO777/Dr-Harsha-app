// Authenticated area. Gated on enrollment: a user who hasn't picked a program
// yet is sent to the program-selection flow — the dashboard/tabs stay locked
// until they have an ACTIVE enrollment.
import { Redirect, Stack, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useMyEnrollment } from '@/features/enrollments/api';
import { useAuthStore } from '@/store/authStore';
import { useThemeColors } from '@/theme/useTheme';

export default function AppLayout() {
  const colors = useThemeColors();
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);
  const { data: enrollment, isPending, isFetching, isError, error, refetch } = useMyEnrollment();

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

  // A FAILED request is not the same as "no enrollment".
  //
  // Treating them alike sent people to program selection whenever the call
  // errored — which is what a deleted or locked account looks like from here.
  // The user then wandered a half-working app instead of being signed out.
  if (isError) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    const isAuthFailure = status === 401 || status === 403;

    return (
      <View className="flex-1 items-center justify-center bg-base px-8">
        <Text className="text-center font-display-bold text-xl text-primary">
          {isAuthFailure ? 'Your session has ended' : "We couldn't load your plan"}
        </Text>
        <Text className="mt-2 text-center font-sans text-sm text-secondary">
          {isAuthFailure
            ? 'Please sign in again to continue.'
            : 'Check your connection and try again.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={async () => {
            if (isAuthFailure) {
              await signOut();
              router.replace('/');
            } else {
              void refetch();
            }
          }}
          className="mt-6 rounded-pill bg-accent px-6 py-3.5 active:opacity-90"
        >
          <Text className="font-sans-semibold text-sm" style={{ color: colors.accentText }}>
            {isAuthFailure ? 'Sign in' : 'Try again'}
          </Text>
        </Pressable>
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
