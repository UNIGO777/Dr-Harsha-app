/**
 * RestTimer — the gap between sets.
 *
 * The circle breathes on a 4-in / 6-out cycle rather than just counting down.
 * A longer exhale than inhale is the part that actually settles the nervous
 * system, and giving the patient something to follow stops the rest turning
 * into "stare at a number and start early".
 *
 * Everything here is drawn locally: no audio files, no web view, no link out to
 * a music or meditation service. That was a hard requirement, and it also means
 * rest works with no signal and nothing to licence.
 */
import * as Haptics from 'expo-haptics';
import { Pause, Play, SkipForward } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';

import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

const INHALE_MS = 4000;
const EXHALE_MS = 6000;

interface RestTimerProps {
  /** Seconds to rest. */
  seconds: number;
  /** Which set the patient is about to do, for the "up next" line. */
  nextSetNumber: number;
  nextSetReps: number;
  onDone: () => void;
}

export function RestTimer({ seconds, nextSetNumber, nextSetReps, onDone }: RestTimerProps) {
  const colors = useThemeColors();
  const reduceMotion = useReducedMotion();

  const [remaining, setRemaining] = useState(seconds);
  const [paused, setPaused] = useState(false);
  const scale = useSharedValue(0.72);
  const done = useRef(false);

  // Breathing loop. Reduced-motion users get a still circle rather than a
  // pulsing one they did not ask for.
  useEffect(() => {
    if (reduceMotion) {
      scale.value = 0.9;
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: INHALE_MS, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.72, { duration: EXHALE_MS, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [reduceMotion, scale]);

  // Countdown. Fires onDone exactly once — a re-render must not double-advance
  // the set.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          if (!done.current) {
            done.current = true;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            onDone();
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [paused, onDone]);

  const circleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  function skip() {
    if (done.current) return;
    done.current = true;
    Haptics.selectionAsync().catch(() => {});
    onDone();
  }

  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text
        className="font-sans-semibold text-[11px]"
        style={{ color: colors.microLabel, letterSpacing: 1.6 }}
      >
        REST
      </Text>

      <View className="my-8 h-64 w-64 items-center justify-center">
        <Animated.View
          className="absolute h-64 w-64 rounded-pill"
          style={[{ backgroundColor: withAlpha(colors.accent, 0.12) }, circleStyle]}
        />
        <Animated.View
          className="absolute h-48 w-48 rounded-pill"
          style={[
            { borderWidth: 2, borderColor: withAlpha(colors.accent, 0.45) },
            circleStyle,
          ]}
        />
        <View className="items-center">
          <Text className="font-display-bold text-5xl text-primary">
            {mm}:{String(ss).padStart(2, '0')}
          </Text>
          <Text className="mt-1 font-sans text-[13px]" style={{ color: colors.microLabel }}>
            {reduceMotion ? 'Breathe slowly' : 'Breathe in… and out'}
          </Text>
        </View>
      </View>

      <Text className="text-center font-sans text-[15px] leading-6 text-secondary">
        Up next — set {nextSetNumber}, {nextSetReps} reps
      </Text>

      <View className="mt-8 w-full flex-row gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={paused ? 'Resume rest' : 'Pause rest'}
          onPress={() => setPaused((p) => !p)}
          className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-pill active:opacity-80"
          style={{ backgroundColor: colors.inputFill, borderWidth: 1, borderColor: colors.border }}
        >
          {paused ? (
            <Play color={colors.textPrimary} size={17} fill={colors.textPrimary} />
          ) : (
            <Pause color={colors.textPrimary} size={17} fill={colors.textPrimary} />
          )}
          <Text className="font-sans-semibold text-[14px] text-primary">
            {paused ? 'Resume' : 'Pause'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip rest"
          onPress={skip}
          className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-pill active:opacity-90"
          style={{ backgroundColor: colors.accent }}
        >
          <SkipForward color={colors.accentText} size={17} />
          <Text className="font-sans-semibold text-[14px]" style={{ color: colors.accentText }}>
            Skip rest
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
