// Onboarding step 6 — where do you feel pain? Tappable body silhouette.
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { BodyMap } from '@/components/onboarding/BodyMap';
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { STEP } from '@/features/onboarding/steps';
import { useOnboardingStore } from '@/store/onboardingStore';

export default function PainAreasScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);

  const [selected, setSelected] = useState<string[]>(draft.painAreas);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function onContinue() {
    update({ painAreas: selected });
    router.push('/(onboarding)/conditions');
  }

  return (
    <OnboardingScaffold
      step={STEP.painAreas}
      title="Where do you feel pain?"
      subtitle="Tap the areas that bother you most today. You can skip this if nothing hurts."
      onContinue={onContinue}
    >
      <BodyMap selected={selected} onToggle={toggle} />
    </OnboardingScaffold>
  );
}
