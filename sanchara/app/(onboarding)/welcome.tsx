// Onboarding step 1 — brief intro, plus the appearance choice. Asking here (and
// not burying it in settings) means the remaining nine steps are already shown
// in the theme the user actually wants to read them in.
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { ThemePicker } from '@/components/ui';
import { STEP } from '@/features/onboarding/steps';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <OnboardingScaffold
      step={STEP.welcome}
      title={"Let's set up your\nprofile"}
      subtitle="A few quick questions so your clinical team can tailor movement that's safe for you. Takes about 2 minutes."
      ctaLabel="Get started"
      onContinue={() => router.push('/(onboarding)/basic-info')}
      onBack={() => router.replace('/')}
      onClose={() => router.replace('/')}
    >
      <View className="mt-2">
        <Text className="font-sans-semibold text-xs uppercase tracking-[2px] text-micro">
          Appearance
        </Text>
        <Text className="mt-2 font-sans text-sm leading-5 text-secondary">
          Pick what&apos;s comfortable to read. You can change this any time from your profile.
        </Text>
        <View className="mt-4">
          <ThemePicker />
        </View>
      </View>
    </OnboardingScaffold>
  );
}
