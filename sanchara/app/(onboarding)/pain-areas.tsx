// Onboarding step 6 — where do you feel pain? Tappable body silhouette (front/
// back) covering the full region list, an "Other" free-text option, and the
// selected area names shown as removable chips just above Continue.
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { BodyMap, REGION_LABELS } from '@/components/onboarding/BodyMap';
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { Input } from '@/components/ui';
import { STEP } from '@/features/onboarding/steps';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useThemeColors } from '@/theme/useTheme';

const LABEL_TO_ID: Record<string, string> = Object.fromEntries(
  Object.entries(REGION_LABELS).map(([id, label]) => [label, id]),
);

export default function PainAreasScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);

  // Restore prior selection: known labels -> ids, anything else -> "Other" text.
  const [selected, setSelected] = useState<string[]>(() =>
    draft.painAreas.filter((p) => LABEL_TO_ID[p]).map((p) => LABEL_TO_ID[p]),
  );
  const [other, setOther] = useState(() => draft.painAreas.find((p) => !LABEL_TO_ID[p]) ?? '');

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // Chips shown above the Continue button.
  const chips = useMemo(
    () => [
      ...selected.map((id) => ({
        key: id,
        label: REGION_LABELS[id] ?? id,
        remove: () => toggle(id),
      })),
      ...(other.trim()
        ? [{ key: '__other__', label: other.trim(), remove: () => setOther('') }]
        : []),
    ],
    [selected, other],
  );

  function onContinue() {
    const painAreas = [
      ...selected.map((id) => REGION_LABELS[id] ?? id),
      ...(other.trim() ? [other.trim()] : []),
    ];
    update({ painAreas });
    router.push('/(onboarding)/conditions');
  }

  return (
    <OnboardingScaffold
      step={STEP.painAreas}
      title="Where do you feel pain?"
      subtitle="Select all that apply. You can skip this if nothing hurts."
      onContinue={onContinue}
      aboveCta={
        chips.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            className="mb-3 max-h-10"
          >
            {chips.map((c) => (
              <View
                key={c.key}
                className="flex-row items-center rounded-pill bg-accent/15 px-3 py-1.5"
              >
                <Text className="font-sans-medium text-xs text-accent">{c.label}</Text>
                <Pressable onPress={c.remove} hitSlop={6} className="ml-1.5">
                  <X color={colors.accent} size={13} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null
      }
    >
      <BodyMap selected={selected} onToggle={toggle} />

      <View className="mt-6">
        <Input
          label="Other (please describe)"
          placeholder="e.g. jaw, ribs, mid-thigh…"
          value={other}
          onChangeText={setOther}
          maxLength={80}
        />
      </View>
    </OnboardingScaffold>
  );
}
