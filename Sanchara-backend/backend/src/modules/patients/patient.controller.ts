import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../utils/ApiError';
import * as patientService from './patient.service';
import type { ListPatientsQuery, SetLevelInput, SetStatusInput } from './patient.validation';

function actor(req: Request): { userId: string; role: 'CLINICAL_STAFF' | 'ADMIN' } {
  if (!req.user) throw ApiError.unauthorized('Not authenticated');
  return req.user as { userId: string; role: 'CLINICAL_STAFF' | 'ADMIN' };
}

/** GET /api/staff/patients */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await patientService.listPatients(
      actor(req),
      req.query as unknown as ListPatientsQuery
    );
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

/** GET /api/staff/patients/:id */
export async function detail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patient = await patientService.getPatient(actor(req), req.params.id as string);
    res.json({ success: true, patient });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/staff/patients/:id/status — block, unblock, or approve off waitlist. */

export async function setStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { accountStatus, reason } = req.body as SetStatusInput;
    const patient = await patientService.setAccountStatus(
      actor(req),
      req.params.id as string,
      accountStatus,
      reason
    );
    res.json({ success: true, patient });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/staff/patients/:id/level — clinical override of the difficulty tier. */
export async function setLevel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { levelNumber, reason } = req.body as SetLevelInput;
    const enrollment = await patientService.setPatientLevel(
      actor(req),
      req.params.id as string,
      levelNumber,
      reason
    );
    res.json({ success: true, enrollment });
  } catch (err) {
    next(err);
  }
}
