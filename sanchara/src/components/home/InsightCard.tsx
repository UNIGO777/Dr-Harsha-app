/**
 * InsightCard — warm headline paired with a real number, plus a hand-built
 * sparkline (an SVG polyline over normalised samples, so no chart dependency).
 *
 * A falling pain score is GOOD news, so the delta is rendered in mint regardless
 * of sign — red is reserved for genuine errors in this app.
 */
import Svg, { Polyline } from 'react-native-svg';
import { Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

interface InsightCardProps {
  headline: string;
  delta: number;
  period: string;
  /** Normalised 0–1 samples, oldest → newest. */
  series: number[];
}

const W = 110;
const H = 44;

export function InsightCard({ headline, delta, period, series }: InsightCardProps) {
  const points = series
    .map((value, i) => {
      const x = (i / Math.max(1, series.length - 1)) * W;
      const y = H - value * (H - 6) - 3; // 3px padding top & bottom
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <View className="flex-row items-center rounded-card border border-border bg-surface p-5">
      <View className="flex-1 pr-4">
        <Text className="font-sans-medium text-[15px] text-primary">{headline}</Text>
        <View className="mt-1.5 flex-row items-baseline gap-2">
          <Text className="font-display-bold text-2xl" style={{ color: colors.accent }}>
            {delta > 0 ? '+' : ''}
            {delta}%
          </Text>
          <Text className="font-sans text-xs" style={{ color: colors.microLabel }}>
            {period}
          </Text>
        </View>
      </View>

      <Svg width={W} height={H} accessibilityLabel={`Trend chart, ${delta} percent ${period}`}>
        <Polyline
          points={points}
          fill="none"
          stroke={colors.accent}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
