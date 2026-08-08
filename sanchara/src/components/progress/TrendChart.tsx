/**
 * TrendChart — one measure over time as a filled sparkline, with the first →
 * latest change called out.
 *
 * The direction that counts as GOOD differs per measure: falling pain is
 * progress, rising ease is progress. `goodDirection` decides which way earns
 * the mint treatment, so a patient never sees their improving pain score
 * rendered in alarm colours.
 *
 * Deliberately axis-free: the shape and the two numbers are the message. A
 * gridded chart invites reading precision that a 0–10 self-report doesn't have.
 */
import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

interface TrendChartProps {
  title: string;
  /** Oldest → newest. Fewer than 2 points renders the "not enough yet" state. */
  values: number[];
  min: number;
  max: number;
  goodDirection: 'up' | 'down';
  /** Appended to the from/to numbers, e.g. "/10". */
  unit?: string;
}

const W = 300;
const H = 64;
const PAD = 6;

export function TrendChart({ title, values, min, max, goodDirection, unit = '' }: TrendChartProps) {
  const colors = useThemeColors();

  if (values.length < 2) {
    return (
      <View className="rounded-card border border-border bg-surface p-4">
        <Text className="font-sans-semibold text-[15px] text-primary">{title}</Text>
        <Text className="mt-1 font-sans text-[13px]" style={{ color: colors.microLabel }}>
          {values.length === 0
            ? 'No readings yet — this fills in as you log sessions.'
            : 'One reading so far. A trend needs at least two.'}
        </Text>
      </View>
    );
  }

  const first = values[0]!;
  const last = values[values.length - 1]!;
  const delta = last - first;
  const improving = goodDirection === 'down' ? delta < 0 : delta > 0;
  const flat = delta === 0;
  const tone = flat ? colors.microLabel : improving ? colors.accent : colors.amber;

  // Normalise into the drawing box. A flat series sits on the mid-line rather
  // than collapsing onto an edge.
  const span = Math.max(1e-6, max - min);
  const x = (i: number) => PAD + (i / (values.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);

  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(values.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;

  return (
    <View className="rounded-card border border-border bg-surface p-4">
      <View className="flex-row items-start justify-between">
        <Text className="flex-1 font-sans-semibold text-[15px] text-primary" numberOfLines={1}>
          {title}
        </Text>
        <Text className="ml-3 font-sans-semibold text-[13px]" style={{ color: tone }}>
          {first}
          {unit} → {last}
          {unit}
        </Text>
      </View>

      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ marginTop: 10 }}>
        <Path d={area} fill={withAlpha(tone, 0.12)} />
        <Path d={line} stroke={tone} strokeWidth={2} fill="none" strokeLinejoin="round" />
        <Circle cx={x(values.length - 1)} cy={y(last)} r={3.5} fill={tone} />
      </Svg>

      <Text className="mt-1 font-sans text-[11px]" style={{ color: colors.microLabel }}>
        {values.length} readings ·{' '}
        {flat ? 'holding steady' : improving ? 'moving the right way' : 'worth mentioning to your clinician'}
      </Text>
    </View>
  );
}
