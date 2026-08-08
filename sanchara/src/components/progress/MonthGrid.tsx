/**
 * MonthGrid — a month of sessions as a dot per day.
 *
 * The calendar endpoint only returns days that HAVE sessions, so the grid is
 * built locally and looked up; a day with no entry is simply untouched rather
 * than missing.
 *
 * Future days are dimmed instead of shown as "missed" — the app should never
 * imply a patient failed to do something that isn't due yet.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { CalendarDay } from '@/features/sessions/api';
import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

interface MonthGridProps {
  /** YYYY-MM */
  month: string;
  days: CalendarDay[];
  onPrev: () => void;
  onNext: () => void;
  /** Blocks paging past the current month. */
  canGoNext: boolean;
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function MonthGrid({ month, days, onPrev, onNext, canGoNext }: MonthGridProps) {
  const colors = useThemeColors();

  const [year, monthNo] = month.split('-').map(Number);
  const first = new Date(year ?? 1970, (monthNo ?? 1) - 1, 1);
  const daysInMonth = new Date(year ?? 1970, monthNo ?? 1, 0).getDate();

  // JS weeks start Sunday; this grid starts Monday.
  const leading = (first.getDay() + 6) % 7;

  const byDate = new Map(days.map((d) => [d.date, d]));
  const todayKey = new Date().toLocaleDateString('en-CA');

  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View className="rounded-card border border-border bg-surface p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Pressable
          onPress={onPrev}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          className="h-8 w-8 items-center justify-center active:opacity-70"
        >
          <ChevronLeft color={colors.accent} size={20} />
        </Pressable>
        <Text className="font-sans-semibold text-[15px] text-primary">{monthLabel(month)}</Text>
        <Pressable
          onPress={canGoNext ? onNext : undefined}
          disabled={!canGoNext}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          className="h-8 w-8 items-center justify-center active:opacity-70"
          style={{ opacity: canGoNext ? 1 : 0.25 }}
        >
          <ChevronRight color={colors.accent} size={20} />
        </Pressable>
      </View>

      <View className="flex-row">
        {WEEKDAYS.map((d, i) => (
          <Text
            key={`${d}-${i}`}
            className="flex-1 text-center font-sans text-[10px]"
            style={{ color: colors.microLabel }}
          >
            {d}
          </Text>
        ))}
      </View>

      <View className="mt-1.5 flex-row flex-wrap">
        {cells.map((day, i) => {
          if (day === null) return <View key={`pad-${i}`} className="h-9 w-[14.28%]" />;

          const key = `${month}-${String(day).padStart(2, '0')}`;
          const entry = byDate.get(key);
          const isToday = key === todayKey;
          const isFuture = key > todayKey;

          const fill =
            entry?.status === 'green'
              ? colors.accent
              : entry?.status === 'amber'
                ? colors.amber
                : entry
                  ? colors.microLabel
                  : 'transparent';

          return (
            <View key={key} className="h-9 w-[14.28%] items-center justify-center">
              <View
                className="h-7 w-7 items-center justify-center rounded-pill"
                style={{
                  backgroundColor: entry ? fill : 'transparent',
                  borderWidth: isToday ? 1.5 : 0,
                  borderColor: colors.accent,
                  opacity: isFuture ? 0.3 : 1,
                }}
              >
                <Text
                  className="font-sans text-[11px]"
                  style={{
                    color: entry ? colors.accentText : isToday ? colors.accent : colors.microLabel,
                  }}
                >
                  {day}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <View className="mt-3 flex-row items-center gap-4">
        {[
          { tone: colors.accent, label: 'Completed' },
          { tone: colors.amber, label: 'Partial' },
        ].map((l) => (
          <View key={l.label} className="flex-row items-center">
            <View
              className="h-2.5 w-2.5 rounded-pill"
              style={{ backgroundColor: l.tone }}
            />
            <Text className="ml-1.5 font-sans text-[11px]" style={{ color: colors.microLabel }}>
              {l.label}
            </Text>
          </View>
        ))}
        <View className="flex-row items-center">
          <View
            className="h-2.5 w-2.5 rounded-pill"
            style={{ borderWidth: 1.5, borderColor: colors.accent, backgroundColor: withAlpha(colors.accent, 0.1) }}
          />
          <Text className="ml-1.5 font-sans text-[11px]" style={{ color: colors.microLabel }}>
            Today
          </Text>
        </View>
      </View>
    </View>
  );
}
