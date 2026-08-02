import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../utils/ApiError';
import * as programService from './program.service';
import { getRecommendations } from './recommendation.service';
import type {
  CreateProgramInput,
  UpdateProgramInput,
  CreateLevelInput,
  UpdateLevelInput,
  CreateDayInput,
  UpdateDayInput,
  ListDaysQuery,
  ListProgramsQuery,
} from './program.validation';

function staffId(req: Request): string {
  if (!req.user) throw ApiError.unauthorized('Not authenticated');
  return req.user.userId;
}

function userId(req: Request): string {
  if (!req.user) throw ApiError.unauthorized('Not authenticated');
  return req.user.userId;
}

// ── Management ────────────────────────────────────────────────────────────────
export async function createProgram(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const program = await programService.createProgram(req.body as CreateProgramInput, staffId(req));
    res.status(201).json({ success: true, program });
  } catch (err) {
    next(err);
  }
}

export async function updateProgram(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const program = await programService.updateProgram(req.params.id as string, req.body as UpdateProgramInput);
    res.json({ success: true, program });
  } catch (err) {
    next(err);
  }
}

export async function publishProgram(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { isPublished } = req.body as { isPublished: boolean };
    const program = await programService.setPublished(req.params.id as string, isPublished);
    res.json({ success: true, program });
  } catch (err) {
    next(err);
  }
}

// ── Levels (M2.5-L) ───────────────────────────────────────────────────────────
export async function createLevel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const level = await programService.createLevel(req.params.id as string, req.body as CreateLevelInput);
    res.status(201).json({ success: true, level });
  } catch (err) {
    next(err);
  }
}

export async function updateLevel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const level = await programService.updateLevel(
      req.params.id as string,
      req.params.levelId as string,
      req.body as UpdateLevelInput
    );
    res.json({ success: true, level });
  } catch (err) {
    next(err);
  }
}

export async function deleteLevel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await programService.deleteLevel(req.params.id as string, req.params.levelId as string);
    res.json({ success: true, message: 'Level deleted' });
  } catch (err) {
    next(err);
  }
}

export async function listLevels(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const levels = await programService.listLevels(req.params.id as string);
    res.json({ success: true, levels });
  } catch (err) {
    next(err);
  }
}

export async function createDay(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const day = await programService.createDay(req.params.id as string, req.body as CreateDayInput);
    res.status(201).json({ success: true, day });
  } catch (err) {
    next(err);
  }
}

export async function updateDay(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const day = await programService.updateDay(
      req.params.id as string,
      req.params.dayId as string,
      req.body as UpdateDayInput
    );
    res.json({ success: true, day });
  } catch (err) {
    next(err);
  }
}

export async function deleteDay(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await programService.deleteDay(req.params.id as string, req.params.dayId as string);
    res.json({ success: true, message: 'Day deleted' });
  } catch (err) {
    next(err);
  }
}

export async function listDays(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { levelNumber } = req.query as unknown as ListDaysQuery;
    const days = await programService.listDays(req.params.id as string, levelNumber);
    res.json({ success: true, days });
  } catch (err) {
    next(err);
  }
}

// ── Public ────────────────────────────────────────────────────────────────────
export async function listPrograms(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await programService.listPublishedPrograms(req.query as unknown as ListProgramsQuery);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getProgram(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const program = await programService.getProgramDetail(req.params.id as string);
    res.json({ success: true, program });
  } catch (err) {
    next(err);
  }
}

export async function getRecommended(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const recommendations = await getRecommendations(userId(req));
    res.json({ success: true, recommendations });
  } catch (err) {
    next(err);
  }
}
