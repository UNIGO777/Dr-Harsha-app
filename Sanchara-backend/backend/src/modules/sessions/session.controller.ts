import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../utils/ApiError';
import * as sessionService from './session.service';
import type {
  StartSessionInput,
  AdvanceStateInput,
  CompleteExerciseInput,
  CompleteSessionInput,
  HistoryQuery,
  CalendarQuery,
} from './session.validation';

/** All handlers run behind authenticate + requireActiveAccess, so req.user is set. */
function userId(req: Request): string {
  if (!req.user) throw ApiError.unauthorized('Not authenticated');
  return req.user.userId;
}

// ── Part 1 — lifecycle ────────────────────────────────────────────────────────
export async function start(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await sessionService.startSession(userId(req), req.body as StartSessionInput);
    if (result.blocked) {
      // Safety gate: no session created; app shows the rest/consultation prompt.
      res.status(200).json({
        success: true,
        blocked: true,
        maxScore: result.maxScore,
        message: result.message,
        actions: result.actions,
      });
      return;
    }
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function advanceState(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { nextState } = req.body as AdvanceStateInput;
    const result = await sessionService.advanceState(userId(req), req.params.id as string, nextState);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function completeExercise(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await sessionService.completeExercise(
      userId(req),
      req.params.id as string,
      req.params.exerciseId as string,
      req.body as CompleteExerciseInput
    );
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function complete(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await sessionService.completeSession(
      userId(req),
      req.params.id as string,
      req.body as CompleteSessionInput
    );
    // result = { session, enrollment } — enrollment advance is null for SHORT/standalone.
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function active(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await sessionService.getActiveSession(userId(req));
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function abandon(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const summary = await sessionService.abandonSession(userId(req), req.params.id as string);
    res.json({ success: true, session: summary });
  } catch (err) {
    next(err);
  }
}

// ── Part 2 — records / history / progress ─────────────────────────────────────
export async function history(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await sessionService.getHistory(userId(req), req.query as unknown as HistoryQuery);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function calendar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month } = req.query as unknown as CalendarQuery;
    const result = await sessionService.getCalendar(userId(req), month);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function trends(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await sessionService.getTrends(userId(req));
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await sessionService.getSessionById(userId(req), req.params.id as string);
    res.json({ success: true, session });
  } catch (err) {
    next(err);
  }
}
