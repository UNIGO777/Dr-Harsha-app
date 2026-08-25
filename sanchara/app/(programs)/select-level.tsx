/**
 * Choose your level — a page of its own, deliberately.
 *
 * This is the single most consequential choice a patient makes: it decides what
 * their body will actually be asked to do, every day, for the whole program.
 * Buried at the bottom of the detail page it was one control among many; on its
 * own screen it is the only question being asked, which is what a decision of
 * this weight deserves.
 *
 * A level is a SETTING, not a stage. Nothing promotes anyone: finishing your
 * level finishes the program, and only Dr. Harsha moves someone between levels,
 * from the clinical portal. The copy says so plainly, because a patient who
 * believes they are on a ladder will pick the bottom rung to "work up from" —
 * and end up on work that is too easy to help them.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ErrorState } from '@/components/ui';
import { isActiveEnrollmentConflict, useEnroll } from '@/features/enrollments/api';
import { useProgram } from '@/features/programs/api';
import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

export default function SelectLevelScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { programId } = useLocalSearchParams<{ programId: string }>();

  const { data: program, isLoading, isError, error, refetch } = useProgram(programId);
  const enroll = useEnroll();

  const [picked, setPicked] = useState<number | null>(null);
  const levels = program?.levels ?? [];
  // Nothing is pre-selected: this is a real choice, and a pre-ticked option is
  // one a patient will accept without reading it.
  const chosen = picked;

  async function start(switchExisting?: boolean) {
    if (!programId || chosen === null) return;
    try {
      await enroll.mutateAsync({ programId, switchExisting, levelNumber: chosen });
      router.replace('/(app)/(tabs)/home');
    } catch (e: unknown) {
      if (!switchExisting && isActiveEnrollmentConflict(e)) {
        Alert.alert(
          'Switch program?',
          'Your current program is paused, not lost — come back to it any time and you carry on ' +
            'from the same day.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Switch', onPress: () => start(true) },
          ],
        );
        return;
      }
      Alert.alert('Could not start', 'Something went wrong. Please try again.');
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-base">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (isError || !program) {
    return (
      <SafeAreaView className="flex-1 bg-base">
        <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load this program" />
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-base">
      <SafeAreaView edges={['top']}>
        <View className="flex-row items-center px-5 py-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            hitSlop={12}
            className="w-10 active:opacity-70"
          >
            <ChevronLeft color={colors.accent} size={26} />
          </Pressable>
          <View className="w-10" />
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="font-sans-semibold text-[11px]"
          style={{ color: colors.microLabel, letterSpacing: 1.6 }}
        >
          {(program.name ?? 'PROGRAM').toUpperCase()}
        </Text>
        <Text className="mt-2 font-display-bold text-[34px] leading-[40px] text-primary">
          Choose your level
        </Text>
        <Text className="mt-3 font-sans text-[15px] leading-6 text-secondary">
          Pick what feels right for your body today — not what you think you should manage. You stay
          on this level for the whole program; it never changes on its own, and Dr. Harsha can move
          you if it turns out to be the wrong fit.
        </Text>

        <View className="mt-7 gap-3">
          {levels.map((lvl) => {
            const selected = lvl.levelNumber === chosen;
            const workDays = lvl.days.filter((d) => !d.isRestDay).length;
            return (
              <Pressable
                key={lvl.levelNumber}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${lvl.title ?? `Level ${lvl.levelNumber}`}, ${lvl.dayCount} days`}
                onPress={() => setPicked(lvl.levelNumber)}
                className="rounded-card p-4 active:opacity-90"
                style={{
                  backgroundColor: selected ? withAlpha(colors.accent, 0.1) : colors.surface,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? colors.accent : colors.border,
                }}
              >
                <View className="flex-row items-center">
                  <View
                    className="h-6 w-6 items-center justify-center rounded-pill"
                    style={{
                      backgroundColor: selected ? colors.accent : 'transparent',
                      borderWidth: selected ? 0 : 1.5,
                      borderColor: colors.border,
                    }}
                  >
                    {selected ? (
                      <Check color={colors.accentText} size={13} strokeWidth={3.5} />
                    ) : null}
                  </View>

                  <View className="ml-3 flex-1">
                    <Text className="font-display-bold text-[19px] text-primary">
                      {lvl.title ?? `Level ${lvl.levelNumber}`}
                    </Text>
                    <Text className="mt-0.5 font-sans text-[13px]" style={{ color: colors.microLabel }}>
                      {lvl.dayCount} day{lvl.dayCount === 1 ? '' : 's'}
                      {workDays !== lvl.dayCount ? ` · ${workDays} with exercises` : ''}
                    </Text>
                  </View>
                </View>

                {lvl.description ? (
                  <Text className="ml-9 mt-2 font-sans text-[13px] leading-5 text-secondary">
                    {lvl.description}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {levels.length === 0 ? (
          <Text className="mt-6 font-sans text-sm leading-6 text-secondary">
            This program doesn&apos;t have levels — you can start it straight away.
          </Text>
        ) : null}
      </ScrollView>

      <View
        style={{ paddingBottom: insets.bottom + 10 }}
        className="absolute bottom-0 left-0 right-0 border-t border-border bg-base px-6 pt-3"
      >
        <Button
          label={
            chosen === null
              ? 'Choose a level to continue'
              : `Start · ${levels.find((l) => l.levelNumber === chosen)?.title ?? `Level ${chosen}`}`
          }
          disabled={chosen === null}
          loading={enroll.isPending}
          onPress={() => start()}
        />
      </View>
    </View>
  );
}
