// Onboarding step 7 — health background: existing conditions + past surgeries.
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { Chip, TextComposer } from '@/components/ui';
import { STEP } from '@/features/onboarding/steps';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useThemeColors } from '@/theme/useTheme';

const COMMON_CONDITIONS = [
  'Diabetes',
  'High blood pressure / Hypertension',
  'Brain or neurological condition',
  'Heart condition',
  'High cholesterol',
  'Asthma or other breathing condition',
  'Thyroid condition',
  'Bone-related condition',
  'Joint-related condition',
  'Previous injury',
];

export default function ConditionsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);

  const [conditions, setConditions] = useState<string[]>(draft.conditions);
  const [surgery, setSurgery] = useState(draft.surgeryHistory ?? '');
  const [composerOpen, setComposerOpen] = useState(false);

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
      title="Do you have any of the following health conditions?"
      subtitle="Select all that apply. Skip if none apply to you."
      onContinue={onContinue}
    >
      <View className="flex-row flex-wrap gap-2.5">
        {COMMON_CONDITIONS.map((c) => (
          <Chip key={c} label={c} selected={conditions.includes(c)} onPress={() => toggle(c)} />
        ))}
      </View>

      <View className="mt-8">
        <Text className="mb-2 font-sans text-xs uppercase tracking-[2px] text-micro">
          Past operations or injuries (optional)
        </Text>
        <Pressable
          onPress={() => setComposerOpen(true)}
          className="min-h-[64px] flex-row items-center justify-between rounded-input border border-border bg-input-fill px-4 py-3"
        >
          <Text
            numberOfLines={2}
            className={`mr-3 flex-1 font-sans text-base ${surgery ? 'text-primary' : 'text-micro'}`}
          >
            {surgery || 'Tap to add details…'}
          </Text>
          <ChevronRight color={colors.microLabel} size={20} />
        </Pressable>
      </View>

      <TextComposer
        visible={composerOpen}
        title="Operations or injuries"
        initialValue={surgery}
        placeholder="e.g. knee replacement in 2021, lower-back injury…"
        maxLength={2000}
        onDone={(t) => {
          setSurgery(t.trim());
          setComposerOpen(false);
        }}
      />
    </OnboardingScaffold>
  );
}
