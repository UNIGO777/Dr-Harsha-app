// Onboarding step 7 — health background: existing conditions + past surgeries.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { Chip } from '@/components/ui';
import { STEP } from '@/features/onboarding/steps';
import { useOnboardingStore } from '@/store/onboardingStore';
import { colors } from '@/theme/tokens';

const COMMON_CONDITIONS = [
  'Diabetes',
  'Hypertension',
  'Heart condition',
  'Arthritis',
  'Back problems',
  'Asthma',
  'Thyroid',
  'Osteoporosis',
  'Knee / joint issues',
];

export default function ConditionsScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);

  const [conditions, setConditions] = useState<string[]>(draft.conditions);
  const [surgery, setSurgery] = useState(draft.surgeryHistory ?? '');

  function toggle(c: string) {
    setConditions((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function onContinue() {
    update({ conditions, surgeryHistory: surgery.trim() || undefined });
    router.push('/(onboarding)/experience');
  }

  return (
    <OnboardingScaffold
      step={STEP.conditions}
      title="Your health background"
      subtitle="This keeps your programme safe. Select anything that applies — or skip if none."
      onContinue={onContinue}
    >
      <View className="flex-row flex-wrap gap-2.5">
        {COMMON_CONDITIONS.map((c) => (
          <Chip key={c} label={c} selected={conditions.includes(c)} onPress={() => toggle(c)} />
        ))}
      </View>

      <View className="mt-8">
        <Text className="mb-2 font-sans text-xs uppercase tracking-[2px] text-micro">
          Past surgeries or injuries (optional)
        </Text>
        <TextInput
          className="min-h-[96px] rounded-input border border-border bg-input-fill px-4 py-3 font-sans text-base text-primary"
          placeholder="e.g. knee replacement in 2021, lower-back injury…"
          placeholderTextColor={colors.microLabel}
          selectionColor={colors.accent}
          value={surgery}
          onChangeText={setSurgery}
          multiline
          textAlignVertical="top"
          maxLength={2000}
        />
      </View>
    </OnboardingScaffold>
  );
}
