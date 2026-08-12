/**
 * READY — the screen before the movement starts.
 *
 * One decision only: how many reps. Three options, no free entry, no sets, no
 * rest picker. A patient sitting on a mat at 6:40am should be able to answer in
 * under two seconds, and every extra control is a reason to close the app.
 *
 * The choice CARRIES across the session — pick 10 on the first movement and the
 * rest are pre-set to 10 — but stays changeable on each one, because the third
 * exercise is often the one that hurts and she needs to be able to drop to 5
 * without it being a whole negotiation.
 */
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Play } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { REP_OPTIONS, type RepOption } from '@/lib/enums';
import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

interface RepChooserProps {
  title: string;
  notes?: string;
  thumbnail?: string;
  /** Position in the workout, 1-based. */
  position: number;
  total: number;
  reps: RepOption;
  onChangeReps: (reps: RepOption) => void;
  onStart: () => void;
}

export function RepChooser({
  title,
  notes,
  thumbnail,
  position,
  total,
  reps,
  onChangeReps,
  onStart,
}: RepChooserProps) {
  const colors = useThemeColors();

  return (
    <View className="flex-1 px-6">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Text
          className="mt-2 font-sans-semibold text-[11px]"
          style={{ color: colors.microLabel, letterSpacing: 1.6 }}
        >
          MOVEMENT {position} OF {total}
        </Text>
        <Text className="mt-2 font-display-bold text-[32px] leading-[38px] text-primary">
          {title}
        </Text>

        {thumbnail ? (
          <Image
            source={thumbnail}
            style={{
              width: '100%',
              aspectRatio: 16 / 9,
              borderRadius: 20,
              marginTop: 18,
              backgroundColor: colors.inputFill,
            }}
            contentFit="cover"
            transition={220}
          />
        ) : null}

        {notes ? (
          <Text className="mt-4 font-sans text-[15px] leading-6 text-secondary">{notes}</Text>
        ) : null}

        <Text
          className="mt-8 font-sans-semibold text-[11px]"
          style={{ color: colors.microLabel, letterSpacing: 1.6 }}
        >
          HOW MANY REPS?
        </Text>

        <View className="mt-3 flex-row gap-3">
          {REP_OPTIONS.map((option) => {
            const selected = option === reps;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${option} reps`}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  onChangeReps(option);
                }}
                className="flex-1 items-center justify-center rounded-card py-6 active:opacity-80"
                style={{
                  backgroundColor: selected ? withAlpha(colors.accent, 0.14) : colors.surface,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? colors.accent : colors.border,
                }}
              >
                <Text
                  className="font-display-bold"
                  style={{ fontSize: 34, color: selected ? colors.accent : colors.textPrimary }}
                >
                  {option}
                </Text>
                <Text
                  className="mt-0.5 font-sans text-[12px]"
                  style={{ color: selected ? colors.accent : colors.microLabel }}
                >
                  reps
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mt-3 font-sans text-[13px] leading-5" style={{ color: colors.microLabel }}>
          Pick what you can finish comfortably. You can stop early at any point and it still counts.
        </Text>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Start ${title}, ${reps} reps`}
        onPress={onStart}
        className="mb-2 mt-4 h-[62px] flex-row items-center justify-center rounded-pill active:opacity-90"
        style={{ backgroundColor: colors.accent }}
      >
        <Play color={colors.accentText} size={19} fill={colors.accentText} />
        <Text className="ml-2.5 font-sans-semibold text-[17px]" style={{ color: colors.accentText }}>
          Start
        </Text>
      </Pressable>
    </View>
  );
}
