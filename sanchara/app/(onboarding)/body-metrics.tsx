// Onboarding step 4 — height + weight with a live BMI chip. On continue we go
// to the animated BMI reveal. BMI itself is derived server-side on submit.
import { useRouter } from 'expo-router';
import { Move } from 'lucide-react-native';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { STEP } from '@/features/onboarding/steps';
import { bmiCategory, calculateBmi } from '@/lib/bmi';
import { useOnboardingStore } from '@/store/onboardingStore';
import { colors } from '@/theme/tokens';

const CATEGORY_LABEL: Record<ReturnType<typeof bmiCategory>, string> = {
  underweight: 'Underweight',
  normal: 'Healthy',
  overweight: 'Overweight',
  obese: 'Obese',
};

function MetricField({
  label,
  unit,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
}) {
  return (
    <View className="flex-1">
      <Text className="mb-2 font-sans text-xs uppercase tracking-[2px] text-micro">{label}</Text>
      <View className="h-16 flex-row items-center rounded-input border border-border bg-input-fill px-4">
        <TextInput
          className="flex-1 font-sans text-lg text-primary"
          placeholder={placeholder}
          placeholderTextColor={colors.microLabel}
          selectionColor={colors.accent}
          keyboardType="number-pad"
          value={value}
          maxLength={3}
          onChangeText={(t) => onChange(t.replace(/\D/g, ''))}
        />
        <Text className="font-sans text-sm text-micro">{unit}</Text>
      </View>
    </View>
  );
}

export default function BodyMetricsScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);

  const [height, setHeight] = useState(draft.heightCm ? String(draft.heightCm) : '');
  const [weight, setWeight] = useState(draft.weightKg ? String(draft.weightKg) : '');

  const h = Number(height);
  const w = Number(weight);
  const valid = h >= 80 && h <= 250 && w >= 20 && w <= 400;
  const bmi = valid ? calculateBmi(w, h) : null;

  function onContinue() {
    if (!valid) return;
    update({ heightCm: h, weightKg: w });
    router.push('/(onboarding)/bmi-reveal');
  }

  return (
    <OnboardingScaffold
      step={STEP.bodyMetrics}
      title="Your body metrics"
      subtitle="This helps calculate your daily energy needs and a safe starting intensity."
      ctaDisabled={!valid}
      onContinue={onContinue}
    >
      {/* Live BMI chip */}
      {bmi !== null ? (
        <View className="mb-6 flex-row items-center self-start rounded-pill bg-accent/15 px-3.5 py-2">
          <Move color={colors.accent} size={15} />
          <Text className="ml-2 font-sans-semibold text-sm text-accent">
            BMI {bmi} · {CATEGORY_LABEL[bmiCategory(bmi)]}
          </Text>
        </View>
      ) : null}

      <View className="flex-row gap-4">
        <MetricField
          label="Height (cm)"
          unit="cm"
          placeholder="175"
          value={height}
          onChange={setHeight}
        />
        <MetricField
          label="Weight (kg)"
          unit="kg"
          placeholder="74"
          value={weight}
          onChange={setWeight}
        />
      </View>
    </OnboardingScaffold>
  );
}
