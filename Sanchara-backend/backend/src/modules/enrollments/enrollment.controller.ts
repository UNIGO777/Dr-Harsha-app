import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../utils/ApiError';
import * as enrollmentService from './enrollment.service';
import type { EnrollInput, EnrollQuery } from './enrollment.validation';

function userId(req: Request): string {
  if (!req.user) throw ApiError.unauthorized('Not authenticated');
  return req.user.userId;
}

export async function enroll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { programId } = req.body as EnrollInput;
    const { switch: switchExisting } = req.query as unknown as EnrollQuery;
    const enrollment = await enrollmentService.enroll(userId(req), programId, Boolean(switchExisting));
    res.status(201).json({ success: true, enrollment });
  } catch (err) {
    next(err);
  }
}

export async function getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const enrollment = await enrollmentService.getMyEnrollment(userId(req));
    res.json({ success: true, enrollment });
  } catch (err) {
    next(err);
  }
}

export async function getToday(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const today = await enrollmentService.getToday(userId(req));
    res.json({ success: true, today });
  } catch (err) {
    next(err);
  }
}

/** POST /api/enrollments/me/rest-day-complete — advance past a rest day (no session exists). */
export async function completeRestDay(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await enrollmentService.completeRestDay(userId(req));
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function pause(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const enrollment = await enrollmentService.pause(userId(req), req.params.id as string);
    res.json({ success: true, enrollment });
  } catch (err) {
    next(err);
  }
}

export async function resume(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const enrollment = await enrollmentService.resume(userId(req), req.params.id as string);
    res.json({ success: true, enrollment });
  } catch (err) {
    next(err);
  }
}
