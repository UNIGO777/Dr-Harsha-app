/**
 * Progress — the evidence that the work is doing something.
 *
 * Order is deliberate: consistency first (did I show up?), then outcomes (is the
 * pain changing?), then the raw log. A patient in week three cares far more
 * about "my lower back went 7 → 4" than about how many minutes they logged, so
 * the pain trends sit above the session list.
 *
 * All live: /sessions/calendar, /sessions/trends, /sessions/history, /auth/me.
 */
import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthGrid } from '@/components/progress/MonthGrid';
import { TrendChart } from '@/components/progress/TrendChart';
import { ScreenHeader } from '@/components/ui';
import { useMe } from '@/features/auth/api';
import { useCalendar, useSessionHistory, useTrends } from '@/features/sessions/api';
import { useThemeColors } from '@/theme/useTheme';

/** YYYY-MM for a given offset from the current month. */
function monthKey(offset = 0): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Consecutive days with a session, counting back from today.
 *
 * Yesterday still counts as "alive" — a streak shouldn't be declared broken
 * before the patient has had today to do it.
 */
function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const days = new Set(dates);

  const cursor = new Date();
  const key = (d: Date) => d.toLocaleDateString('en-CA');

  if (!days.has(key(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(key(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(key(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function StatTile({ value, label }: { value: string; label: string }) {
  const colors = useThemeColors();
  return (
    <View
      className="flex-1 items-center rounded-card px-2 py-4"
      style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
    >
      <Text className="font-display-bold text-2xl text-primary">{value}</Text>
      <Text
        numberOfLines={1}
        className="mt-1 font-sans text-[11px]"
        style={{ color: colors.microLabel }}
      >
        {label}
      </Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  const colors = useThemeColors();
  return (
    <Text
      className="mb-3 mt-8 font-sans-semibold text-[11px]"
      style={{ color: colors.microLabel, letterSpacing: 1.6 }}
    >
      {children}
    </Text>
  );
}

const COMPLETION_LABEL: Record<string, string> = {
  COMPLETED: 'Completed',
  PARTIAL: 'Partial',
  SKIPPED: 'Skipped',
};

export default function ProgressScreen() {
  const colors = useThemeColors();
  const [offset, setOffset] = useState(0);
  const month = monthKey(offset);

  const me = useMe();
  const calendar = useCalendar(month);
  const trends = useTrends();
  // 100 is the server's page cap — enough to compute a real streak and to list
  // recent sessions from one request.
  const history = useSessionHistory(100);

  const sessions = useMemo(() => history.data?.data ?? [], [history.data]);

  const streak = useMemo(
    () =>
      computeStreak(
        sessions
          .filter((s) => s.completion === 'COMPLETED' || s.completion === 'PARTIAL')
          .map((s) => new Date(s.date ?? '').toLocaleDateString('en-CA')),
      ),
    [sessions],
  );

  // Busiest areas first — the ones a patient actually came in for.
  const painSeries = useMemo(() => {
    const byArea = trends.data?.painByArea ?? {};
    return Object.entries(byArea)
      .map(([area, points]) => ({ area, values: points.map((p) => p.score) }))
      .sort((a, b) => b.values.length - a.values.length);
  }, [trends.data]);

  const easeValues = useMemo(
    () => (trends.data?.easeTrajectory ?? []).map((p) => Math.round(p.avgEaseScore * 10) / 10),
    [trends.data],
  );

  const loading = me.isPending || trends.isPending || history.isPending;
  const refreshing = calendar.isFetching || trends.isFetching || history.isFetching;

  function refetchAll() {
    void me.refetch();
    void calendar.refetch();
    void trends.refetch();
    void history.refetch();
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        <ScreenHeader title="Progress" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const totalSessions = history.data?.pagination.total ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top']}>
      <ScreenHeader title="Progress" />

      <ScrollView
        className="px-6"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetchAll} tintColor={colors.accent} />
        }
      >
        {totalSessions === 0 ? (
          <View className="mt-8 rounded-card border border-border bg-surface p-6">
            <Text className="font-display-bold text-xl text-primary">Nothing to show yet</Text>
            <Text className="mt-2 font-sans text-[15px] leading-6 text-secondary">
              Finish your first session and this page starts filling in — how consistent you&apos;ve
              been, and how your pain is changing week to week.
            </Text>
          </View>
        ) : (
          <>
            <View className="mt-5 flex-row gap-3">
              <StatTile value={`${totalSessions}`} label="sessions" />
              <StatTile value={`${streak}`} label="day streak" />
              <StatTile
                value={`${me.data?.weeklyActivity.currentMinutes ?? 0}`}
                label="min this week"
              />
            </View>

            <SectionTitle>CONSISTENCY</SectionTitle>
            <MonthGrid
              month={month}
              days={calendar.data ?? []}
              onPrev={() => setOffset((o) => o - 1)}
              onNext={() => setOffset((o) => Math.min(0, o + 1))}
              canGoNext={offset < 0}
            />

            <SectionTitle>PAIN OVER TIME</SectionTitle>
            {painSeries.length === 0 ? (
              <View className="rounded-card border border-border bg-surface p-4">
                <Text className="font-sans text-[13px]" style={{ color: colors.microLabel }}>
                  Your pain check-ins will chart here.
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {painSeries.map((s) => (
                  <TrendChart
                    key={s.area}
                    title={s.area}
                    values={s.values}
                    min={0}
                    max={10}
                    goodDirection="down"
                    unit="/10"
                  />
                ))}
              </View>
            )}

            <SectionTitle>HOW SESSIONS FEEL</SectionTitle>
            <TrendChart
              title="Ease of movement"
              values={easeValues}
              min={1}
              max={10}
              goodDirection="up"
              unit="/10"
            />

            <SectionTitle>RECENT SESSIONS</SectionTitle>
            <View className="overflow-hidden rounded-card border border-border bg-surface">
              {sessions.slice(0, 15).map((s, i, arr) => (
                <View
                  key={s.id}
                  className="flex-row items-center px-4 py-3.5"
                  style={
                    i === arr.length - 1
                      ? undefined
                      : { borderBottomWidth: 1, borderBottomColor: colors.border }
                  }
                >
                  <View className="flex-1">
                    <Text className="font-sans-medium text-[14px] text-primary">
                      {s.levelNumber ? `Level ${s.levelNumber} · ` : ''}
                      {s.dayNumber ? `Day ${s.dayNumber}` : 'Session'}
                    </Text>
                    <Text className="mt-0.5 font-sans text-[11px]" style={{ color: colors.microLabel }}>
                      {Math.max(1, Math.round(s.durationSeconds / 60))} min
                      {typeof s.avgEaseScore === 'number' ? ` · ease ${s.avgEaseScore}/10` : ''}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="font-sans text-[11px]" style={{ color: colors.microLabel }}>
                      {new Date(s.date ?? '').toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                    <Text
                      className="mt-0.5 font-sans-semibold text-[11px]"
                      style={{
                        color: s.completion === 'COMPLETED' ? colors.accent : colors.amber,
                      }}
                    >
                      {s.completion ? COMPLETION_LABEL[s.completion] : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
