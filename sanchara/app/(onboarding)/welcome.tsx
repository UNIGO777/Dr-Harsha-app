// Onboarding step 1 — brief intro before the profile questions.
import { useRouter } from 'expo-router';

import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
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
    />
  );
}
