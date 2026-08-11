// Onboarding step 8 — current activity level (exerciseHistory enum).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { OptionCard } from '@/components/onboarding/OptionCard';
import { STEP } from '@/features/onboarding/steps';
import type { ExerciseHistoryLevel } from '@/lib/enums';
import { useOnboardingStore } from '@/store/onboardingStore';

const OPTIONS: { value: ExerciseHistoryLevel; title: string; description: string }[] = [
  { value: 'none', title: 'None', description: 'I do not exercise regularly' },
  { value: 'beginner', title: 'Beginner', description: 'Walking, yoga, or light exercise' },
  {
    value: 'sports_only',
    title: 'I play sports',
    description: 'Active through sport, but no structured exercise or training',
  },
  {
    value: 'intermediate',
    title: 'Intermediate',
    description: 'Gym, sports, or structured exercise 2–4 times per week',
  },
  {
    value: 'advanced',
    title: 'Advanced',
    description: 'Intense training, gym, sports, or workouts 5 or more times per week',
  },
];

export default function ExperienceScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);

  const [level, setLevel] = useState<ExerciseHistoryLevel | undefined>(draft.exerciseHistory);

  function onContinue() {
    if (!level) return;
    update({ exerciseHistory: level });
    router.push('/(onboarding)/goal');
  }

  return (
    <OnboardingScaffold
      step={STEP.experience}
      title="What is your current exercise level?"
      subtitle="This sets a safe starting intensity that matches your movement level."
      ctaDisabled={!level}
      onContinue={onContinue}
      footerNote="You can always adjust this later in settings."
    >
      <View className="gap-3">
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            title={o.title}
            description={o.description}
            selected={level === o.value}
            onPress={() => setLevel(o.value)}
            showRadio
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
}
