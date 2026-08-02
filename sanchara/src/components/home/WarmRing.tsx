/**
 * WarmRing — the home screen's centrepiece.
 *
 * Two concentric arcs on a dark dial:
 *   • outer, AMBER  → overall progress through the whole program (the warmth)
 *   • inner, MINT   → progress through the CURRENT level (the hero metric)
 *
 * A soft amber radial bloom sits behind the centre so the dial reads as
 * "precision with a warm heart" rather than a cold instrument. Both arcs sweep
 * in on mount; the numerals sit on top in the display serif.
 */
import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { colors } from '@/theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 260;
const OUTER_STROKE = 10;
const INNER_STROKE = 14;
const GAP = 14; // distance between the two arcs

const R_OUTER = (SIZE - OUTER_STROKE) / 2;
const R_INNER = R_OUTER - GAP - INNER_STROKE / 2;
const C_OUTER = 2 * Math.PI * R_OUTER;
const C_INNER = 2 * Math.PI * R_INNER;

interface WarmRingProps {
  /** 0–1 — whole-program completion (amber, outer). */
  overall: number;
  /** 0–1 — current level completion, or plain day progress on flat programs (mint, inner). */
  level: number;
  /**
   * Micro label above the numeral — "LEVEL 2 · BUILD" for leveled programs, or
   * the program name for flat ones. The ring never assumes levels exist.
   */
  caption: string;
  /** Big centre numeral — the current day. */
  dayNumber: number;
  /** 0 hides the "OF xx" line (unknown plan length). */
  totalDays: number;
  accessibilityText?: string;
}

export function WarmRing({
  overall,
  level,
  caption,
  dayNumber,
  totalDays,
  accessibilityText,
}: WarmRingProps) {
  const reduceMotion = useReducedMotion();
  const outerProgress = useSharedValue(0);
  const innerProgress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      outerProgress.value = overall;
      innerProgress.value = level;
      return;
    }
    outerProgress.value = withDelay(
      160,
      withTiming(overall, { duration: 1000, easing: Easing.out(Easing.cubic) })
    );
    innerProgress.value = withDelay(
      280,
      withTiming(level, { duration: 1100, easing: Easing.out(Easing.cubic) })
    );
  }, [overall, level, reduceMotion, outerProgress, innerProgress]);

  const outerAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: C_OUTER * (1 - outerProgress.value),
  }));
  const innerAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: C_INNER * (1 - innerProgress.value),
  }));

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <View
      className="items-center justify-center"
      style={{ width: SIZE, height: SIZE }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={
        accessibilityText ??
        `Day ${dayNumber}. ${Math.round(overall * 100)} percent of the program complete.`
      }
    >
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
        <Defs>
          {/* Warm bloom behind the numerals — the "heart" of the dial. */}
          <RadialGradient id="warmCore" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.amber} stopOpacity={0.22} />
            <Stop offset="55%" stopColor={colors.amber} stopOpacity={0.07} />
            <Stop offset="100%" stopColor={colors.amber} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R_INNER - 6} fill="url(#warmCore)" />

        {/* Tracks */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R_OUTER}
          stroke={colors.border}
          strokeWidth={OUTER_STROKE}
          fill="none"
          opacity={0.55}
        />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R_INNER}
          stroke={colors.border}
          strokeWidth={INNER_STROKE}
          fill="none"
          opacity={0.75}
        />

        {/* Amber — overall program progress */}
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R_OUTER}
          stroke={colors.amber}
          strokeWidth={OUTER_STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={C_OUTER}
          animatedProps={outerAnimatedProps}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />

        {/* Mint — current level progress (the hero) */}
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R_INNER}
          stroke={colors.accent}
          strokeWidth={INNER_STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={C_INNER}
          animatedProps={innerAnimatedProps}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>

      {/* Centre stack */}
      <View className="items-center">
        <Text
          numberOfLines={1}
          className="max-w-[170px] text-center font-sans-semibold text-[11px]"
          style={{ color: colors.accent, letterSpacing: 1.6 }}
        >
          {caption}
        </Text>
        <Text
          className="font-display-bold text-primary"
          style={{ fontSize: 68, lineHeight: 78 }}
        >
          {pad(dayNumber)}
        </Text>
        {totalDays > 0 ? (
          <Text
            className="font-sans-medium text-[11px]"
            style={{ color: colors.amber, letterSpacing: 1.6, marginTop: -4 }}
          >
            OF {pad(totalDays)}
          </Text>
        ) : (
          <Text
            className="font-sans-medium text-[11px]"
            style={{ color: colors.amber, letterSpacing: 1.6, marginTop: -4 }}
          >
            DAY
          </Text>
        )}
      </View>
    </View>
  );
}
