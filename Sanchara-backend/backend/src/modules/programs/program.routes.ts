import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requireActiveAccess } from '../../middleware/requireActiveAccess';
import { requireRole } from '../../middleware/requireRole';
import * as ctrl from './program.controller';
import {
  createProgramSchema,
  updateProgramSchema,
  publishProgramSchema,
  createDaySchema,
  updateDaySchema,
  programIdParamSchema,
  programDayParamSchema,
  listProgramsQuerySchema,
} from './program.validation';

/**
 * Program routes. Two audiences:
 *  - Public (authenticate + requireActiveAccess): browse published programs + recommendations.
 *  - Management (authenticate + requireRole CLINICAL_STAFF|ADMIN): CRUD programs + days.
 *
 * Static/specific paths declared before the generic /:id.
 */
const router = Router();

const staffOnly = [authenticate, requireRole('CLINICAL_STAFF', 'ADMIN')] as const;
const activeUser = [authenticate, requireActiveAccess] as const;

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/recommended', ...activeUser, ctrl.getRecommended);
router.get('/', ...activeUser, validate({ query: listProgramsQuerySchema }), ctrl.listPrograms);

// ── Management: programs ───────────────────────────────────────────────────────
router.post('/', ...staffOnly, validate({ body: createProgramSchema }), ctrl.createProgram);

// ── Management: days (before /:id) ─────────────────────────────────────────────
router.get('/:id/days', ...staffOnly, validate({ params: programIdParamSchema }), ctrl.listDays);
router.post(
  '/:id/days',
  ...staffOnly,
  validate({ params: programIdParamSchema, body: createDaySchema }),
  ctrl.createDay
);
router.patch(
  '/:id/days/:dayId',
  ...staffOnly,
  validate({ params: programDayParamSchema, body: updateDaySchema }),
  ctrl.updateDay
);
router.delete(
  '/:id/days/:dayId',
  ...staffOnly,
  validate({ params: programDayParamSchema }),
  ctrl.deleteDay
);

router.patch(
  '/:id/publish',
  ...staffOnly,
  validate({ params: programIdParamSchema, body: publishProgramSchema }),
  ctrl.publishProgram
);
router.patch(
  '/:id',
  ...staffOnly,
  validate({ params: programIdParamSchema, body: updateProgramSchema }),
  ctrl.updateProgram
);

// ── Public detail (last — generic param) ──────────────────────────────────────
router.get('/:id', ...activeUser, validate({ params: programIdParamSchema }), ctrl.getProgram);

export default router;
