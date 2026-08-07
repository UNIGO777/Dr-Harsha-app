/**
 * Text input on the input-fill surface with an optional micro-label above and an
 * error line below. Focus state lifts the border to the accent colour.
 */
import { forwardRef, useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { useResolvedTheme, useThemeColors } from '@/theme/useTheme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, onFocus, onBlur, ...rest },
  ref,
) {
  const colors = useThemeColors();
  const theme = useResolvedTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View className="w-full">
      {label ? (
        <Text className="mb-2 font-sans text-xs uppercase tracking-[2px] text-micro">{label}</Text>
      ) : null}
      <TextInput
        keyboardAppearance={theme}
        ref={ref}
        placeholderTextColor={colors.microLabel}
        selectionColor={colors.accent}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        className={`h-14 rounded-input border bg-input-fill px-4 font-sans text-base text-primary ${
          error ? 'border-danger' : focused ? 'border-accent' : 'border-border'
        }`}
        {...rest}
      />
      {error ? <Text className="mt-1.5 font-sans text-xs text-danger">{error}</Text> : null}
    </View>
  );
});
