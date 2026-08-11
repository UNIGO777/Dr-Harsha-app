// Onboarding step 9 — main fitness goal, then the SINGLE backend submit of the
// whole profile. Backend returns `completed` (tokens -> sign in) or `waitlisted`.
import { useRouter } from 'expo-router';
import { Activity, Baby, Dumbbell, Flame, HeartPulse, Pencil } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { OptionCard } from '@/components/onboarding/OptionCard';
import { TextComposer } from '@/components/ui';
import { useSubmitOnboarding } from '@/features/onboarding/api';
import { STEP } from '@/features/onboarding/steps';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';

const OTHER = '__other__';

const GOALS = [
  { value: 'Pain relief', description: 'Ease discomfort and recover', icon: HeartPulse },
  { value: 'Improve overall health', description: 'Build all-round fitness', icon: Activity },
  { value: 'Fat loss', description: 'Active weight management', icon: Flame },
  { value: 'Muscle gain', description: 'Build strength and mass', icon: Dumbbell },
  { value: 'Pre-pregnancy fitness', description: 'Prepare your body to conceive', icon: Baby },
] as const;

const FIXED = GOALS.map((g) => g.value) as string[];

function extractApiError(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return typeof msg === 'string' && msg.length > 0 ? msg : fallback;
}

export default function GoalScreen() {
  const router = useRouter();
  const update = useOnboardingStore((s) => s.update);
  const submit = useSubmitOnboarding();
  const signIn = useAuthStore((s) => s.signIn);

  const savedGoal = useOnboardingStore.getState().draft.goal;
  const [selected, setSelected] = useState<string | undefined>(
    savedGoal ? (FIXED.includes(savedGoal) ? savedGoal : OTHER) : undefined,
  );
  const [other, setOther] = useState(savedGoal && !FIXED.includes(savedGoal) ? savedGoal : '');
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const goal = selected === OTHER ? other.trim() : selected;
  const canContinue = !!goal;

  async function onContinue() {
    if (!goal) return;
    setError(null);
    update({ goal });

    try {
      const res = await submit.mutateAsync(useOnboardingStore.getState().draft);
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
      title="What is your main fitness goal?"
      subtitle="We'll tailor your movement plan based on your selection."
      ctaLabel="Finish"
      ctaLoading={submit.isPending}
      ctaDisabled={!canContinue}
      onContinue={onContinue}
    >
      <View className="gap-3">
        {GOALS.map((g) => (
          <OptionCard
            key={g.value}
            title={g.value}
            description={g.description}
            icon={g.icon}
            selected={selected === g.value}
            onPress={() => setSelected(g.value)}
          />
        ))}
        <OptionCard
          title="Other"
          description={other || 'Tap to describe your goal'}
          icon={Pencil}
          selected={selected === OTHER}
          onPress={() => {
            setSelected(OTHER);
            setComposerOpen(true);
          }}
        />
      </View>
      {error ? (
        <Text className="mt-4 text-center font-sans text-sm text-danger">{error}</Text>
      ) : null}

      <TextComposer
        visible={composerOpen}
        title="Your goal"
        initialValue={other}
        placeholder="Describe your goal"
        maxLength={120}
        onDone={(t) => {
          setOther(t.trim());
          setComposerOpen(false);
        }}
      />
    </OnboardingScaffold>
  );
}
