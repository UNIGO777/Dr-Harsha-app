/**
 * WeekCard — this week at a glance. Today is a filled mint disc with a glow;
 * completed days get a tick; upcoming days are outlined date circles.
 *
 * Missed days are rendered NEUTRAL (never red) — these users are recovering from
 * pain and the screen should never scold them for a hard day.
 */
import { Check } from 'lucide-react-native';
import { Text, View } from 'react-native';

import type { DayStatus } from '@/features/home/useHomeData';
import { colors } from '@/theme/tokens';

interface WeekCardProps {
  days: { label: string; date: number; status: DayStatus }[];
  currentMinutes: number;
  targetMinutes: number;
}

export function WeekCard({ days, currentMinutes, targetMinutes }: WeekCardProps) {
  return (
    <View className="rounded-card border border-border bg-surface p-5">
      <View className="flex-row items-center justify-between">
        <Text
          className="font-sans-semibold text-[11px]"
          style={{ color: colors.microLabel, letterSpacing: 1.6 }}
        >
          YOUR WEEK
        </Text>
        <Text className="font-sans-medium text-[11px]" style={{ color: colors.textSecondary }}>
          {currentMinutes} / {targetMinutes} MIN
        </Text>
      </View>

      <View className="mt-4 flex-row items-start justify-between">
        {days.map((day) => {
          const isToday = day.status === 'today';
          const isDone = day.status === 'done';

          return (
            <View
              key={day.label}
              className="items-center gap-2"
              accessibilityLabel={`${day.label} ${day.date}, ${
                isToday ? 'today' : isDone ? 'completed' : 'upcoming'
              }`}
            >
              <Text
                className="font-sans-semibold text-[10px]"
                style={{
                  color: isToday ? colors.accent : colors.microLabel,
                  letterSpacing: 1,
                }}
              >
                {day.label}
              </Text>

              <View
                className="h-11 w-11 items-center justify-center rounded-pill"
                style={
                  isToday
                    ? {
                        backgroundColor: colors.accent,
                        shadowColor: colors.accent,
                        shadowOpacity: 0.5,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 0 },
                        elevation: 5,
                      }
                    : {
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: isDone ? 'rgba(79,224,172,0.08)' : 'transparent',
                      }
                }
              >
                {isDone ? (
                  <Check size={16} color={colors.accent} strokeWidth={2.5} />
                ) : (
                  <Text
                    className="font-sans-semibold text-sm"
                    style={{ color: isToday ? colors.accentText : colors.textSecondary }}
                  >
                    {day.date}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
