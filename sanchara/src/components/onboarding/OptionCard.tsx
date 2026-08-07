/**
 * Selectable card row for single-choice onboarding steps (exercise experience,
 * goal). Optional left icon and right radio dot; selected state lifts the border
 * to accent. Fires a selection haptic.
 */
import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/theme/useTheme';

interface OptionCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  selected: boolean;
  onPress: () => void;
  showRadio?: boolean;
}

export function OptionCard({
  title,
  description,
  icon: Icon,
  selected,
  onPress,
  showRadio = false,
}: OptionCardProps) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      className={`flex-row items-center rounded-card border bg-surface p-4 ${
        selected ? 'border-accent' : 'border-border'
      }`}
    >
      {Icon ? (
        <View className="mr-4 h-11 w-11 items-center justify-center rounded-2xl bg-input-fill">
          <Icon color={selected ? colors.accent : colors.textSecondary} size={22} strokeWidth={2} />
        </View>
      ) : null}

      <View className="flex-1">
        <Text className="font-sans-semibold text-base text-primary">{title}</Text>
        {description ? (
          <Text className="mt-0.5 font-sans text-sm text-secondary">{description}</Text>
        ) : null}
      </View>

      {showRadio ? (
        <View
          className={`ml-3 h-6 w-6 items-center justify-center rounded-full border ${
            selected ? 'border-accent' : 'border-border'
          }`}
        >
          {selected ? <View className="h-3 w-3 rounded-full bg-accent" /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}
