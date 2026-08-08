/**
 * Fixed top bar: optional back chevron, title, optional trailing action.
 *
 * Stays put while the body scrolls, so the user always knows where they are and
 * can always get back — the pattern the programs and profile sections share.
 * Home is the deliberate exception: it swaps this for a wordmark bar that fades
 * in on scroll, because its hero ring needs the vertical space at rest.
 */
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/theme/useTheme';

interface ScreenHeaderProps {
  title: string;
  /** Renders the back chevron when provided. */
  onBack?: () => void;
  /** Trailing slot — an action button, a status pill, etc. */
  right?: ReactNode;
}

export function ScreenHeader({ title, onBack, right }: ScreenHeaderProps) {
  const colors = useThemeColors();

  return (
    <View className="h-14 flex-row items-center border-b border-border bg-base px-4">
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="mr-1 h-10 w-10 justify-center active:opacity-70"
        >
          <ChevronLeft color={colors.accent} size={26} />
        </Pressable>
      ) : (
        <View className="w-2" />
      )}

      <Text numberOfLines={1} className="flex-1 font-display-semibold text-xl text-primary">
        {title}
      </Text>

      {right ? <View className="ml-3">{right}</View> : null}
    </View>
  );
}
