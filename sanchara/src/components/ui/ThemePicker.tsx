/**
 * ThemePicker — three-way appearance choice (Light · Dark · System) shown on the
 * onboarding welcome screen and again under Profile → Appearance.
 *
 * Each option renders a MINIATURE of the theme it selects, drawn from the real
 * palettes rather than icons alone: for users aged 30–60 a picture of the result
 * is easier to judge than the words "light" and "dark". The System tile shows
 * both halves, which is exactly what "follows your phone" means.
 *
 * Selecting applies the theme immediately — no Save button — so the whole screen
 * repaints under the finger and the choice is self-evidently reversible.
 */
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { darkColors, lightColors, type Palette } from '@/theme/tokens';
import { useThemeColors, useThemeStore, type ThemePreference } from '@/theme/useTheme';

interface Option {
  value: ThemePreference;
  label: string;
  hint: string;
}

const OPTIONS: Option[] = [
  { value: 'light', label: 'Light', hint: 'Bright' },
  { value: 'dark', label: 'Dark', hint: 'Easy on the eyes' },
  { value: 'system', label: 'System', hint: 'Follows your phone' },
];

/** One half of a preview tile — a scaled-down "screen" in the given palette. */
function PreviewHalf({ palette, style }: { palette: Palette; style?: object }) {
  return (
    <View style={[{ flex: 1, backgroundColor: palette.base, padding: 6, gap: 4 }, style]}>
      <View style={{ height: 5, width: '62%', borderRadius: 3, backgroundColor: palette.accent }} />
      <View
        style={{ height: 4, width: '85%', borderRadius: 2, backgroundColor: palette.textSecondary }}
      />
      <View
        style={{
          flex: 1,
          borderRadius: 5,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.border,
        }}
      />
    </View>
  );
}

function Preview({ value }: { value: ThemePreference }) {
  const frame = {
    height: 62,
    borderRadius: 10,
    overflow: 'hidden' as const,
    flexDirection: 'row' as const,
  };

  if (value === 'system') {
    // Split tile — left light, right dark — literally showing "either one".
    return (
      <View style={frame}>
        <PreviewHalf palette={lightColors} />
        <PreviewHalf palette={darkColors} />
      </View>
    );
  }

  return (
    <View style={frame}>
      <PreviewHalf palette={value === 'light' ? lightColors : darkColors} />
    </View>
  );
}

export function ThemePicker() {
  const colors = useThemeColors();
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  return (
    <View accessibilityRole="radiogroup" className="flex-row gap-3">
      {OPTIONS.map((option) => {
        const selected = preference === option.value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${option.label} appearance. ${option.hint}.`}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setPreference(option.value);
            }}
            className="flex-1 rounded-card p-2.5 active:opacity-80"
            style={{
              backgroundColor: colors.surface,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? colors.accent : colors.border,
              // Compensate for the thicker selected border so tiles don't jump.
              padding: selected ? 9 : 10,
            }}
          >
            <Preview value={option.value} />

            <View className="mt-2.5 flex-row items-center justify-between">
              <Text
                className="font-sans-semibold text-[13px]"
                style={{ color: selected ? colors.accent : colors.textPrimary }}
              >
                {option.label}
              </Text>
              {selected ? <Check size={14} color={colors.accent} strokeWidth={3} /> : null}
            </View>
            <Text numberOfLines={2} className="mt-0.5 font-sans text-[11px] leading-[14px]"
              style={{ color: colors.microLabel }}
            >
              {option.hint}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
