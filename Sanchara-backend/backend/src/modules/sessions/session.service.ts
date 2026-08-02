import { Types, type HydratedDocument } from 'mongoose';
import { Session, type ISession } from '../../models/session.model';
import { ApiError } from '../../utils/ApiError';
import { getPlayableVideoUrl } from '../../services/video.service';
import { recordAudit } from '../../services/audit.service';
import {
  getExercisesByIds,
  getAlternatives,
  type ExerciseSessionView,
} from '../exercises/exercise.service';
import { getProgramDayContentById, type ProgramDayContent } from '../programs/program.service';
import { advanceForCompletedDay, type AdvanceResult } from '../enrollments/enrollment.service';
import {
  getSessionStartContext,
  getUserContext,
  addWeeklyActivityMinutes,
} from '../auth/auth.service';
import type { SessionState, SessionCompletion, ProgramType, Difficulty } from '../../constants/enums';
import type {
  StartSessionInput,
  CompleteExerciseInput,
  CompleteSessionInput,
  HistoryQuery,
} from './session.validation';

/**
 * Session engine (M2.5). Server-authoritative: pain gating, ease capture, state
 * transitions, resume pointer and metrics are enforced here, never trusted from
 * the client. A session is a USER'S RECORD of doing a ProgramDay.
 */

// ── State machine ─────────────────────────────────────────────────────────────
const TRANSITIONS: Record<SessionState, SessionState[]> = {
  PAIN_CHECKIN: ['WARMUP', 'ABANDONED'],
  WARMUP: ['EXERCISE_ACTIVE', 'ABANDONED'],
  EXERCISE_ACTIVE: ['COOLDOWN_BREAK', 'NEXT_EXERCISE', 'COOLDOWN', 'SESSION_SUMMARY', 'ABANDONED'],
  COOLDOWN_BREAK: ['NEXT_EXERCISE', 'EXERCISE_ACTIVE', 'COOLDOWN', 'ABANDONED'],
  NEXT_EXERCISE: ['EXERCISE_ACTIVE', 'COOLDOWN', 'ABANDONED'],
  COOLDOWN: ['SESSION_SUMMARY', 'ABANDONED'],
  SESSION_SUMMARY: ['COMPLETED', 'ABANDONED'],
  COMPLETED: [],
  ABANDONED: [],
};

const TERMINAL_STATES: SessionState[] = ['COMPLETED', 'ABANDONED'];

// Pain score at/above which we block auto-start.
// TODO: CONFIRM pain threshold (>=8) WITH DR. HARSHA
const SAFETY_THRESHOLD = 8;

