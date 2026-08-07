/**
 * DayCompleteCard — what stands in for today's session once the patient has
 * already done a day.
 *
 * One program day per calendar day: the next day is deliberately withheld until
 * tomorrow, because recovery between sessions is part of the treatment, not a
 * delay in it. The tone is "you're done, well done" rather than "locked" — the
 * patient did the right thing, so this is a reward screen, not a barrier.
 */
import { Check } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

interface DayCompleteCardProps {
  /** Clinic-local YYYY-MM-DD the next day opens. */
  unlocksOn?: string;
  /** The day now waiting behind the lock. */
  nextDayNumber?: number;
}

/** "Tomorrow" when it is, otherwise e.g. "Thu, 7 Aug". */
function formatUnlock(unlocksOn?: string): string {
  if (!unlocksOn) return 'tomorrow';

  const [y, m, d] = unlocksOn.split('-').map(Number);
  if (!y || !m || !d) return 'tomorrow';
  const target = new Date(y, m - 1, d);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays <= 1) return 'tomorrow';

  return target.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function DayCompleteCard({ unlocksOn, nextDayNumber }: DayCompleteCardProps) {
  const colors = useThemeColors();
  const when = formatUnlock(unlocksOn);

  return (
    <View
      className="rounded-card p-6"
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: withAlpha(colors.accent, 0.35),
      }}
    >
      <View
        className="h-12 w-12 items-center justify-center rounded-pill"
        style={{ backgroundColor: withAlpha(colors.accent, 0.14) }}
      >
        <Check color={colors.accent} size={24} strokeWidth={3} />
      </View>

      <Text className="mt-4 font-display-bold text-2xl text-primary">
        Today&apos;s session is done
      </Text>
      <Text className="mt-2 font-sans text-[15px] leading-6 text-secondary">
        Nicely done. Rest is when your body actually rebuilds, so we&apos;ll stop here for today.
      </Text>

      <View
        className="mt-5 flex-row items-center justify-between rounded-input px-4 py-3.5"
        style={{ backgroundColor: colors.inputFill }}
      >
        <Text className="font-sans-semibold text-[13px] text-primary">
          {nextDayNumber ? `Day ${nextDayNumber}` : 'Your next session'}
        </Text>
        <Text
          className="font-sans-semibold text-[13px]"
          style={{ color: colors.accent }}
        >
          Opens {when}
        </Text>
      </View>
    </View>
  );
}
