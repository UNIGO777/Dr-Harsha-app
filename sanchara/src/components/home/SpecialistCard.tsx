/**
 * SpecialistCard — a human face at the bottom of the screen. Reinforces that a
 * real clinician is behind the program and offers the consultation booking
 * entry point.
 */
import { Image, type ImageSource } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/theme/useTheme';

interface SpecialistCardProps {
  name: string;
  title: string;
  /** Bundled asset (require) or a remote URL. */
  avatar: ImageSource | string | number;
  onBook: () => void;
}

export function SpecialistCard({ name, title, avatar, onBook }: SpecialistCardProps) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center rounded-card border border-border bg-surface p-4">
      <Image
        source={avatar}
        style={{ width: 52, height: 52, borderRadius: 999, backgroundColor: colors.inputFill }}
        contentFit="cover"
        transition={300}
      />
      <View className="ml-3 flex-1">
        <Text className="font-sans-semibold text-[15px] text-primary">{name}</Text>
        <Text className="mt-0.5 font-sans text-xs" style={{ color: colors.microLabel }}>
          {title}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Book a consultation with ${name}`}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onBook();
        }}
        className="rounded-pill px-5 py-3 active:opacity-80"
        style={{ backgroundColor: colors.inputFill, borderWidth: 1, borderColor: colors.border }}
      >
        <Text className="font-sans-semibold text-[13px] text-primary">Book</Text>
      </Pressable>
    </View>
  );
}
