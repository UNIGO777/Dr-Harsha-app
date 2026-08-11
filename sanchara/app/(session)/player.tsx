/**
 * The session player.
 *
 * Driven entirely by GET /sessions/active, so resuming after an app kill is the
 * same code path as starting fresh — the server's `currentExerciseIndex` is the
 * single source of truth for "where am I", never local state.
 *
 * Per exercise: watch → rate → record. The rating is not optional decoration;
 * `easeScore` is required by POST /exercise/:id/complete because it feeds the
 * progression engine, so the UI collects it before advancing the pointer.
 *
 * State machine: the session sits in EXERCISE_ACTIVE for the whole workout and
 * moves to SESSION_SUMMARY once the last exercise is recorded. Both are legal
 * transitions; the finer-grained NEXT_EXERCISE hop is skipped deliberately, as
 * it would add two round-trips per exercise without changing what the patient
 * sees or what the records contain.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import { Check, ChevronLeft, Leaf, Sliders, VideoOff } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RatingScale } from '@/components/session/RatingScale';
import { RestTimer } from '@/components/session/RestTimer';
import { SetPlanSheet } from '@/components/session/SetPlanSheet';
import { VideoStage } from '@/components/session/VideoStage';
import { Button, ErrorState } from '@/components/ui';
import {
  useAbandonSession,
  useActiveSession,
  useAdvanceState,
  useCompleteExercise,
  useCompleteSession,
} from '@/features/sessions/api';
import {
  DEFAULT_REP_SCHEME,
  DEFAULT_REST_SECONDS,
  REP_SCHEMES,
  type RepSchemeId,
  type RestPreset,
} from '@/lib/enums';
import { resolveMediaUrl } from '@/lib/media';
import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

type Phase = 'watch' | 'rest' | 'rate' | 'summary';

/** One set as performed, in the shape the API records. */
interface PerformedSet {
  setNumber: number;
  targetReps: number;
  completedReps: number;
  restSeconds?: number;
}

