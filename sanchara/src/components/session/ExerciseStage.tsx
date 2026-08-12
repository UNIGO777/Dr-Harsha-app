/**
 * ACTIVE — the movement in progress. The calmest screen in the app.
 *
 * Layout follows one rule: the video is the top ~55% and never cropped, and
 * EVERY control lives in the bottom third. The patient is on all fours on a mat
 * with the phone propped a metre away; the top corners of the screen are the
 * hardest place on the device for her to reach, so nothing she needs mid-
 * movement goes there.
 *
 * ── Who counts the reps? ─────────────────────────────────────────────────────
 * She does, by tapping the counter. The other two options both fail her:
 *
 *  - A timer counts a rhythm she isn't necessarily keeping. If she is slower
 *    than the timer — and someone rehabilitating a lower back usually is — the
 *    number runs ahead of her body and the record becomes a lie.
 *  - Not counting at all means the clinician only ever learns "did it / didn't",
 *    which is the one thing progression decisions can't be made from.
 *
 * So the count is hers. The tap target is the whole counter block — roughly a
 * third of the screen, well clear of the video — not a small button, because
 * she is tapping with a palm she has just lifted off a mat.
 *
 * ── Recording 6 of 10 ────────────────────────────────────────────────────────
 * "Done" is live from the first rep, not gated on reaching the target. Stopping
 * at 6 takes exactly the same single tap as finishing at 10, is never blocked
 * by a confirmation dialog, and the next screen states the honest number
 * plainly with no red, no "incomplete", no percentage. The clinician gets the
 * real figure; the patient gets no reason to inflate it.
 */
import * as Haptics from 'expo-haptics';
import { Pause, Play, SkipForward, VideoOff } from 'lucide-react-native';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { VideoStage } from '@/components/session/VideoStage';
import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

interface ExerciseStageProps {
  title: string;
  videoUri: string | null;
  /** Reps done so far, and the target chosen on the READY screen. */
  count: number;
  target: number;
  paused: boolean;
  onTogglePause: () => void;
  onCountRep: () => void;
  /** Record what's been done and move on — live from the first rep. */
  onDone: () => void;
  /** Move past this movement without recording reps. */
  onSkip: () => void;
}

export function ExerciseStage({
  title,
  videoUri,
  count,
  target,
  paused,
  onTogglePause,
  onCountRep,
  onDone,
  onSkip,
}: ExerciseStageProps) {
  const colors = useThemeColors();
  const { height } = useWindowDimensions();

  // Half the screen, floored so the frame stays usable on a short device.
  const videoHeight = Math.max(260, Math.round(height * 0.52));

  const bump = useSharedValue(1);
  const bumpStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));

  const reached = count >= target;

  function countRep() {
    if (reached) return; // the target is a ceiling; extra taps are misses, not reps
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    bump.value = withSequence(
      withTiming(1.12, { duration: 90 }),
      withTiming(1, { duration: 140 }),
    );
    onCountRep();
  }

  return (
    <View className="flex-1">
      {/* ── Video: edge to edge, uncropped ──────────────────────────────────── */}
      <View style={{ height: videoHeight, backgroundColor: '#000' }}>
        {videoUri ? (
          <VideoStage uri={videoUri} paused={paused} />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <VideoOff color="#6B6B72" size={30} />
            <Text className="mt-2 font-sans text-[13px]" style={{ color: '#9A9AA0' }}>
              No video for this movement yet
            </Text>
          </View>
        )}

        {paused ? (
          <View
            className="absolute inset-0 items-center justify-center"
            style={{ backgroundColor: 'rgba(11,11,12,0.55)' }}
            pointerEvents="none"
          >
            <Text
              className="font-sans-semibold text-[13px]"
              style={{ color: '#FFFFFF', letterSpacing: 2 }}
            >
              PAUSED
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Counter: the whole block is the tap target ──────────────────────── */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          reached
            ? `${count} of ${target} reps done. Target reached.`
            : `${count} of ${target} reps. Tap to count a rep.`
        }
        onPress={countRep}
        className="flex-1 items-center justify-center px-6"
      >
        <Text numberOfLines={1} className="font-display-bold text-[19px] text-primary">
          {title}
        </Text>

        <Animated.View className="mt-2 flex-row items-baseline" style={bumpStyle}>
          <Text
            className="font-display-bold"
            style={{
              // Big enough to read at a metre, in glare, without glasses.
              fontSize: 78,
              lineHeight: 86,
              color: reached ? colors.accent : colors.textPrimary,
            }}
          >
            {count}
          </Text>
          <Text
            className="ml-1 font-display-bold"
            style={{ fontSize: 30, color: colors.microLabel }}
          >
            /{target}
          </Text>
        </Animated.View>

        <Text className="font-sans text-[13px]" style={{ color: colors.microLabel }}>
          {reached ? 'That’s all of them — well done' : 'Tap anywhere here after each rep'}
        </Text>
      </Pressable>

      {/* ── Controls: all in the thumb zone ─────────────────────────────────── */}
      <View className="flex-row items-center gap-3 px-5 pb-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={paused ? 'Resume video' : 'Pause video'}
          onPress={onTogglePause}
          className="h-[62px] w-[62px] items-center justify-center rounded-pill active:opacity-80"
          style={{ backgroundColor: colors.inputFill }}
        >
          {paused ? (
            <Play color={colors.textPrimary} size={21} fill={colors.textPrimary} />
          ) : (
            <Pause color={colors.textPrimary} size={21} fill={colors.textPrimary} />
          )}
        </Pressable>

        {/*
          Done is a plain tap at any count — a hold-to-confirm here would make
          stopping at 6 harder than finishing at 10, which is exactly backwards.
          Accidental taps are handled on the next screen instead, which offers
          "keep going" rather than asking "are you sure?" before the fact.
        */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Done — record ${count} of ${target} reps`}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            onDone();
          }}
          className="h-[62px] flex-1 items-center justify-center rounded-pill active:opacity-90"
          style={{
            backgroundColor: reached ? colors.accent : withAlpha(colors.accent, 0.16),
            borderWidth: reached ? 0 : 1,
            borderColor: colors.accent,
          }}
        >
          <Text
            className="font-sans-semibold text-[17px]"
            style={{ color: reached ? colors.accentText : colors.accent }}
          >
            Done
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip this movement"
          onPress={onSkip}
          className="h-[62px] w-[62px] items-center justify-center rounded-pill active:opacity-80"
          style={{ backgroundColor: colors.inputFill }}
        >
          <SkipForward color={colors.textPrimary} size={20} />
        </Pressable>
      </View>
    </View>
  );
}
