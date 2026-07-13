import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { optionalAuthenticate } from '../../middleware/optionalAuthenticate';
import { requireActiveAccess } from '../../middleware/requireActiveAccess';
import { requireRole } from '../../middleware/requireRole';
import * as ctrl from './exercise.controller';
import {
  listExercisesQuerySchema,
  exerciseIdParamSchema,
  alternativesQuerySchema,
  createExerciseSchema,
  updateExerciseSchema,
  rejectExerciseSchema,
} from './exercise.validation';

/**
 * Exercise routes.
 *
 * Route order matters: static paths (`/categories`, `/admin/pending`) and the
 * nested `/:id/alternatives` are declared BEFORE the generic `/:id` so they are
 * not swallowed by the param route.
 *
 * Browse endpoints use optionalAuthenticate (guests allowed; entitlement/gender
 * applied when a token is present). Management endpoints require a staff/admin role.
 */
const router = Router();

// ── Public browse (guests + users) ───────────────────────────────────────────
router.get(
  '/',
  optionalAuthenticate,
  validate({ query: listExercisesQuerySchema }),
  ctrl.listExercises
);

router.get('/categories', ctrl.getCategories);

// ── Admin: approval queue (before /:id) ───────────────────────────────────────
router.get('/admin/pending', authenticate, requireRole('ADMIN'), ctrl.listPending);

// ── Staff/Admin: create ───────────────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  requireRole('CLINICAL_STAFF', 'ADMIN'),
  validate({ body: createExerciseSchema }),
  ctrl.createExercise
);

// ── Alternatives (entitled users only) — before /:id ─────────────────────────
router.get(
  '/:id/alternatives',
  authenticate,
  requireActiveAccess,
  validate({ params: exerciseIdParamSchema, query: alternativesQuerySchema }),
  ctrl.getAlternatives
);

// ── Public detail ─────────────────────────────────────────────────────────────
router.get(
  '/:id',
  optionalAuthenticate,
  validate({ params: exerciseIdParamSchema }),
  ctrl.getExercise
);

// ── Admin: approve / reject ───────────────────────────────────────────────────
router.patch(
  '/:id/approve',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: exerciseIdParamSchema }),
  ctrl.approveExercise
);

router.patch(
  '/:id/reject',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: exerciseIdParamSchema, body: rejectExerciseSchema }),
  ctrl.rejectExercise
);

// ── Staff/Admin: edit metadata ────────────────────────────────────────────────
router.patch(
  '/:id',
  authenticate,
  requireRole('CLINICAL_STAFF', 'ADMIN'),
  validate({ params: exerciseIdParamSchema, body: updateExerciseSchema }),
  ctrl.updateExercise
);

export default router;
