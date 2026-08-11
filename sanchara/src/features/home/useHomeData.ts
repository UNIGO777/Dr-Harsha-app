/**
 * useHomeData — the home screen's single data source.
 *
 * Composes six server queries and adapts them into the exact shapes the home
 * components render, so the screen itself stays presentational:
 *
 *   GET /auth/me                 → greeting, weekly minutes, entitlement
 *   GET /enrollments/me          → level/day progress
 *   GET /enrollments/me/today    → today's workout (or rest day)
 *   GET /programs/:id            → the level roadmap (titles + day counts)
 *   GET /sessions/active         → resume state
 *   GET /sessions/calendar       → this week's strip
 *   GET /sessions/trends         → the pain trend insight
 *   GET /programs?type=SHORT     → "only got 5 minutes?"
 *
 * The level roadmap needs BOTH sources: the program supplies each level's title
 * and day count, the enrollment supplies which are done / current / locked.
 */
import { useMemo } from 'react';

import { useMe } from '@/features/auth/api';
import { useMyEnrollment, useToday } from '@/features/enrollments/api';
import { useProgram, useShortPrograms } from '@/features/programs/api';
import { useActiveSession, useCalendar, useTrends } from '@/features/sessions/api';

export type DayStatus = 'done' | 'today' | 'rest' | 'future';

export interface HomeLevel {
  levelNumber: number;
  title: string;
  dayCount: number;
  daysDone: number;
  status: 'completed' | 'current' | 'locked';
  days: { day: number; status: DayStatus }[];
}

export interface HomeWeekDay {
  label: string;
  date: number;
  status: DayStatus;
}

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function currentMonthKey(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/** Mon–Fri of the current week, merged with the month's completion calendar. */
function buildWeek(
  now: Date,
  calendar: { date: string; status: 'green' | 'amber' | 'grey' }[] | undefined,
): HomeWeekDay[] {
  const byDate = new Map((calendar ?? []).map((d) => [d.date, d.status]));
  const todayKey = localDateKey(now);

  // Walk back to Monday.
  const monday = new Date(now);
  const offsetToMonday = (now.getDay() + 6) % 7;
  monday.setDate(now.getDate() - offsetToMonday);

  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = localDateKey(d);
    const calStatus = byDate.get(key);

    let status: DayStatus;
    if (key === todayKey) status = 'today';
    else if (calStatus === 'green' || calStatus === 'amber') status = 'done';
    else status = 'future';

    return { label: DAY_LABELS[d.getDay()]!, date: d.getDate(), status };
  });
}

/**
 * Merge program levels (content) with enrollment progress (the user's position).
 * Days inside the current level are marked done/today/rest/future.
 */
function buildLevels(
  program: ReturnType<typeof useProgram>['data'],
  enrollment: ReturnType<typeof useMyEnrollment>['data'],
): HomeLevel[] {
  if (!program || !enrollment) return [];

  return program.levels.map((level) => {
    const isCompleted = enrollment.completedLevels.includes(level.levelNumber);
    const isCurrent = level.levelNumber === enrollment.currentLevel && !isCompleted;
    const status: HomeLevel['status'] = isCompleted
      ? 'completed'
      : isCurrent
        ? 'current'
        : 'locked';

    const days = level.days.map((d) => {
      if (!isCurrent) {
        return { day: d.dayNumber, status: (isCompleted ? 'done' : 'future') as DayStatus };
      }
      if (enrollment.completedDays.includes(d.dayNumber)) {
        return { day: d.dayNumber, status: 'done' as DayStatus };
      }
      if (d.dayNumber === enrollment.currentDay) {
        return { day: d.dayNumber, status: 'today' as DayStatus };
      }
      return {
        day: d.dayNumber,
        status: (d.isRestDay ? 'rest' : 'future') as DayStatus,
      };
    });

    const daysDone = isCompleted ? level.dayCount : isCurrent ? enrollment.completedDays.length : 0;

    return {
      levelNumber: level.levelNumber,
      title: level.title ?? `Level ${level.levelNumber}`,
      dayCount: level.dayCount,
      daysDone,
      status,
      days,
    };
  });
}

/**
 * "LEVEL 2 · BUILD" — but if a clinician already titled the level "Level 2 —
 * Build", don't stutter the number back at them.
 */
function levelCaption(levelNumber: number, title: string): string {
  if (/^level\b/i.test(title.trim())) return title.toUpperCase();
  return `LEVEL ${levelNumber} · ${title.toUpperCase()}`;
}

