/**
 * Primary CTA — full-width accent pill, ~60px tall, near-black label on accent.
 * Fires a light haptic on press for the premium feel. Variants cover the common
 * secondary/ghost cases while keeping the accent pill as the default.
 */
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

import type { Palette } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
}

const containerByVariant: Record<Variant, string> = {
  primary: 'bg-accent',
  secondary: 'bg-surface border border-border',
  ghost: 'bg-transparent',
};

// Label colors are applied via inline style (not className): NativeWind doesn't
// reliably resolve an interpolated color class here, which silently falls back
// to black (only invisible on primary since accentText is already near-black).
// Takes the palette so both themes resolve from the same rule set.
const labelColorByVariant = (c: Palette): Record<Variant, string> => ({
  primary: c.accentText,
  secondary: c.textPrimary,
  ghost: c.accent,
});

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  onPress,
  ...rest
}: ButtonProps) {
  const colors = useThemeColors();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.(e);
      }}
      className={`h-[60px] w-full flex-row items-center justify-center rounded-pill px-6 ${
        containerByVariant[variant]
      } ${isDisabled ? 'opacity-50' : 'active:opacity-90'}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.accentText : colors.accent} />
      ) : (
        <Text
          style={{ color: labelColorByVariant(colors)[variant] }}
          className="font-sans-semibold text-base"
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
