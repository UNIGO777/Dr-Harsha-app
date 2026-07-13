import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requireActiveAccess } from '../../middleware/requireActiveAccess';
import * as ctrl from './session.controller';
import {
  startSessionSchema,
  advanceStateSchema,
  completeExerciseSchema,
  completeSessionSchema,
  abandonSessionSchema,
  sessionIdParamSchema,
  sessionExerciseParamSchema,
  historyQuerySchema,
  calendarQuerySchema,
} from './session.validation';

/**
 * Session routes. EVERY endpoint sits behind authenticate + requireActiveAccess
 * — guests and trial-expired users cannot run or read sessions.
 *
 * Static read paths (/history, /calendar, /trends) are declared before the
 * generic /:id so they are not swallowed by the param route.
 */
const router = Router();

router.use(authenticate, requireActiveAccess);

// ── Lifecycle ─────────────────────────────────────────────────────────────────
router.post('/start', validate({ body: startSessionSchema }), ctrl.start);

// ── Records / progress (before /:id) ──────────────────────────────────────────
router.get('/history', validate({ query: historyQuerySchema }), ctrl.history);
router.get('/calendar', validate({ query: calendarQuerySchema }), ctrl.calendar);
router.get('/trends', ctrl.trends);

// ── Per-session lifecycle actions ─────────────────────────────────────────────
router.patch(
  '/:id/state',
  validate({ params: sessionIdParamSchema, body: advanceStateSchema }),
  ctrl.advanceState
);

router.post(
  '/:id/exercise/:exerciseId/complete',
  validate({ params: sessionExerciseParamSchema, body: completeExerciseSchema }),
  ctrl.completeExercise
);

router.post(
  '/:id/complete',
  validate({ params: sessionIdParamSchema, body: completeSessionSchema }),
  ctrl.complete
);

router.post(
  '/:id/abandon',
  validate({ params: sessionIdParamSchema, body: abandonSessionSchema }),
  ctrl.abandon
);

// ── Detail (last — generic param route) ───────────────────────────────────────
router.get('/:id', validate({ params: sessionIdParamSchema }), ctrl.getById);

export default router;
