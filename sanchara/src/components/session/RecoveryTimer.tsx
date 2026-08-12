/**
 * RecoveryTimer — the 30 seconds between exercises.
 *
 * The ring is the countdown made visible: it drains as the time goes, so the
 * patient can read "nearly done" from across the room without focusing on the
 * digits. It breathes at the same time — a slow 4-in / 6-out cycle, the longer
 * exhale being the part that actually settles the nervous system.
 *
 * Everything is drawn locally. No audio files, no web view, nothing linking out
 * to a music or meditation service — so it works in aeroplane mode and there is
 * nothing to licence.
 *
 * "RECOVERY" rather than "REST": rest sounds like time being taken from you,
 * recovery sounds like part of the treatment. It is the latter.
 */
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { ChevronRight, Pause, Play } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useThemeColors } from '@/theme/useTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING = 240;
const STROKE = 10;
const R = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

const INHALE_MS = 4000;
const EXHALE_MS = 6000;

interface RecoveryTimerProps {
  seconds: number;
  /** What's coming — so she can prepare her body before it starts. */
  nextTitle?: string;
  nextThumbnail?: string;
  onDone: () => void;
}

export function RecoveryTimer({
  seconds,
  nextTitle,
  nextThumbnail,
  onDone,
}: RecoveryTimerProps) {
  const colors = useThemeColors();
  const reduceMotion = useReducedMotion();

  const [remaining, setRemaining] = useState(seconds);
  const [paused, setPaused] = useState(false);
  const finished = useRef(false);

  const drain = useSharedValue(1);
  const breath = useSharedValue(0.92);

  // `onDone` advances the session, so it must not be a dependency that can
  // restart the interval — a parent re-render would otherwise reset the second
  // it is standing on and the 30s would never actually elapse.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Ring drains over the full duration, independent of the per-second tick so
  // it moves smoothly rather than in visible steps. Pausing has to CANCEL it —
  // a running withTiming keeps draining regardless of the clock.
  useEffect(() => {
    if (paused) {
      cancelAnimation(drain);
      return;
    }
    drain.value = withTiming(0, { duration: remaining * 1000, easing: Easing.linear });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  useEffect(() => {
    if (reduceMotion) return;
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: INHALE_MS, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.92, { duration: EXHALE_MS, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [reduceMotion, breath]);

  // Fires onDone exactly once — a re-render must not double-advance the session.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          if (!finished.current) {
            finished.current = true;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            onDoneRef.current();
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [paused]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: CIRC * (1 - drain.value) }));
  const breathStyle = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }] }));

  function skip() {
    if (finished.current) return;
    finished.current = true;
    Haptics.selectionAsync().catch(() => {});
    onDoneRef.current();
  }

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  return (
    <View className="flex-1 px-6">
      <View className="flex-1 items-center justify-center">
        <Text
          className="font-sans-bold text-[15px]"
          style={{ color: colors.accent, letterSpacing: 3 }}
        >
          RECOVERY
        </Text>

        <Animated.View className="mt-10" style={breathStyle}>
          <View style={{ width: RING, height: RING }} className="items-center justify-center">
            <Svg width={RING} height={RING} style={{ position: 'absolute' }}>
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={R}
                stroke={colors.border}
                strokeWidth={STROKE}
                fill="none"
              />
              <AnimatedCircle
                cx={RING / 2}
                cy={RING / 2}
                r={R}
                stroke={colors.accent}
                strokeWidth={STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={CIRC}
                animatedProps={ringProps}
                transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
              />
            </Svg>

            <Text className="font-display-bold text-primary" style={{ fontSize: 56 }}>
              {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
            </Text>
          </View>
        </Animated.View>

        <Text className="mt-8 font-sans text-[13px]" style={{ color: colors.microLabel }}>
          {reduceMotion ? 'Breathe slowly' : 'Breathe in… and slowly out'}
        </Text>
      </View>

      {/* What's next */}
      {nextTitle ? (
        <View
          className="flex-row items-center rounded-card p-3"
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
        >
          {nextThumbnail ? (
            <Image
              source={nextThumbnail}
              style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: colors.inputFill }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View
              className="h-14 w-14 rounded-xl"
              style={{ backgroundColor: colors.inputFill }}
            />
          )}
          <View className="ml-3 flex-1">
            <Text
              className="font-sans-semibold text-[11px]"
              style={{ color: colors.microLabel, letterSpacing: 1.4 }}
            >
              UP NEXT
            </Text>
            <Text numberOfLines={1} className="mt-0.5 font-display-bold text-[19px] text-primary">
              {nextTitle}
            </Text>
          </View>
          <ChevronRight color={colors.microLabel} size={20} />
        </View>
      ) : null}

      {/* Controls sit in the thumb zone — she is still on the mat. */}
      <View className="mb-2 mt-4 flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={paused ? 'Resume recovery' : 'Pause recovery'}
          onPress={() => setPaused((p) => !p)}
          className="h-[58px] w-[58px] items-center justify-center rounded-pill active:opacity-80"
          style={{ backgroundColor: colors.inputFill }}
        >
          {paused ? (
            <Play color={colors.textPrimary} size={20} fill={colors.textPrimary} />
          ) : (
            <Pause color={colors.textPrimary} size={20} fill={colors.textPrimary} />
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip recovery and start the next exercise"
          onPress={skip}
          className="h-[58px] flex-1 items-center justify-center rounded-pill active:opacity-90"
          style={{ backgroundColor: colors.accent }}
        >
          <Text className="font-sans-semibold text-base" style={{ color: colors.accentText }}>
            Skip
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
