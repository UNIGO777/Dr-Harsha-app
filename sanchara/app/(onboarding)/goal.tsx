// Onboarding step 9 — main goal, then the SINGLE backend submit of the whole
// profile. Backend returns `completed` (tokens -> sign in) or `waitlisted`.
import { useRouter } from 'expo-router';
import { Dumbbell, HeartPulse, PersonStanding, Scale } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { OptionCard } from '@/components/onboarding/OptionCard';
import { useSubmitOnboarding } from '@/features/onboarding/api';
import { STEP } from '@/features/onboarding/steps';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';

const GOALS = [
  { value: 'Pain relief', description: 'Focus on recovery and release', icon: HeartPulse },
  { value: 'Flexibility', description: 'Improve range of motion', icon: PersonStanding },
  { value: 'Strength', description: 'Build resilient muscles', icon: Dumbbell },
  { value: 'Weight loss', description: 'Active calorie management', icon: Scale },
] as const;

function extractApiError(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return typeof msg === 'string' && msg.length > 0 ? msg : fallback;
}

export default function GoalScreen() {
  const router = useRouter();
  const update = useOnboardingStore((s) => s.update);
  const submit = useSubmitOnboarding();
  const signIn = useAuthStore((s) => s.signIn);

  const [goal, setGoal] = useState<string | undefined>(useOnboardingStore.getState().draft.goal);
  const [error, setError] = useState<string | null>(null);

  async function onContinue() {
    if (!goal) return;
    setError(null);
    update({ goal });

    try {
      const draft = useOnboardingStore.getState().draft;
      const res = await submit.mutateAsync(draft);

      if ('waitlisted' in res && res.waitlisted) {
        router.replace({ pathname: '/(onboarding)/success', params: { waitlisted: '1' } });
        return;
      }
      const phone = useAuthStore.getState().phone ?? '';
      await signIn({ accessToken: res.accessToken, refreshToken: res.refreshToken }, phone);
      router.replace('/(onboarding)/success');
    } catch (e: unknown) {
      setError(extractApiError(e, "Couldn't save your profile. Please try again."));
    }
  }

  return (
    <OnboardingScaffold
      step={STEP.goal}
      title="What's your main goal?"
      subtitle="We'll tailor your movement plan based on your selection."
      ctaLabel="Finish"
      ctaLoading={submit.isPending}
      ctaDisabled={!goal}
      onContinue={onContinue}
    >
      <View className="gap-3">
        {GOALS.map((g) => (
          <OptionCard
            key={g.value}
            title={g.value}
            description={g.description}
            icon={g.icon}
            selected={goal === g.value}
            onPress={() => setGoal(g.value)}
          />
        ))}
      </View>
      {error ? (
        <Text className="mt-4 text-center font-sans text-sm text-danger">{error}</Text>
      ) : null}
    </OnboardingScaffold>
  );
}
