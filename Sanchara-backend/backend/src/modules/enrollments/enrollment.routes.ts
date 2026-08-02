import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requireActiveAccess } from '../../middleware/requireActiveAccess';
import * as ctrl from './enrollment.controller';
import {
  enrollSchema,
  enrollQuerySchema,
  enrollmentIdParamSchema,
} from './enrollment.validation';

/**
 * Enrollment routes — all behind authenticate + requireActiveAccess.
 * Static /me paths declared before the generic /:id action routes.
 */
const router = Router();

router.use(authenticate, requireActiveAccess);

router.post('/', validate({ body: enrollSchema, query: enrollQuerySchema }), ctrl.enroll);

router.get('/me', ctrl.getMine);
router.get('/me/today', ctrl.getToday);
router.post('/me/rest-day-complete', ctrl.completeRestDay);

router.patch('/:id/pause', validate({ params: enrollmentIdParamSchema }), ctrl.pause);
router.patch('/:id/resume', validate({ params: enrollmentIdParamSchema }), ctrl.resume);

export default router;
