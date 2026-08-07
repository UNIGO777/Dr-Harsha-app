/**
 * RatingScale — the 0–10 row used for both the pain check-in and the per-exercise
 * ease rating.
 *
 * Numbers rather than a slider: a slider demands fine motor control and never
 * shows the value you actually picked. For a clinical scale that a 60-year-old
 * uses mid-workout, discrete taps are faster and unambiguous.
 *
 * The selected pill is tinted by MEANING, not by position — `tone` says whether
 * a high number is good news or bad news, so pain 9 reads red while ease 9
 * reads mint.
 */
import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';

import type { Palette } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

interface RatingScaleProps {
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  lowLabel: string;
  highLabel: string;
  /** Whether a HIGH number is the bad end (pain) or the good end (ease). */
  tone: 'high-is-bad' | 'high-is-good';
}

function toneColor(
  value: number,
  min: number,
  max: number,
  tone: RatingScaleProps['tone'],
  colors: Palette,
): string {
  const span = Math.max(1, max - min);
  const t = (value - min) / span;
  const severity = tone === 'high-is-bad' ? t : 1 - t;
  if (severity >= 0.8) return colors.danger;
  if (severity >= 0.5) return colors.amber;
  return colors.accent;
}

export function RatingScale({
  value,
  onChange,
  min = 0,
  max = 10,
  lowLabel,
  highLabel,
  tone,
}: RatingScaleProps) {
  const colors = useThemeColors();
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <View>
      <View className="flex-row gap-1">
        {steps.map((step) => {
          const selected = value === step;
          const fill = toneColor(step, min, max, tone, colors);

          return (
            <Pressable
              key={step}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${step}`}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onChange(step);
              }}
              className="h-11 flex-1 items-center justify-center rounded-input active:opacity-80"
              style={{
                backgroundColor: selected ? fill : colors.inputFill,
                borderWidth: 1,
                borderColor: selected ? fill : colors.border,
              }}
            >
              <Text
                className="font-sans-semibold text-[13px]"
                style={{ color: selected ? colors.accentText : colors.textSecondary }}
              >
                {step}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-2 flex-row justify-between">
        <Text className="font-sans text-[11px]" style={{ color: colors.microLabel }}>
          {lowLabel}
        </Text>
        <Text className="font-sans text-[11px]" style={{ color: colors.microLabel }}>
          {highLabel}
        </Text>
      </View>
    </View>
  );
}