export default function SessionPlayerScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const { data: active, isPending, isError, error, refetch } = useActiveSession();
  const advanceState = useAdvanceState();
  const completeExercise = useCompleteExercise();
  const completeSession = useCompleteSession();
  const abandon = useAbandonSession();

  const [phase, setPhase] = useState<Phase>('watch');
  const [ease, setEase] = useState<number | null>(null);
  const [effort, setEffort] = useState<'tooHard' | 'tooEasy' | null>(null);
  /**
   * The rating is asked ONCE per session, after the first exercise, and reused
   * for the rest — being stopped after every single exercise made a short
   * workout feel like a questionnaire.
   *
   * `easeScore` is required per exercise by the API (it feeds the progression
   * engine), so the first answer is carried forward. The session average is
   * therefore identical to the single reading given.
   */
  const sessionEase = useRef<number | null>(null);
  const sessionEffort = useRef<'tooHard' | 'tooEasy' | null>(null);


  const session = active?.session;
  const exercises = active?.exercises ?? [];
  const index = session?.currentExerciseIndex ?? 0;
  const total = exercises.length;
  const exercise = exercises[index];
  const done = total > 0 && index >= total;

  // ── Sets, reps and rest ────────────────────────────────────────────────────
  // The plan is per EXERCISE but carried across them, so a patient who picks
  // 5-5-5 on the first movement is not asked again on every one after it.
  const [scheme, setScheme] = useState<RepSchemeId>(DEFAULT_REP_SCHEME);
  const [rest, setRest] = useState<RestPreset>(DEFAULT_REST_SECONDS);
  const [planOpen, setPlanOpen] = useState(false);
  const [setIndex, setSetIndex] = useState(0);
  const performed = useRef<PerformedSet[]>([]);

  const repPlan = REP_SCHEMES[scheme];
  const totalSets = repPlan.length;
  const currentReps = repPlan[setIndex] ?? repPlan[repPlan.length - 1] ?? 0;
  const isLastSet = setIndex >= totalSets - 1;

  // A new exercise starts its sets from scratch.
  useEffect(() => {
    setSetIndex(0);
    performed.current = [];
    setPhase('watch');
  }, [index]);

  // Leave WARMUP once the player is up. Fire-and-forget: a failed transition
  // must not strand the patient on a spinner, and the exercise records (which
  // is what the clinician reads) are written independently of session.state.
  const movedToActive = useRef(false);
  useEffect(() => {
    if (!session || movedToActive.current) return;
    if (session.state !== 'WARMUP') return;
    movedToActive.current = true;
    advanceState.mutate({ sessionId: session.sessionId, nextState: 'EXERCISE_ACTIVE' });
  }, [session, advanceState]);

  // All exercises recorded → summary.
  useEffect(() => {
    if (done) setPhase('summary');
  }, [done]);

  /** Records the current exercise. `score` is the rating to attribute to it. */
  async function recordExercise(score: number, flag: 'tooHard' | 'tooEasy' | null) {
    if (!session || !exercise) return;
    try {
      await completeExercise.mutateAsync({
        sessionId: session.sessionId,
        exerciseId: exercise.exerciseId,
        setsCompleted: performed.current.length || 1,
        easeScore: score,
        tooHard: flag === 'tooHard',
        tooEasy: flag === 'tooEasy',
        // Set-by-set detail — this is what the clinician's ProgressDay reads.
        repScheme: scheme,
        restPreset: rest,
        sets: performed.current,
      });
      setPhase('watch');
    } catch {
      Alert.alert('Could not save', 'That exercise was not recorded. Please try again.');
    }
  }

  /** From the rating screen: remember the answer, then record. */
  async function submitRating() {
    if (ease === null) return;
    sessionEase.current = ease;
    sessionEffort.current = effort;
    await recordExercise(ease, effort);
  }

  /**
   * Finish the CURRENT SET. Mid-exercise this leads to rest; on the last set it
   * finishes the exercise (asking for a rating the first time only).
   */
  async function finishSet() {
    performed.current = [
      ...performed.current,
      {
        setNumber: setIndex + 1,
        targetReps: currentReps,
        completedReps: currentReps,
        restSeconds: isLastSet ? 0 : rest,
      },
    ];

    if (!isLastSet) {
      setPhase('rest');
      return;
    }

    if (sessionEase.current === null) {
      setPhase('rate');
      return;
    }
    await recordExercise(sessionEase.current, sessionEffort.current);
  }

  async function finishSession() {
    if (!session) return;
    try {
      if (session.state !== 'SESSION_SUMMARY') {
        await advanceState
          .mutateAsync({ sessionId: session.sessionId, nextState: 'SESSION_SUMMARY' })
          .catch(() => {}); // already there / raced — completion is what matters
      }
      const result = await completeSession.mutateAsync({ sessionId: session.sessionId });
      router.replace('/(app)/(tabs)/home');
      if (result.enrollment?.programCompleted) {
        Alert.alert('Program complete', 'You finished every level. Wonderful work.');
      } else if (result.enrollment?.levelAdvanced) {
        Alert.alert('Level up', `You've moved to level ${result.enrollment.currentLevel}.`);
      }
    } catch {
      Alert.alert('Could not finish', 'Something went wrong saving your session.');
    }
  }

  function confirmQuit() {
    if (!session) {
      router.replace('/(app)/(tabs)/home');
      return;
    }
    Alert.alert('End this session?', 'Your progress so far is saved, but the day stays incomplete.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'End session',
        style: 'destructive',
        onPress: async () => {
          await abandon.mutateAsync({ sessionId: session.sessionId }).catch(() => {});
          router.replace('/(app)/(tabs)/home');
        },
      },
    ]);
  }

  // Android's back button/gesture is NOT covered by the layout's
  // `gestureEnabled: false` — that only blocks the iOS swipe. Left alone it
  // pops the screen straight out, skipping the confirmation and leaving the
  // session open on the server, so route it through the same guard.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        confirmQuit();
        return true; // handled — do not pop
      });
      return () => sub.remove();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.sessionId]),
  );

  // ── Loading / no session ───────────────────────────────────────────────────
  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-base">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // A failed load is NOT "you have no session" — telling a patient mid-workout
  // that their session is gone, when the server was merely unreachable, invites
  // them to start over and lose their place.
  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-base">
        <ErrorState
          error={error}
          onRetry={() => void refetch()}
          title="We couldn't load your session"
        />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-base px-8">
        <Text className="text-center font-display-bold text-xl text-primary">
          No session in progress
        </Text>
        <Text className="mt-2 text-center font-sans text-sm text-secondary">
          Start today&apos;s session from your plan.
        </Text>
        <View className="mt-6 w-full">
          <Button label="Back to my plan" onPress={() => router.replace('/(app)/(tabs)/home')} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  if (phase === 'summary' || done) {
    return (
      <SafeAreaView className="flex-1 bg-base px-6">
        <View className="flex-1 justify-center">
          <View
            className="h-16 w-16 items-center justify-center rounded-pill"
            style={{ backgroundColor: withAlpha(colors.accent, 0.14) }}
          >
            <Check color={colors.accent} size={32} strokeWidth={3} />
          </View>
          <Text className="mt-6 font-display-bold text-4xl leading-[46px] text-primary">
            Session complete
          </Text>
          <Text className="mt-3 font-sans text-base leading-7 text-secondary">
            You finished {total} exercise{total === 1 ? '' : 's'}
            {session.levelNumber ? ` on level ${session.levelNumber}` : ''}
            {session.dayNumber ? `, day ${session.dayNumber}` : ''}. That&apos;s another day of
            progress banked.
          </Text>
        </View>

        <View className="pb-4">
          <Button
            label="Finish"
            loading={completeSession.isPending}
            onPress={finishSession}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!exercise) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-base px-8">
        <Text className="text-center font-display-bold text-xl text-primary">
          This day has no exercises yet
        </Text>
        <View className="mt-6 w-full">
          <Button label="Back to my plan" onPress={() => router.replace('/(app)/(tabs)/home')} />
        </View>
      </SafeAreaView>
    );
  }

  const videoUri = resolveMediaUrl(exercise.videoUrl);

  return (
    <SafeAreaView className="flex-1 bg-base">
      {/* Header — position in the workout */}
      <View className="flex-row items-center px-5 py-2">
        <Pressable onPress={confirmQuit} hitSlop={12} className="w-10" accessibilityLabel="End session">
          <ChevronLeft color={colors.accent} size={26} />
        </Pressable>
        <View className="flex-1 items-center">
          <Text
            className="font-sans-semibold text-[11px]"
            style={{ color: colors.microLabel, letterSpacing: 1.6 }}
          >
            EXERCISE {index + 1} OF {total}
          </Text>
        </View>
        <View className="w-10" />
      </View>

      {/* Moderate pain at check-in → loaded work was withheld. Say so, or the
          shorter session reads as a bug. */}
      {session.gentleOnly ? (
        <View
          className="mx-5 mb-3 flex-row items-start rounded-input p-3"
          style={{ backgroundColor: withAlpha(colors.amber, 0.12) }}
        >
          <Leaf color={colors.amber} size={15} />
          <Text
            className="ml-2 flex-1 font-sans text-[12px] leading-[18px]"
            style={{ color: colors.amber }}
          >
            Because of the pain you reported, today is stretching and mobility only — no loaded
            exercise. Stop if anything hurts more.
          </Text>
        </View>
      ) : null}

      {/* Progress bar across the whole workout */}
      <View className="mb-3 flex-row gap-1 px-5">
        {exercises.map((e, i) => (
          <View
            key={`${e.exerciseId}-${i}`}
            className="h-[3px] flex-1 rounded-pill"
            style={{ backgroundColor: i <= index ? colors.accent : colors.border }}
          />
        ))}
      </View>

      {phase === 'rest' ? (
        <RestTimer
          seconds={rest}
          nextSetNumber={setIndex + 2}
          nextSetReps={repPlan[setIndex + 1] ?? currentReps}
          onDone={() => {
            setSetIndex((i) => i + 1);
            setPhase('watch');
          }}
        />
      ) : phase === 'watch' ? (
        <View className="flex-1 px-5 pb-4">
          {/* Video takes the TOP HALF; the set tracker below it is what the
              patient works from once they know the movement. */}
          <View style={{ height: '46%' }}>
            {videoUri ? (
              <VideoStage
                key={`${exercise.exerciseId}-${index}`}
                uri={videoUri}
                onPlayToEnd={() => {
                  /* looping clip - the patient decides when they're done */
                }}
              />
            ) : (
              <View
                className="h-full w-full items-center justify-center rounded-card border border-border"
                style={{ backgroundColor: colors.surface }}
              >
                <VideoOff color={colors.microLabel} size={30} />
                <Text className="mt-2 font-sans text-[13px] text-secondary">
                  No video for this exercise yet
                </Text>
              </View>
            )}
          </View>

          <ScrollView className="mt-4 flex-1" showsVerticalScrollIndicator={false}>
            <Text className="font-display-bold text-2xl text-primary">{exercise.title}</Text>
            <Text className="mt-1 font-sans text-[13px]" style={{ color: colors.microLabel }}>
              {Math.max(1, Math.round(exercise.durationSeconds / 60))} min
              {exercise.isWarmup ? ' \u00b7 Warm-up' : exercise.isCooldown ? ' \u00b7 Cool-down' : ''}
            </Text>

            {/* THE SET TRACKER */}
            <View
              className="mt-4 rounded-card p-4"
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            >
              <View className="flex-row items-center justify-between">
                <Text
                  className="font-sans-semibold text-[11px]"
                  style={{ color: colors.microLabel, letterSpacing: 1.6 }}
                >
                  SET {setIndex + 1} OF {totalSets}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change reps and rest"
                  onPress={() => setPlanOpen(true)}
                  hitSlop={8}
                  className="flex-row items-center active:opacity-70"
                >
                  <Sliders color={colors.accent} size={13} />
                  <Text
                    className="ml-1.5 font-sans-semibold text-[12px]"
                    style={{ color: colors.accent }}
                  >
                    {scheme} \u00b7 {rest}s
                  </Text>
                </Pressable>
              </View>

              <Text className="mt-2 font-display-bold text-4xl text-primary">
                {currentReps} <Text className="font-sans text-lg text-secondary">reps</Text>
              </Text>

              {/* One pill per set - done, current, still to come. */}
              <View className="mt-4 flex-row gap-2">
                {repPlan.map((reps, i) => {
                  const doneSet = i < setIndex;
                  const current = i === setIndex;
                  return (
                    <View
                      key={i}
                      className="flex-1 items-center rounded-input py-2.5"
                      style={{
                        backgroundColor: doneSet
                          ? withAlpha(colors.accent, 0.14)
                          : current
                            ? withAlpha(colors.accent, 0.08)
                            : colors.inputFill,
                        borderWidth: 1,
                        borderColor: current ? colors.accent : 'transparent',
                      }}
                    >
                      {doneSet ? (
                        <Check color={colors.accent} size={15} strokeWidth={3} />
                      ) : (
                        <Text
                          className="font-sans-semibold text-[13px]"
                          style={{ color: current ? colors.accent : colors.microLabel }}
                        >
                          {reps}
                        </Text>
                      )}
                      <Text
                        className="mt-0.5 font-sans text-[10px]"
                        style={{ color: colors.microLabel }}
                      >
                        Set {i + 1}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {exercise.notes ? (
              <Text className="mt-4 font-sans text-sm leading-6 text-secondary">
                {exercise.notes}
              </Text>
            ) : null}
          </ScrollView>

          <View className="mt-auto pt-4">
            <Button
              label={isLastSet ? "Finish exercise" : `Done \u2014 rest ${rest}s`}
              loading={completeExercise.isPending}
              onPress={finishSet}
            />
          </View>
        </View>
      ) : (
        // ── Rating ─────────────────────────────────────────────────────────────
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mt-4 font-sans-semibold text-xs uppercase tracking-[2px] text-accent">
            {exercise.title}
          </Text>
          <Text className="mt-2 font-display-bold text-3xl leading-9 text-primary">
            How did that feel?
          </Text>
          <Text className="mt-3 font-sans text-base leading-6 text-secondary">
            Your answer tunes what we give you next.
          </Text>

          <View className="mt-7">
            <RatingScale
              value={ease}
              onChange={setEase}
              min={1}
              tone="high-is-good"
              lowLabel="Very hard"
              highLabel="Very easy"
            />
          </View>

          <Text className="mt-8 font-sans-semibold text-[15px] text-primary">
            Anything to flag?
          </Text>
          <View className="mt-3 flex-row gap-3">
            {(['tooHard', 'tooEasy'] as const).map((option) => {
              const selected = effort === option;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setEffort(selected ? null : option)}
                  className="flex-1 items-center rounded-input py-3.5 active:opacity-80"
                  style={{
                    backgroundColor: selected ? withAlpha(colors.accent, 0.12) : colors.inputFill,
                    borderWidth: 1,
                    borderColor: selected ? colors.accent : colors.border,
                  }}
                >
                  <Text
                    className="font-sans-semibold text-[13px]"
                    style={{ color: selected ? colors.accent : colors.textSecondary }}
                  >
                    {option === 'tooHard' ? 'Too hard' : 'Too easy'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="mt-2 font-sans text-[11px]" style={{ color: colors.microLabel }}>
            We&apos;ll suggest a gentler or stronger version next time.
          </Text>

          <View className="mt-8 gap-3">
            <Button
              label={index + 1 >= total ? 'Finish session' : 'Next exercise'}
              disabled={ease === null}
              loading={completeExercise.isPending}
              onPress={submitRating}
            />
            <Button label="Back to the video" variant="ghost" onPress={() => setPhase('watch')} />
          </View>
        </ScrollView>
      )}

      <SetPlanSheet
        visible={planOpen}
        exerciseTitle={exercise.title}
        scheme={scheme}
        rest={rest}
        onChangeScheme={setScheme}
        onChangeRest={setRest}
        onClose={() => setPlanOpen(false)}
        confirmLabel="Done"
      />
    </SafeAreaView>
  );
}
