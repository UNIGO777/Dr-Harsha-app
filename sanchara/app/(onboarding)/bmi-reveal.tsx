// Onboarding step 5 (new) — animated BMI reveal. Counts the number up and sweeps
// a ring based on the height/weight captured on the previous screen.
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Button } from '@/components/ui';
import { ONBOARDING_TOTAL_STEPS, STEP } from '@/features/onboarding/steps';
import { bmiCategory, calculateBmi } from '@/lib/bmi';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useThemeColors } from '@/theme/useTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// BMI scale window mapped onto the ring sweep.
const BMI_MIN = 15;
const BMI_MAX = 40;
const RING_SIZE = 220;
const STROKE = 16;
const R = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

// The tone is stored as a PALETTE KEY rather than a literal colour, so this map
// can stay at module scope while still resolving per active theme.
const COPY: Record<
  ReturnType<typeof bmiCategory>,
  { label: string; note: string; tone: 'textSecondary' | 'accent' | 'danger' }
> = {
  underweight: {
    label: 'Underweight',
    note: "We'll focus on gentle, strength-building movement.",
    tone: 'textSecondary',
  },
  normal: {
    label: 'Healthy',
    note: "You're in a healthy range — we'll build on a strong foundation.",
    tone: 'accent',
  },
  overweight: {
    label: 'Overweight',
    note: "We'll ease in with joint-friendly movement.",
    tone: 'textSecondary',
  },
  obese: {
    label: 'Obese',
    note: "We'll start low-impact and progress you safely.",
    tone: 'danger',
  },
};

export default function BmiRevealScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { heightCm, weightKg } = useOnboardingStore((s) => s.draft);

  const bmi = useMemo(
    () => (heightCm && weightKg ? calculateBmi(weightKg, heightCm) : null),
    [heightCm, weightKg],
  );

  const category = bmi !== null ? bmiCategory(bmi) : 'normal';
  const copy = COPY[category];
  const copyColor = colors[copy.tone];
  const ringTarget = bmi !== null ? Math.min(Math.max((bmi - BMI_MIN) / (BMI_MAX - BMI_MIN), 0), 1) : 0;

  const progress = useSharedValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (bmi === null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    progress.value = withTiming(ringTarget, { duration: 1200 });

    // Count the number up (easeOutCubic).
    const duration = 1200;
    const start = Date.now();
    let raf: number;
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(bmi * eased * 10) / 10);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [bmi, ringTarget, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  // Guard: if the user somehow lands here without metrics, send them back.
  if (bmi === null) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-base px-6">
        <Text className="text-center font-sans text-base text-secondary">
          We need your height and weight first.
        </Text>
        <View className="mt-6 w-full">
          <Button label="Go back" onPress={() => router.replace('/(onboarding)/body-metrics')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-base">
      <SafeAreaView className="flex-1 px-6">
        {/* Top bar */}
        <View className="h-10 flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} hitSlop={12} className="w-10">
            <ChevronLeft color={colors.accent} size={26} />
          </Pressable>
          <Text className="font-sans-semibold text-xs uppercase tracking-[2px] text-accent">
            Step {STEP.bmiReveal} of {ONBOARDING_TOTAL_STEPS}
          </Text>
          <Pressable onPress={() => router.replace('/')} hitSlop={12} className="w-10 items-end">
            <X color={colors.textSecondary} size={24} />
          </Pressable>
        </View>

        {/* Reveal */}
        <View className="flex-1 items-center justify-center">
          <View style={{ width: RING_SIZE, height: RING_SIZE }} className="items-center justify-center">
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={R}
                stroke={colors.surface}
                strokeWidth={STROKE}
                fill="none"
              />
              <AnimatedCircle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={R}
                stroke={copyColor}
                strokeWidth={STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={CIRCUMFERENCE}
                animatedProps={animatedProps}
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            </Svg>
            <View className="absolute items-center">
              <Text className="font-sans text-xs uppercase tracking-[3px] text-micro">Your BMI</Text>
              <Text className="font-display-bold text-6xl text-primary">{display.toFixed(1)}</Text>
            </View>
          </View>

          <Text
            style={{ color: copyColor }}
            className="mt-8 font-sans-semibold text-sm uppercase tracking-[2px]"
          >
            {copy.label}
          </Text>
          <Text className="mt-3 max-w-[300px] text-center font-sans text-base leading-6 text-secondary">
            {copy.note}
          </Text>
        </View>

        {/* CTA */}
        <View className="pb-2">
          <Button label="Continue" onPress={() => router.push('/(onboarding)/pain-areas')} />
        </View>
      </SafeAreaView>
    </View>
  );
}