function isTerminal(state: SessionState): boolean {
  return TERMINAL_STATES.includes(state);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

async function loadOwnedSession(
  userId: string,
  sessionId: string
): Promise<HydratedDocument<ISession>> {
  const session = await Session.findOne({ _id: sessionId, user: userId });
  if (!session) throw ApiError.notFound('Session not found');
  return session;
}

// ── Result shapes ─────────────────────────────────────────────────────────────
export interface StartExerciseDTO {
  exerciseId: string;
  order: number;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  difficulty: Difficulty;
  areaTag: string[];
  isWarmup: boolean;
  isCooldown: boolean;
  sets?: number;
  notes?: string;
  videoUrl: string | null;
}

export interface StartedSession {
  blocked: false;
  sessionId: string;
  state: SessionState;
  levelNumber?: number;
  dayNumber?: number;
  programType?: ProgramType;
  currentExerciseIndex: number;
  groupAtTime?: string;
  levelAtTime?: number;
  safetyOverride: ISession['safetyOverride'];
  exercises: StartExerciseDTO[];
}

export type StartSessionResult =
  | { blocked: true; maxScore: number; message: string; actions: string[] }
  | StartedSession;

export interface DetailExerciseDTO {
  exerciseId: string;
  title?: string;
  difficulty?: Difficulty;
  videoUrl: string | null;
  setsCompleted: number;
  easeScore?: number;
  tooHard: boolean;
  tooEasy: boolean;
  restTimerSeconds?: number;
  alternativeChosen: {
    exerciseId: string;
    title?: string;
    difficulty?: Difficulty;
    videoUrl: string | null;
  } | null;
}

export interface SessionDetail {
  id: string;
  programType?: ProgramType;
  shortProgramTag?: string;
  levelNumber?: number;
  dayNumber?: number;
  state: SessionState;
  currentExerciseIndex: number;
  completion?: SessionCompletion;
  painCheckin: { area: string; score: number }[];
  safetyOverride: ISession['safetyOverride'];
  groupAtTime?: string;
  levelAtTime?: number;
  durationSeconds?: number;
  exercisesCompleted?: number;
  avgEaseScore?: number;
  hr: { avg?: number; max?: number };
  caloriesEstimate?: number;
  startedAt?: Date;
  endedAt?: Date;
  exercises: DetailExerciseDTO[];
}

// ── Build the ordered playable exercise list for a program day ─────────────────
async function buildStartExercises(content: ProgramDayContent): Promise<StartExerciseDTO[]> {
  const views = await getExercisesByIds(content.exercises.map((e) => e.exerciseId));
  const byId = new Map(views.map((v) => [v.id, v]));
  return content.exercises
    .map((e): StartExerciseDTO | null => {
      const v = byId.get(e.exerciseId);
      if (!v) return null;
      return {
        exerciseId: v.id,
        order: e.order,
        title: v.title,
        description: v.description,
        thumbnailUrl: v.thumbnailUrl,
        durationSeconds: v.durationSeconds,
        difficulty: v.difficulty,
        areaTag: v.areaTag,
        isWarmup: v.isWarmup,
        isCooldown: v.isCooldown,
        sets: e.sets,
        notes: e.notes,
        // Entitled: requireActiveAccess passed. Never raw storageKey.
        videoUrl: getPlayableVideoUrl(v.storageKey, true),
      };
    })
    .filter((x): x is StartExerciseDTO => x !== null);
}

// ── Part 5.1 — start (for a ProgramDay) ────────────────────────────────────────
export async function startSession(
  userId: string,
  input: StartSessionInput
): Promise<StartSessionResult> {
  const ctx = await getSessionStartContext(userId);
  if (!ctx) throw ApiError.notFound('User not found');

  // Pain check-in areas must correspond to the user's profile pain areas.
  const profileAreas = new Set(ctx.painAreas);
  const foreign = input.painCheckin.filter((p) => !profileAreas.has(p.area));
  if (foreign.length > 0) {
    throw ApiError.badRequest(
      `Pain check-in includes areas not in your profile: ${foreign.map((f) => f.area).join(', ')}`
    );
  }

  const maxScore = input.painCheckin.reduce((m, p) => Math.max(m, p.score), 0);

  // SAFETY GATE — server-authoritative (unchanged from M5).
  if (maxScore >= SAFETY_THRESHOLD && !input.safetyOverride) {
    return {
      blocked: true,
      maxScore,
      message:
        'One or more of your pain scores are high. We recommend resting today or booking a consultation before exercising.',
      actions: ['REST_TODAY', 'BOOK_CONSULTATION'],
    };
  }
  const didOverride = maxScore >= SAFETY_THRESHOLD && input.safetyOverride;

  const content = await getProgramDayContentById(input.programDayId);
  if (!content) throw ApiError.notFound('Program day not found');
  if (content.isRestDay) throw ApiError.badRequest('This is a rest day — there is no workout to start');

  const session = await Session.create({
    user: new Types.ObjectId(userId),
    program: new Types.ObjectId(content.program),
    programDay: new Types.ObjectId(content.id),
    levelNumber: content.levelNumber,
    dayNumber: content.dayNumber,
    programType: content.programType, // server-authoritative (from the program)
    // SHORT sessions carry the analytics tag but never touch enrollment progress.
    shortProgramTag: content.programType === 'SHORT' ? 'short_program' : undefined,
    state: 'WARMUP',
    currentExerciseIndex: 0,
    painCheckin: input.painCheckin,
    safetyOverride: didOverride
      ? { triggered: true, maxScore, overriddenAt: new Date() }
      : { triggered: false },
    groupAtTime: ctx.group,
    levelAtTime: ctx.level,
    startedAt: new Date(),
    exercises: [],
  });

  if (didOverride) {
    await recordAudit({
      actor: userId,
      actorRole: 'USER',
      action: 'SAFETY_OVERRIDE',
      reason: input.safetyOverrideReason ?? `User override: max pain score ${maxScore}`,
      metadata: {
        sessionId: session.id,
        maxScore,
        levelNumber: content.levelNumber,
        dayNumber: content.dayNumber,
      },
    });
  }

  return {
    blocked: false,
    sessionId: session.id,
    state: session.state,
    levelNumber: session.levelNumber,
    dayNumber: session.dayNumber,
    programType: session.programType,
    currentExerciseIndex: session.currentExerciseIndex,
    groupAtTime: session.groupAtTime,
    levelAtTime: session.levelAtTime,
    safetyOverride: session.safetyOverride,
    exercises: await buildStartExercises(content),
  };
}

// ── Part 5.2 — resume: the user's in-progress session ──────────────────────────
export interface ActiveSessionResult {
  active: boolean;
  session?: {
    sessionId: string;
    state: SessionState;
    levelNumber?: number;
    dayNumber?: number;
    programType?: ProgramType;
    currentExerciseIndex: number;
    painCheckin: { area: string; score: number }[];
    safetyOverride: ISession['safetyOverride'];
    startedAt?: Date;
  };
  exercises?: StartExerciseDTO[];
}

export async function getActiveSession(userId: string): Promise<ActiveSessionResult> {
  const session = await Session.findOne({
    user: userId,
    state: { $nin: TERMINAL_STATES },
  }).sort({ startedAt: -1 });
  if (!session) return { active: false };

  let exercises: StartExerciseDTO[] = [];
  if (session.programDay) {
    const content = await getProgramDayContentById(session.programDay.toString());
    if (content) exercises = await buildStartExercises(content);
  }

  return {
    active: true,
    session: {
      sessionId: session.id,
      state: session.state,
      levelNumber: session.levelNumber,
      dayNumber: session.dayNumber,
      programType: session.programType,
      currentExerciseIndex: session.currentExerciseIndex,
      painCheckin: session.painCheckin.map((p) => ({ area: p.area, score: p.score })),
      safetyOverride: session.safetyOverride,
      startedAt: session.startedAt,
    },
    exercises,
  };
}

// ── Part 5.3 — advance state ────────────────────────────────────────────────────
export async function advanceState(
  userId: string,
  sessionId: string,
  nextState: SessionState
): Promise<{ sessionId: string; previousState: SessionState; state: SessionState }> {
  const session = await loadOwnedSession(userId, sessionId);

  if (isTerminal(session.state)) {
    throw ApiError.badRequest(`Session is already ${session.state.toLowerCase()}`);
  }
  if (isTerminal(nextState)) {
    throw ApiError.badRequest('Use POST /complete or /abandon to finalize a session');
  }
  if (!TRANSITIONS[session.state].includes(nextState)) {
    const allowed = TRANSITIONS[session.state].filter((s) => !isTerminal(s));
    throw ApiError.badRequest(
      `Illegal state transition ${session.state} → ${nextState}. Allowed: ${allowed.join(', ') || 'none'}`
    );
  }

  const previousState = session.state;
  session.state = nextState;
  await session.save();
  return { sessionId: session.id, previousState, state: session.state };
}

// ── Part 5.4 — complete an exercise (advances resume pointer) ───────────────────
export interface CompleteExerciseResult {
  sessionId: string;
  currentExerciseIndex: number;
  recorded: {
    exerciseId: string;
    setsCompleted: number;
    easeScore: number;
    restTimerSeconds: number;
    tooHard: boolean;
    tooEasy: boolean;
    alternativeChosen: string | null;
  };
  alternative: {
    exerciseId: string;
    title: string;
    difficulty: Difficulty;
    videoUrl: string | null;
  } | null;
}

export async function completeExercise(
  userId: string,
  sessionId: string,
  exerciseId: string,
  input: CompleteExerciseInput
): Promise<CompleteExerciseResult> {
  const session = await loadOwnedSession(userId, sessionId);
  if (isTerminal(session.state)) {
    throw ApiError.badRequest('Session is already finalized');
  }

  let alternativeChosen: Types.ObjectId | null = null;
  let alternative: CompleteExerciseResult['alternative'] = null;

  if (input.alternativeChosenId) {
    alternativeChosen = new Types.ObjectId(input.alternativeChosenId);
  } else if (input.tooHard || input.tooEasy) {
    const direction = input.tooHard ? 'easier' : 'harder';
    const userCtx = await getUserContext(userId);
    const alts = await getAlternatives(exerciseId, direction, {
      gender: userCtx?.gender,
      entitled: true,
    });
    const alt = alts[0];
    if (alt) {
      alternativeChosen = new Types.ObjectId(alt.id);
      alternative = {
        exerciseId: alt.id,
        title: alt.title,
        difficulty: alt.difficulty,
        videoUrl: getPlayableVideoUrl(alt.videoUrl ?? '', true),
      };
    }
  }

  session.exercises.push({
    exercise: new Types.ObjectId(exerciseId),
    setsCompleted: input.setsCompleted,
    easeScore: input.easeScore,
    tooHard: input.tooHard,
    tooEasy: input.tooEasy,
    alternativeChosen,
    restTimerSeconds: input.restTimerSeconds,
  });
  // Advance the resume pointer and persist so a crash/kill resumes correctly.
  session.currentExerciseIndex = session.exercises.length;
  await session.save();

  return {
    sessionId: session.id,
    currentExerciseIndex: session.currentExerciseIndex,
    recorded: {
      exerciseId,
      setsCompleted: input.setsCompleted,
      easeScore: input.easeScore,
      restTimerSeconds: input.restTimerSeconds,
      tooHard: input.tooHard,
      tooEasy: input.tooEasy,
      alternativeChosen: alternativeChosen ? alternativeChosen.toString() : null,
    },
    alternative,
  };
}

// ── Part 5.5 — complete the session (advances enrollment) ──────────────────────
export interface CompleteSessionResult {
  session: SessionDetail;
  enrollment: AdvanceResult | null;
}

export async function completeSession(
  userId: string,
  sessionId: string,
  input: CompleteSessionInput
): Promise<CompleteSessionResult> {
  const session = await loadOwnedSession(userId, sessionId);
  if (isTerminal(session.state)) {
    throw ApiError.badRequest('Session is already finalized');
  }

  const now = new Date();
  const startedAt = session.startedAt ?? session.createdAt;
  const durationSeconds = Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000));

  const easeScores = session.exercises
    .map((e) => e.easeScore)
    .filter((n): n is number => typeof n === 'number');
  const avgEaseScore = easeScores.length
    ? round1(easeScores.reduce((a, b) => a + b, 0) / easeScores.length)
    : undefined;

  const exercisesCompleted = session.exercises.length;

  // Program-day content drives day length (COMPLETED vs PARTIAL) + enrollment advance.
  const content = session.programDay
    ? await getProgramDayContentById(session.programDay.toString())
    : null;
  const dayLength = content ? content.exercises.length : 0;
  const completion: SessionCompletion =
    dayLength > 0 && exercisesCompleted >= dayLength ? 'COMPLETED' : 'PARTIAL';

  session.durationSeconds = durationSeconds;
  session.exercisesCompleted = exercisesCompleted;
  session.avgEaseScore = avgEaseScore;
  if (input.hrAvg !== undefined) session.hrAvg = input.hrAvg;
  if (input.hrMax !== undefined) session.hrMax = input.hrMax;
  if (input.caloriesEstimate !== undefined) session.caloriesEstimate = input.caloriesEstimate;
  session.completion = completion;
  session.state = 'COMPLETED';
  session.endedAt = now;
  await session.save();

  // Weekly activity minutes count on completion (incl. SHORT programs).
  const minutes = Math.round(durationSeconds / 60);
  if (minutes > 0) await addWeeklyActivityMinutes(userId, minutes);
  // M6/M7: weekly reset + full activity tracking handled there.

  // Advance enrollment progress — SHORT sessions are standalone (skip).
  let enrollment: AdvanceResult | null = null;
  if (content && session.programType !== 'SHORT' && session.dayNumber !== undefined) {
    enrollment = await advanceForCompletedDay(userId, content.program, {
      levelNumber: session.levelNumber,
      dayNumber: session.dayNumber,
      durationDays: content.durationDays,
    });
  }

  return { session: await buildSessionDetail(session), enrollment };
}

