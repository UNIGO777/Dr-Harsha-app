/**
 * Pain check-in — the first state of every session (SESSION_STATES[0]).
 *
 * This is a CLINICAL SAFETY GATE, not a formality: the server refuses to create
 * a session when any score is >= 8 and returns `blocked` with guidance. The
 * patient can still override, but that decision is audit-logged for the
 * clinician, so the UI states the risk plainly instead of hiding the option.
 *
 * Scores are collected per area the patient reported during onboarding, falling
 * back to a single overall score for patients who listed none.
 */
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ShieldAlert } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RatingScale } from '@/components/session/RatingScale';
import { Button } from '@/components/ui';
import { useMe } from '@/features/auth/api';
import { dayAlreadyCompleted } from '@/features/enrollments/api';
import { useStartSession } from '@/features/sessions/api';
import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

const OVERALL = 'Overall';

export default function PainCheckinScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { programDayId } = useLocalSearchParams<{ programDayId: string }>();
  const me = useMe();
  const startSession = useStartSession();

  const areas = me.data?.painAreas?.length ? me.data.painAreas : [OVERALL];
  const [scores, setScores] = useState<Record<string, number>>({});
  const [blocked, setBlocked] = useState<{ message: string; maxScore: number } | null>(null);

  const answered = areas.every((area) => scores[area] !== undefined);

  async function begin(safetyOverride = false) {
    if (!programDayId) {
      Alert.alert('No workout selected', 'Go back and start the session from your plan.');
      return;
    }

    try {
      const result = await startSession.mutateAsync({
        programDayId,
        painCheckin: areas.map((area) => ({ area, score: scores[area] ?? 0 })),
        safetyOverride,
        safetyOverrideReason: safetyOverride ? 'Patient chose to continue after warning' : undefined,
      });

      if (result.blocked) {
        setBlocked({ message: result.message, maxScore: result.maxScore });
        return;
      }
      router.replace('/(session)/player');
    } catch (err) {
      // Raced the daily lock (stale plan data, or two devices). Say when to
      // come back rather than showing a generic failure.
      const locked = dayAlreadyCompleted(err);
      if (locked) {
        Alert.alert(
          "That's today done",
          "You've already completed a session today. Your next one opens tomorrow.",
          [{ text: 'OK', onPress: () => router.replace('/(app)/(tabs)/home') }],
        );
        return;
      }
      Alert.alert('Could not start', 'Something went wrong. Please try again.');
    }
  }

  // ── Safety gate tripped ────────────────────────────────────────────────────
  if (blocked) {
    return (
      <SafeAreaView className="flex-1 bg-base px-6">
        <View className="flex-1 justify-center">
          <View
            className="h-14 w-14 items-center justify-center rounded-pill"
            style={{ backgroundColor: withAlpha(colors.danger, 0.14) }}
          >
            <ShieldAlert color={colors.danger} size={28} />
          </View>

          <Text className="mt-6 font-display-bold text-3xl leading-9 text-primary">
            Let&apos;s pause today
          </Text>
          <Text className="mt-3 font-sans text-base leading-7 text-secondary">
            {blocked.message}
          </Text>
          <Text className="mt-4 font-sans text-sm leading-6" style={{ color: colors.microLabel }}>
            You rated your pain {blocked.maxScore} out of 10. Exercising through pain at this level
            can set your recovery back. Your clinical team will see this check-in.
          </Text>
        </View>

        <View className="gap-3 pb-4">
          <Button label="Rest today" onPress={() => router.replace('/(app)/(tabs)/home')} />
          <Button
            label="Start anyway"
            variant="ghost"
            loading={startSession.isPending}
            onPress={() =>
              Alert.alert(
                'Start despite high pain?',
                'This will be recorded and shared with your clinician. Stop immediately if pain increases.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Start anyway', style: 'destructive', onPress: () => begin(true) },
                ],
              )
            }
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Check-in ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-base">
      <View className="h-12 flex-row items-center px-6">
        <Pressable onPress={() => router.back()} hitSlop={12} className="w-10">
          <ChevronLeft color={colors.accent} size={26} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-sans-semibold text-xs uppercase tracking-[2px] text-accent">
          Before we begin
        </Text>
        <Text className="mt-2 font-display-bold text-3xl leading-9 text-primary">
          How is your pain today?
        </Text>
        <Text className="mt-3 font-sans text-base leading-6 text-secondary">
          This takes a few seconds and keeps today&apos;s session safe for you.
        </Text>

        <View className="mt-8 gap-7">
          {areas.map((area) => (
            <View key={area}>
              <Text className="mb-3 font-sans-semibold text-[15px] text-primary">{area}</Text>
              <RatingScale
                value={scores[area] ?? null}
                onChange={(score) => setScores((prev) => ({ ...prev, [area]: score }))}
                tone="high-is-bad"
                lowLabel="No pain"
                highLabel="Worst pain"
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="px-6 pb-4 pt-2">
        <Button
          label="Start session"
          disabled={!answered}
          loading={startSession.isPending}
          onPress={() => begin(false)}
        />
        {!answered ? (
          <Text className="mt-3 text-center font-sans text-xs" style={{ color: colors.microLabel }}>
            Rate every area to continue
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
