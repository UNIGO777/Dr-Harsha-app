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
  { value: 'none', title: 'None', description: 'Starting my journey from zero.' },
  { value: 'beginner', title: 'Beginner', description: 'Occasional walks and gentle movement.' },
  { value: 'intermediate', title: 'Intermediate', description: 'Regular activity 2–3 times per week.' },
  { value: 'advanced', title: 'Advanced', description: 'High-intensity training 5+ days a week.' },
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
      title="How active are you currently?"
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
