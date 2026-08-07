import { Program, type IProgram } from '../../models/program.model';
import { ApiError } from '../../utils/ApiError';
import { getImageUrl } from '../../services/video.service';
import { getRecommendationProfile, type RecommendationProfile } from '../auth/auth.service';
import type { ProgramSummary } from './program.service';
import type { HydratedDocument } from 'mongoose';
import type { ExerciseHistoryLevel, Difficulty } from '../../constants/enums';

/**
 * Rule-based program recommendation (no ML). Scores each PUBLISHED, enrollable
 * (STANDARD) program against the user's onboarding profile and returns the top
 * few with a human-readable matchReason for the UI.
 *
 * TODO: CONFIRM RECOMMENDATION RULES WITH DR. HARSHA — clinical safety mapping,
 * placeholder weights.
 */

const WEIGHT_GOAL = 5; // high
const WEIGHT_AREA = 2; // medium (per overlapping area)
const WEIGHT_CONDITION = 2; // medium (per overlapping condition)
const WEIGHT_DIFFICULTY = 1; // low
const WEIGHT_AGE = 1; // low
const MAX_RESULTS = 3;

export interface Recommendation {
  program: ProgramSummary;
  score: number;
  matchReason: string;
}

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((w) => w.length > 1)
  );
}

/** Whether the free-text goal shares any word with the program's goal tags. */
function goalMatches(goal: string | undefined, goalTags: string[]): boolean {
  if (!goal || goalTags.length === 0) return false;
  const goalWords = words(goal);
  return goalTags.some((tag) => {
    for (const w of words(tag)) if (goalWords.has(w)) return true;
    return false;
  });
}

function overlap(a: string[], b: string[]): string[] {
  const setB = new Set(b.map((s) => s.toLowerCase()));
  return a.filter((s) => setB.has(s.toLowerCase()));
}

/** Map exercise history to the difficulty level a program should be. */
function historyToDifficulty(history?: ExerciseHistoryLevel): Difficulty | undefined {
  switch (history) {
    case 'none':
    case 'beginner':
      return 'EASY';
    case 'intermediate':
      return 'MEDIUM';
    case 'advanced':
      return 'HARD';
    default:
      return undefined;
  }
}

function toSummary(p: HydratedDocument<IProgram>): ProgramSummary {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    type: p.type,
    durationDays: p.durationDays,
    thumbnailUrl: p.thumbnailUrl,
    thumbnailImageUrl: getImageUrl(p.thumbnailUrl),
    difficultyLevel: p.difficultyLevel,
    goalTag: p.goalTag,
    suitableConditions: p.suitableConditions,
    targetAreas: p.targetAreas,
    ageGroups: p.ageGroups,
    isPublished: p.isPublished,
  };
}

function scoreProgram(
  program: HydratedDocument<IProgram>,
  profile: RecommendationProfile
): { score: number; matchReason: string } {
  let score = 0;
  // Ordered by weight so the first hit becomes the headline matchReason.
  let reason = 'A good general starting program';
  let reasonRank = -1;

  const consider = (hit: boolean, rank: number, points: number, text: string): void => {
    if (!hit) return;
    score += points;
    if (rank > reasonRank) {
      reasonRank = rank;
      reason = text;
    }
  };

  // + high: goal match
  consider(
    goalMatches(profile.goal, program.goalTag),
    4,
    WEIGHT_GOAL,
    profile.goal ? `Matches your goal: ${profile.goal}` : 'Matches your goal'
  );

  // + medium: pain areas ∩ target areas
  const areas = overlap(profile.painAreas, program.targetAreas);
  consider(areas.length > 0, 3, WEIGHT_AREA * areas.length, `Targets your pain area(s): ${areas.join(', ')}`);

  // + medium: conditions ∩ suitable conditions
  const conds = overlap(profile.conditions, program.suitableConditions);
  consider(conds.length > 0, 2, WEIGHT_CONDITION * conds.length, `Suitable for your condition(s): ${conds.join(', ')}`);

  // + low: exercise history → difficulty
  const wantDifficulty = historyToDifficulty(profile.exerciseHistory);
  consider(
    wantDifficulty !== undefined && program.difficultyLevel === wantDifficulty,
    1,
    WEIGHT_DIFFICULTY,
    'Matched to your experience level'
  );

  // + low: age group
  consider(
    profile.group !== undefined && program.ageGroups.includes(profile.group),
    0,
    WEIGHT_AGE,
    'Suitable for your age group'
  );

  return { score, matchReason: reason };
}

export async function getRecommendations(userId: string): Promise<Recommendation[]> {
  const profile = await getRecommendationProfile(userId);
  if (!profile) throw ApiError.notFound('User not found');

  const programs = await Program.find({
    type: 'STANDARD',
    isPublished: true,
    isActive: true,
  });

  const scored = programs
    .map((p) => ({ program: toSummary(p), ...scoreProgram(p, profile) }))
    .sort((a, b) => b.score - a.score);

  const matched = scored.filter((s) => s.score > 0).slice(0, MAX_RESULTS);
  if (matched.length > 0) return matched;

  // Graceful fallback: nothing scored — return the most general published programs.
  return scored.slice(0, MAX_RESULTS).map((s) => ({
    ...s,
    matchReason: 'A good general starting program',
  }));
}
