/**
 * The session player.
 *
 * Driven entirely by GET /sessions/active, so resuming after an app kill is the
 * same code path as starting fresh — the server's `currentExerciseIndex` is the
 * single source of truth for "where am I", never local state.
 *
 * Five screens, one loop per movement:
 *
 *   READY      pick reps (5 / 10 / 20) → Start
 *   ACTIVE     video + tap-to-count → Done
 *   COMPLETE   the honest number, ease rating on the first movement only
 *   RECOVERY   30s, then the next movement
 *   FINISHED   duration → back to My Day
 *
 * The write to the server happens once per movement, on Continue from COMPLETE.
 * Everything before that is local, so a mis-tap is recoverable ("Keep going")
 * without having to un-write a clinical record.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import { Check, Leaf } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseStage } from '@/components/session/ExerciseStage';
import { MovementComplete } from '@/components/session/MovementComplete';
import { RecoveryTimer } from '@/components/session/RecoveryTimer';
import { RepChooser } from '@/components/session/RepChooser';
import { Button, ErrorState } from '@/components/ui';
import {
  useAbandonSession,
  useActiveSession,
  useAdvanceState,
  useCompleteExercise,
  useCompleteSession,
} from '@/features/sessions/api';
import { DEFAULT_REPS, REST_SECONDS, type RepOption } from '@/lib/enums';
import { resolveMediaUrl, resolveThumbnail } from '@/lib/media';
import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

type Phase = 'ready' | 'active' | 'complete' | 'recovery' | 'finished';

export default function SessionPlayerScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const { data: active, isPending, isError, error, refetch } = useActiveSession();
  const advanceState = useAdvanceState();
  const completeExercise = useCompleteExercise();
  const completeSession = useCompleteSession();
  const abandon = useAbandonSession();

  const session = active?.session;
  const exercises = active?.exercises ?? [];
  const index = session?.currentExerciseIndex ?? 0;
  const total = exercises.length;
  const exercise = exercises[index];
  const done = total > 0 && index >= total;

  const [phase, setPhase] = useState<Phase>('ready');
  const [paused, setPaused] = useState(false);

  /**
   * The rep choice CARRIES across the session — someone who picks 5 on the first
   * movement should not be asked to re-pick on every one after it — but READY
   * still shows it, so dropping from 10 to 5 on the movement that hurts is one
   * tap rather than a settings trip.
   */
  const [reps, setReps] = useState<RepOption>(DEFAULT_REPS);
  const [count, setCount] = useState(0);

  /**
   * Ease is asked ONCE per session and reused. `easeScore` is mandatory per
   * exercise server-side (it feeds the progression engine), so the first answer
   * is carried forward rather than the patient being stopped after every
   * movement — which turned a ten-minute workout into a questionnaire.
   */
  const sessionEase = useRef<number | null>(null);
  const sessionEffort = useRef<'tooHard' | 'tooEasy' | null>(null);
  const [ease, setEase] = useState<number | null>(null);
  const [effort, setEffort] = useState<'tooHard' | 'tooEasy' | null>(null);

  const startedAt = useRef(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  /**
   * Recording a movement advances `currentExerciseIndex` through the query
   * cache, which re-renders this screen. The phase transition therefore has to
   * live HERE rather than after the `await` in `recordAndAdvance` — the two
   * would otherwise race, and whichever lost would strand the patient on the
   * wrong screen (usually skipping recovery entirely).
   */
  const goToRecovery = useRef(false);
  useEffect(() => {
    setCount(0);
    setPaused(false);
    setPhase(goToRecovery.current ? 'recovery' : 'ready');
    goToRecovery.current = false;
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

  useEffect(() => {
    if (session?.startedAt) startedAt.current = new Date(session.startedAt).getTime();
  }, [session?.startedAt]);

  // All movements recorded → the closing screen.
  useEffect(() => {
    if (!done) return;
    setElapsedSeconds(Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)));
    setPhase('finished');
  }, [done]);

  /** Write the movement just finished, then move the pointer on. */
  async function recordAndAdvance() {
    if (!session || !exercise) return;

    const score = sessionEase.current ?? ease;
    if (score === null) return; // COMPLETE keeps Continue disabled until answered
    sessionEase.current = score;
    if (sessionEffort.current === null) sessionEffort.current = effort;

    const isLast = index + 1 >= total;
    goToRecovery.current = !isLast;

    try {
      await completeExercise.mutateAsync({
        sessionId: session.sessionId,
        exerciseId: exercise.exerciseId,
        setsCompleted: count > 0 ? 1 : 0,
        easeScore: score,
        tooHard: sessionEffort.current === 'tooHard',
        tooEasy: sessionEffort.current === 'tooEasy',
        // The clinical record: what was asked for, and what was actually done.
        targetReps: reps,
        completedReps: count,
        restSeconds: isLast ? 0 : REST_SECONDS,
      });
    } catch {
      goToRecovery.current = false; // the pointer never moved — stay put
      Alert.alert('Could not save', 'That movement was not recorded. Please try again.');
    }
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
        <ErrorState error={error} onRetry={() => void refetch()} title="We couldn't load your session" />
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

  // ── SESSION COMPLETE ───────────────────────────────────────────────────────
  if (phase === 'finished' || done) {
    const minutes = Math.max(1, Math.round(elapsedSeconds / 60));
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
            {total} movement{total === 1 ? '' : 's'} in {minutes} minute{minutes === 1 ? '' : 's'}
            {session.levelNumber ? `, level ${session.levelNumber}` : ''}
            {session.dayNumber ? ` day ${session.dayNumber}` : ''}. That&apos;s another day of
            progress banked.
          </Text>
        </View>

        <View className="pb-4">
          <Button label="Back to My Day" loading={completeSession.isPending} onPress={finishSession} />
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
    <SafeAreaView className="flex-1 bg-base" edges={['top', 'bottom']}>
      {/* Header. "Finish early" rather than a back chevron: leaving is a
          legitimate choice, not an escape, and naming it plainly beats an
          ambiguous arrow that patients read as "undo". */}
      <View className="flex-row items-center justify-between px-5 py-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Finish this session early"
          onPress={confirmQuit}
          hitSlop={12}
          className="active:opacity-70"
        >
          <Text className="font-sans-semibold text-[14px]" style={{ color: colors.accent }}>
            Finish early
          </Text>
        </Pressable>

        <Text
          className="font-sans-semibold text-[11px]"
          style={{ color: colors.microLabel, letterSpacing: 1.4 }}
        >
          {index + 1} OF {total}
        </Text>
      </View>

      {/* Progress across the whole workout */}
      <View className="mb-2 flex-row gap-1 px-5">
        {exercises.map((e, i) => (
          <View
            key={`${e.exerciseId}-${i}`}
            className="h-[3px] flex-1 rounded-pill"
            style={{ backgroundColor: i <= index ? colors.accent : colors.border }}
          />
        ))}
      </View>

      {/* Moderate pain at check-in → loaded work was withheld. Say so on READY,
          or the shorter session reads as a bug. ACTIVE stays quiet. */}
      {session.gentleOnly && phase === 'ready' ? (
        <View
          className="mx-5 mb-1 mt-2 flex-row items-start rounded-input p-3"
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

      {phase === 'ready' ? (
        <RepChooser
          title={exercise.title}
          notes={exercise.notes}
          // Must go through resolveThumbnail: the server hands back a
          // SERVER-RELATIVE path, which expo-image renders as nothing at all.
          thumbnail={resolveThumbnail(exercise)}
          position={index + 1}
          total={total}
          reps={reps}
          onChangeReps={setReps}
          onStart={() => {
            setCount(0);
            setPaused(false);
            setPhase('active');
          }}
        />
      ) : phase === 'active' ? (
        <ExerciseStage
          key={exercise.exerciseId}
          title={exercise.title}
          videoUri={videoUri ?? null}
          count={count}
          target={reps}
          paused={paused}
          onTogglePause={() => setPaused((p) => !p)}
          onCountRep={() => setCount((c) => Math.min(reps, c + 1))}
          onDone={() => setPhase('complete')}
          onSkip={() => {
            setCount(0);
            setPhase('complete');
          }}
        />
      ) : phase === 'complete' ? (
        <MovementComplete
          title={exercise.title}
          count={count}
          target={reps}
          items={exercises.map((e) => ({ id: e.exerciseId, title: e.title }))}
          index={index}
          isLast={index + 1 >= total}
          askEase={sessionEase.current === null}
          ease={ease}
          onChangeEase={setEase}
          effort={effort}
          onChangeEffort={setEffort}
          saving={completeExercise.isPending}
          onContinue={recordAndAdvance}
          onKeepGoing={() => setPhase('active')}
        />
      ) : (
        <RecoveryTimer
          seconds={REST_SECONDS}
          // The pointer has already advanced by the time recovery runs, so the
          // movement at `index` is the one coming up.
          nextTitle={exercise.title}
          nextThumbnail={resolveThumbnail(exercise)}
          onDone={() => setPhase('ready')}
        />
      )}
    </SafeAreaView>
  );
}
