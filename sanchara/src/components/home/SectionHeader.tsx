/**
 * SectionHeader — uppercase micro label with an optional action on the right.
 * Repeated between sections to give the long scroll a steady rhythm.
 */
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

interface SectionHeaderProps {
  label: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ label, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <Text
        className="font-sans-semibold text-[11px]"
        style={{ color: colors.microLabel, letterSpacing: 1.6 }}
      >
        {label}
      </Text>
      {actionLabel ? (
        <Pressable accessibilityRole="button" onPress={onAction} className="active:opacity-70">
          <Text className="font-sans-semibold text-[13px]" style={{ color: colors.accent }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
