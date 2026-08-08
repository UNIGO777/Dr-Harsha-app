/**
 * Profile building blocks — a titled section with an optional Edit action, and
 * the label/value rows inside it.
 *
 * Values are right-aligned against left-aligned labels so the whole card scans
 * as a table; an unset value shows an em dash rather than collapsing, which
 * keeps "we don't know this yet" visible instead of silently absent.
 */
import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/theme/useTheme';

export function Section({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  const colors = useThemeColors();
  return (
    <View className="mt-8">
      <View className="mb-3 flex-row items-center justify-between">
        <Text
          className="font-sans-semibold text-[11px]"
          style={{ color: colors.microLabel, letterSpacing: 1.6 }}
        >
          {title.toUpperCase()}
        </Text>
        {action ? (
          <Pressable
            accessibilityRole="button"
            onPress={onAction}
            hitSlop={8}
            className="flex-row items-center active:opacity-70"
          >
            <Text className="font-sans-semibold text-[13px]" style={{ color: colors.accent }}>
              {action}
            </Text>
            <ChevronRight color={colors.accent} size={15} />
          </Pressable>
        ) : null}
      </View>
      <View className="overflow-hidden rounded-card border border-border bg-surface">{children}</View>
    </View>
  );
}

export function Row({
  label,
  value,
  last = false,
}: {
  label: string;
  value?: string | number | null;
  last?: boolean;
}) {
  const colors = useThemeColors();
  const shown = value === null || value === undefined || value === '' ? '—' : String(value);

  return (
    <View
      className="flex-row items-start justify-between px-4 py-3.5"
      style={last ? undefined : { borderBottomWidth: 1, borderBottomColor: colors.border }}
    >
      <Text className="font-sans text-[14px]" style={{ color: colors.microLabel }}>
        {label}
      </Text>
      <Text
        className="ml-4 flex-1 text-right font-sans-medium text-[14px] text-primary"
        numberOfLines={3}
      >
        {shown}
      </Text>
    </View>
  );
}
