/**
 * Selectable pill — used for multi-select onboarding answers (conditions, pain
 * areas, goals). Selected state fills with accent; fires a selection haptic.
 */
import * as Haptics from 'expo-haptics';
import { Pressable, Text } from 'react-native';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      className={`rounded-pill border px-4 py-2.5 ${
        selected ? 'border-accent bg-accent' : 'border-border bg-surface'
      }`}
    >
      <Text
        className={`font-sans-medium text-sm ${selected ? 'text-accent-text' : 'text-secondary'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
