/**
 * JourneyRow — the level roadmap. One card per level in the program:
 *   completed → muted with a mint tick (a quiet trophy)
 *   current   → raised, mint border, per-day dots
 *   locked    → dashed and dimmed, with warm "unlocks after" copy (never punishing)
 *
 * This is where the Program → Level → Day model becomes legible at a glance.
 */
import { Check, Lock } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';

import type { HomeLevel } from '@/features/home/useHomeData';
import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

function DayDots({ level }: { level: HomeLevel }) {
  const colors = useThemeColors();
  if (level.status === 'locked') return null;

  const dots =
    level.days.length > 0
      ? level.days
      : Array.from({ length: level.dayCount }, (_, i) => ({
          day: i + 1,
          status: 'done' as const,
        }));

  return (
    <View className="mt-3 flex-row items-center gap-1.5">
      {dots.map((d) => {
        const isToday = d.status === 'today';
        const isDone = d.status === 'done';
        const isRest = d.status === 'rest';

        return (
          <View
            key={d.day}
            style={{
              width: isToday ? 9 : 7,
              height: isToday ? 9 : 7,
              borderRadius: 999,
              backgroundColor: isDone || isToday ? colors.accent : 'transparent',
              borderWidth: isDone || isToday ? 0 : 1,
              borderColor: isRest ? colors.amber : colors.border,
              opacity: isToday ? 1 : isDone ? 0.85 : 1,
            }}
          />
        );
      })}
    </View>
  );
}

export function JourneyRow({ levels }: { levels: HomeLevel[] }) {
  const colors = useThemeColors();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, paddingRight: 20 }}
    >
      {levels.map((level) => {
        const isCurrent = level.status === 'current';
        const isLocked = level.status === 'locked';

        return (
          <View
            key={level.levelNumber}
            accessibilityLabel={
              isLocked
                ? `Level ${level.levelNumber}, ${level.title}, locked`
                : `Level ${level.levelNumber}, ${level.title}, ${level.daysDone} of ${level.dayCount} days done`
            }
            className="w-[168px] rounded-card p-4"
            style={{
              backgroundColor: isCurrent ? colors.surface : withAlpha(colors.surface, 0.6),
              borderWidth: 1,
              borderStyle: isLocked ? 'dashed' : 'solid',
              borderColor: isCurrent ? colors.accent : colors.border,
              opacity: isLocked ? 0.55 : 1,
            }}
          >
            <View className="flex-row items-center justify-between">
              <Text
                className="font-sans-semibold text-[10px]"
                style={{
                  color: isCurrent ? colors.accent : colors.microLabel,
                  letterSpacing: 1.4,
                }}
              >
                LEVEL {String(level.levelNumber).padStart(2, '0')}
              </Text>
              {level.status === 'completed' ? (
                <View
                  className="h-5 w-5 items-center justify-center rounded-pill"
                  style={{ backgroundColor: withAlpha(colors.accent, 0.16) }}
                >
                  <Check size={12} color={colors.accent} strokeWidth={3} />
                </View>
              ) : null}
              {isLocked ? <Lock size={13} color={colors.microLabel} /> : null}
            </View>

            <Text
              className={`mt-3 ${isCurrent ? 'font-display-bold text-lg' : 'font-display text-base'}`}
              style={{ color: isCurrent ? colors.textPrimary : colors.textSecondary }}
            >
              {level.title}
            </Text>

            <DayDots level={level} />

            <Text className="mt-3 font-sans text-[11px]" style={{ color: colors.microLabel }}>
              {isLocked
                ? `Unlocks after Level ${level.levelNumber - 1}`
                : `${level.daysDone} of ${level.dayCount} days`}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