// ── Part 5.6 — abandon (never auto-called; app-close only) ──────────────────────
export async function abandonSession(userId: string, sessionId: string): Promise<SessionDetail> {
  const session = await loadOwnedSession(userId, sessionId);
  if (isTerminal(session.state)) {
    throw ApiError.badRequest('Session is already finalized');
  }

  const now = new Date();
  const startedAt = session.startedAt ?? session.createdAt;
  session.durationSeconds = Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000));
  session.exercisesCompleted = session.exercises.length;
  session.completion = session.exercises.length > 0 ? 'PARTIAL' : 'SKIPPED';
  session.state = 'ABANDONED';
  session.endedAt = now;
  await session.save();
  return buildSessionDetail(session);
}

// ── Detail builder (hydrates exercise metadata + playable video) ──────────────
async function buildSessionDetail(session: HydratedDocument<ISession>): Promise<SessionDetail> {
  const exIds = session.exercises.map((e) => e.exercise.toString());
  const altIds = session.exercises
    .map((e) => e.alternativeChosen?.toString())
    .filter((x): x is string => Boolean(x));
  const uniqueIds = [...new Set([...exIds, ...altIds])];
  const views = uniqueIds.length ? await getExercisesByIds(uniqueIds) : [];
  const viewById = new Map<string, ExerciseSessionView>(views.map((v) => [v.id, v]));

  const exercises: DetailExerciseDTO[] = session.exercises.map((e) => {
    const v = viewById.get(e.exercise.toString());
    const altId = e.alternativeChosen?.toString();
    const altV = altId ? viewById.get(altId) : undefined;
    return {
      exerciseId: e.exercise.toString(),
      title: v?.title,
      difficulty: v?.difficulty,
      videoUrl: v ? getPlayableVideoUrl(v.storageKey, true) : null,
      setsCompleted: e.setsCompleted,
      easeScore: e.easeScore,
      tooHard: e.tooHard,
      tooEasy: e.tooEasy,
      restTimerSeconds: e.restTimerSeconds,
      alternativeChosen: altId
        ? {
            exerciseId: altId,
            title: altV?.title,
            difficulty: altV?.difficulty,
            videoUrl: altV ? getPlayableVideoUrl(altV.storageKey, true) : null,
          }
        : null,
    };
  });

  return {
    id: session.id,
    programType: session.programType,
    shortProgramTag: session.shortProgramTag,
    levelNumber: session.levelNumber,
    dayNumber: session.dayNumber,
    state: session.state,
    currentExerciseIndex: session.currentExerciseIndex,
    completion: session.completion,
    painCheckin: session.painCheckin.map((p) => ({ area: p.area, score: p.score })),
    safetyOverride: session.safetyOverride,
    groupAtTime: session.groupAtTime,
    levelAtTime: session.levelAtTime,
    durationSeconds: session.durationSeconds,
    exercisesCompleted: session.exercisesCompleted,
    avgEaseScore: session.avgEaseScore,
    hr: { avg: session.hrAvg, max: session.hrMax },
    caloriesEstimate: session.caloriesEstimate,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    exercises,
  };
}

