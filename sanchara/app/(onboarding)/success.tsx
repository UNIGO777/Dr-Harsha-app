// Onboarding step 10 — terminal screen. Two states: completed (enter the app)
// or waitlisted (age outside 30–60). Clears the onboarding draft on mount.
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Clock, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

function FeatureRow({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Check;
  title: string;
  subtitle: string;
}) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center rounded-card border border-border bg-surface/80 p-4">
      <Icon color={colors.accent} size={22} strokeWidth={2} />
      <View className="ml-4 flex-1">
        <Text className="font-sans-semibold text-base text-primary">{title}</Text>
        <Text className="mt-0.5 font-sans text-sm text-secondary">{subtitle}</Text>
      </View>
    </View>
  );
}

export default function SuccessScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { waitlisted } = useLocalSearchParams<{ waitlisted?: string }>();
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const signOut = useAuthStore((s) => s.signOut);

  const isWaitlisted = waitlisted === '1';

  // Clear the draft once we've reached the terminal screen.
  useEffect(() => {
    resetOnboarding();
  }, [resetOnboarding]);

  async function onWaitlistDone() {
    await signOut(); // clear the onboarding token so relaunch lands on the landing
    router.replace('/');
  }

  return (
    <View className="flex-1 bg-base">
      <LinearGradient
        colors={[withAlpha(colors.accent, 0.1), 'transparent', colors.base]}
        locations={[0, 0.5, 1]}
        style={{ position: 'absolute', inset: 0 }}
      />
      <SafeAreaView className="flex-1 px-6">
        <View className="flex-1 items-center justify-center">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-accent/15">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-accent">
              {isWaitlisted ? (
                <Clock color={colors.accentText} size={30} strokeWidth={2.4} />
              ) : (
                <Check color={colors.accentText} size={32} strokeWidth={3} />
              )}
            </View>
          </View>

          <Text className="mt-8 text-center font-display-bold text-4xl text-primary">
            {isWaitlisted ? "You're on the waitlist" : "You're all set!"}
          </Text>
          <Text className="mt-3 max-w-[320px] text-center font-sans text-base leading-6 text-secondary">
            {isWaitlisted
              ? "Thanks! This programme currently serves ages 30–60. We'll let you know the moment we expand."
              : 'Your programme is ready — built around your body, history and goals.'}
          </Text>

          {!isWaitlisted ? (
            <View className="mt-10 w-full gap-3">
              <FeatureRow
                icon={ShieldCheck}
                title="Clinically supervised"
                subtitle="Reviewed by Dr. Harsha KJ's team"
              />
              <FeatureRow
                icon={Sparkles}
                title="Personalized path"
                subtitle="Tailored to your current level"
              />
            </View>
          ) : null}
        </View>

        <View className="pb-2">
          {isWaitlisted ? (
            <Button label="Done" onPress={onWaitlistDone} />
          ) : (
            <Button label="Start exploring" onPress={() => router.replace('/(programs)')} />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
