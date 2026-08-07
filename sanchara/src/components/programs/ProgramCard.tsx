/**
 * Program card for the "all programs" list. Full-bleed thumbnail (or gradient
 * fallback when no image), difficulty badge, title, one-line description, and a
 * duration/difficulty meta row. Taps through to the program detail.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Dumbbell } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { resolveThumbnail } from '@/lib/media';
import type { Difficulty, ProgramSummary } from '@/features/programs/api';
import { onImage, withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: 'Beginner',
  MEDIUM: 'Optimal',
  HARD: 'Advanced',
};

export function ProgramCard({
  program,
  onPress,
}: {
  program: ProgramSummary;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const cover = resolveThumbnail(program);
  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-card border border-border bg-surface active:opacity-90"
    >
      {/* Thumbnail — gradient fallback sits behind the image so a failed load
          (or missing URL) still shows something clean. */}
      <View className="h-40 w-full">
        <LinearGradient
          colors={[withAlpha(colors.accent, 0.14), colors.inputFill]}
          style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}
        >
          <Dumbbell color={colors.border} size={40} />
        </LinearGradient>
        {cover ? (
          <Image
            source={cover}
            style={{ position: 'absolute', inset: 0 }}
            contentFit="cover"
            transition={200}
          />
        ) : null}
        {/* Softens the photo toward the page colour — darkens in dark mode,
            lightens in light mode, so the card reads calm either way. */}
        <View
          style={{ position: 'absolute', inset: 0, backgroundColor: withAlpha(colors.base, 0.3) }}
        />
        {program.difficultyLevel ? (
          // Sits ON the photo, so it keeps the fixed dark chip in both themes.
          <View
            className="absolute left-3 top-3 rounded-pill px-3 py-1"
            style={{ backgroundColor: onImage.chipFill }}
          >
            <Text
              className="font-sans-semibold text-[11px] uppercase tracking-wide"
              style={{ color: onImage.accent }}
            >
              {DIFFICULTY_LABEL[program.difficultyLevel]}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Body */}
      <View className="p-4">
        <Text className="font-display-semibold text-xl text-primary">{program.name}</Text>
        {program.description ? (
          <Text numberOfLines={2} className="mt-1 font-sans text-sm leading-5 text-secondary">
            {program.description}
          </Text>
        ) : null}
        <View className="mt-4 flex-row items-center justify-between">
          <Text className="font-sans text-xs uppercase tracking-[1.5px] text-micro">
            {program.durationDays ? `${program.durationDays} days` : 'Program'}
            {program.difficultyLevel ? ` · ${DIFFICULTY_LABEL[program.difficultyLevel]}` : ''}
          </Text>
          <ArrowRight color={colors.accent} size={20} />
        </View>
      </View>
    </Pressable>
  );
}
