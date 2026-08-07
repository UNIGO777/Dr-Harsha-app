import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import * as ctrl from './patient.controller';
import {
  listPatientsQuerySchema,
  patientIdParamSchema,
  setStatusSchema,
} from './patient.validation';

/**
 * Staff-facing patient reads, mounted at /api/staff/patients.
 *
 * Both roles may read patients, but the SERVICE narrows the query by
 * assignment: CLINICAL_STAFF only ever sees their own patients. That's enforced
 * server-side, not by hiding UI.
 */
const router = Router();

router.use(authenticate, requireRole('CLINICAL_STAFF', 'ADMIN'));

router.get('/', validate({ query: listPatientsQuerySchema }), ctrl.list);
router.get('/:id', validate({ params: patientIdParamSchema }), ctrl.detail);

// Blocking is scoped the same way — a clinician can only act on their own
// patients — and always writes an audited reason.
router.patch(
  '/:id/status',
  validate({ params: patientIdParamSchema, body: setStatusSchema }),
  ctrl.setStatus
);

export default router;