export async function getSessionById(userId: string, sessionId: string): Promise<SessionDetail> {
  const session = await loadOwnedSession(userId, sessionId);
  return buildSessionDetail(session);
}

// ── Records: history ────────────────────────────────────────────────────────────
export interface HistoryCard {
  id: string;
  date?: Date;
  levelNumber?: number;
  dayNumber?: number;
  durationSeconds: number;
  completion?: SessionCompletion;
  avgEaseScore?: number;
  programType?: ProgramType;
  shortProgramTag?: string;
}

export async function getHistory(
  userId: string,
  query: HistoryQuery
): Promise<{ data: HistoryCard[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const filter = {
    user: userId,
    completion: { $in: ['COMPLETED', 'PARTIAL'] as SessionCompletion[] },
  };
  const { page, limit } = query;
  const [docs, total] = await Promise.all([
    Session.find(filter)
      .sort({ startedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Session.countDocuments(filter),
  ]);

  const data: HistoryCard[] = docs.map((s) => ({
    id: s.id,
    date: s.endedAt ?? s.startedAt,
    levelNumber: s.levelNumber,
    dayNumber: s.dayNumber,
    durationSeconds: s.durationSeconds ?? 0,
    completion: s.completion,
    avgEaseScore: s.avgEaseScore,
    programType: s.programType,
    shortProgramTag: s.shortProgramTag,
  }));

  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 } };
}

// ── Records: calendar ────────────────────────────────────────────────────────────
export type DayStatus = 'green' | 'amber' | 'grey';

export async function getCalendar(
  userId: string,
  month: string
): Promise<{
  month: string;
  days: { date: string; status: DayStatus; sessions: number; dayNumbers: number[] }[];
}> {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  const docs = await Session.find({
    user: userId,
    startedAt: { $gte: start, $lt: end },
  }).select('startedAt completion dayNumber');

  const byDay = new Map<
    string,
    { completed: number; partial: number; other: number; dayNumbers: number[] }
  >();
  for (const s of docs) {
    const day = (s.startedAt ?? s.createdAt).toISOString().slice(0, 10);
    const cur = byDay.get(day) ?? { completed: 0, partial: 0, other: 0, dayNumbers: [] };
    if (s.completion === 'COMPLETED') cur.completed += 1;
    else if (s.completion === 'PARTIAL') cur.partial += 1;
    else cur.other += 1;
    if (typeof s.dayNumber === 'number') cur.dayNumbers.push(s.dayNumber);
    byDay.set(day, cur);
  }

  const days = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, c]) => ({
      date,
      status: (c.completed > 0 ? 'green' : c.partial > 0 ? 'amber' : 'grey') as DayStatus,
      sessions: c.completed + c.partial + c.other,
      dayNumbers: c.dayNumbers,
    }));

  return { month, days };
}

// ── Records: trends ──────────────────────────────────────────────────────────────
export interface TrendPoint {
  date?: Date;
  score: number;
}

export async function getTrends(userId: string): Promise<{
  painByArea: Record<string, TrendPoint[]>;
  easeTrajectory: { date?: Date; avgEaseScore: number }[];
}> {
  const docs = await Session.find({
    user: userId,
    completion: { $in: ['COMPLETED', 'PARTIAL'] },
  })
    .sort({ startedAt: 1 })
    .select('startedAt painCheckin avgEaseScore');

  const painByArea: Record<string, TrendPoint[]> = {};
  const easeTrajectory: { date?: Date; avgEaseScore: number }[] = [];

  for (const s of docs) {
    const date = s.startedAt ?? s.createdAt;
    for (const p of s.painCheckin) {
      (painByArea[p.area] ??= []).push({ date, score: p.score });
    }
    if (typeof s.avgEaseScore === 'number') {
      easeTrajectory.push({ date, avgEaseScore: s.avgEaseScore });
    }
  }

  // M7: BMI/weight trends come from the health module — do not duplicate here.
  return { painByArea, easeTrajectory };
}
