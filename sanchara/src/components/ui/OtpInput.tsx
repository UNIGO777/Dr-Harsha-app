/**
 * Segmented OTP entry. Renders `length` boxes but is driven by a single hidden
 * TextInput (simplest reliable pattern on RN) — tapping anywhere focuses it.
 * Fires a selection haptic per digit. Controlled via `value`/`onChange`.
 */
import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useResolvedTheme } from '@/theme/useTheme';

interface OtpInputProps {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  autoFocus?: boolean;
}

export function OtpInput({ value, onChange, length = 6, autoFocus = true }: OtpInputProps) {
  const theme = useResolvedTheme();
  const inputRef = useRef<TextInput>(null);
  const cells = Array.from({ length });

  return (
    <Pressable onPress={() => inputRef.current?.focus()} className="w-full">
      <View className="flex-row justify-between">
        {cells.map((_, i) => {
          const char = value[i] ?? '';
          const isActive = i === value.length;
          return (
            <View
              key={i}
              className={`h-16 w-12 items-center justify-center rounded-input border bg-input-fill ${
                char || isActive ? 'border-accent' : 'border-border'
              }`}
            >
              <Text className="font-display-semibold text-2xl text-primary">{char}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        keyboardAppearance={theme}
        ref={inputRef}
        autoFocus={autoFocus}
        value={value}
        onChangeText={(next) => {
          const digits = next.replace(/\D/g, '').slice(0, length);
          if (digits.length > value.length) {
            Haptics.selectionAsync().catch(() => {});
          }
          onChange(digits);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        maxLength={length}
        // Visually hidden but focusable and accessible.
        className="absolute h-px w-px opacity-0"
      />
    </Pressable>
  );
}