/** Pick the most-reported pain area and normalise its series for the sparkline. */
function buildInsight(trends: ReturnType<typeof useTrends>['data']) {
  if (!trends) return null;
  const entries = Object.entries(trends.painByArea);
  if (entries.length === 0) return null;

  const [area, points] = entries.sort((a, b) => b[1].length - a[1].length)[0]!;
  if (points.length < 2) return null;

  const scores = points.map((p) => p.score);
  const first = scores[0]!;
  const last = scores[scores.length - 1]!;
  const delta = first === 0 ? 0 : Math.round(((last - first) / first) * 100);

  // Normalise to 0–1 for the sparkline. Pain falling is good, so invert the
  // axis: an improving trend should visibly rise.
  const max = Math.max(...scores, 1);
  const series = scores.map((s) => 1 - s / max);

  const label = area.replace(/_/g, ' ');
  const headline =
    delta < 0
      ? `Your ${label} pain is easing`
      : delta > 0
        ? `Keep an eye on your ${label}`
        : `Your ${label} is holding steady`;

  return { headline, delta, period: 'vs first session', series };
}

export function useHomeData() {
  const now = useMemo(() => new Date(), []);
  const month = currentMonthKey(now);

  const meQuery = useMe();
  const enrollmentQuery = useMyEnrollment();
  const enrollment = enrollmentQuery.data ?? null;
  const hasEnrollment = !!enrollment;

  // These only make sense once we know the user is enrolled.
  const todayQuery = useToday(hasEnrollment);
  const programQuery = useProgram(enrollment?.programId);
  const activeQuery = useActiveSession();
  const calendarQuery = useCalendar(month);
  const trendsQuery = useTrends();
  const shortQuery = useShortPrograms();

  const levels = useMemo(
    () => buildLevels(programQuery.data, enrollment),
    [programQuery.data, enrollment],
  );
  const week = useMemo(() => buildWeek(now, calendarQuery.data), [now, calendarQuery.data]);
  const insight = useMemo(() => buildInsight(trendsQuery.data), [trendsQuery.data]);

  const currentLevel = levels.find((l) => l.status === 'current') ?? null;

  /**
   * Ring view-model.
   *
   * IMPORTANT: programs may be FLAT (no ProgramLevel docs) — e.g. the catalog
   * seed and SHORT programs. The ring must still render from enrollment data
   * alone in that case, and while the program query is still in flight. Never
   * make "is the user enrolled?" depend on program CONTENT.
   */
  const hasLevels = levels.length > 0;
  const ring = enrollment
    ? {
        caption: hasLevels && currentLevel
          ? levelCaption(currentLevel.levelNumber, currentLevel.title)
          : (enrollment.program?.name ?? 'YOUR PLAN').toUpperCase(),
        dayNumber: enrollment.currentDay,
        totalDays:
          hasLevels && currentLevel
            ? currentLevel.dayCount
            : (enrollment.totalDays ?? enrollment.program?.durationDays ?? 0),
        overall: enrollment.percentComplete / 100,
        accessibilityText:
          hasLevels && currentLevel
            ? `Level ${currentLevel.levelNumber}, ${currentLevel.title}. Day ${enrollment.currentDay}. ${enrollment.percentComplete} percent complete.`
            : `Day ${enrollment.currentDay}. ${enrollment.percentComplete} percent complete.`,
      }
    : null;

  // Progress of the inner (mint) arc: within the level when the program has
  // levels, otherwise straight day progress through the plan.
  const levelProgress = (() => {
    if (hasLevels && currentLevel) {
      return currentLevel.daysDone / Math.max(1, currentLevel.dayCount);
    }
    if (!enrollment) return 0;
    const total = enrollment.totalDays ?? enrollment.program?.durationDays ?? 0;
    return total > 0 ? Math.min(1, enrollment.completedDays.length / total) : 0;
  })();

  const active = activeQuery.data;
  const isResuming = !!active?.active && !!active.session;

  return {
    /** Blocks first paint — the rest fills in progressively. */
    isLoading: meQuery.isLoading || enrollmentQuery.isLoading,
    isRefreshing:
      meQuery.isFetching || enrollmentQuery.isFetching || todayQuery.isFetching,
    error: meQuery.error ?? enrollmentQuery.error ?? null,
    refetch: () => {
      void meQuery.refetch();
      void enrollmentQuery.refetch();
      void todayQuery.refetch();
      void activeQuery.refetch();
      void calendarQuery.refetch();
      void trendsQuery.refetch();
    },

    me: meQuery.data ?? null,
    enrollment,
    hasEnrollment,
    today: todayQuery.data ?? null,
    program: programQuery.data ?? null,
    /**
     * The level roadmap is built from the PROGRAM DETAIL, not the enrollment.
     * When that request fails, `levels` is empty and looks identical to a flat
     * programme — so the "Your journey" section silently vanished with nothing
     * to say why. These let the screen tell the two apart.
     */
    levelsUnavailable: programQuery.isError,
    retryProgram: () => void programQuery.refetch(),
    levels,
    currentLevel,
    /** Null only when the user has no active enrollment. */
    ring,
    levelProgress,
    week,
    insight,
    shortPrograms: shortQuery.data ?? [],
    isResuming,
    activeSession: active?.session ?? null,
    totalExercises: active?.exercises?.length ?? 0,
  };
}
