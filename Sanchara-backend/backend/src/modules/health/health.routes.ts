import { Router } from 'express';
import { healthCheck } from './health.controller';

/**
 * Health module routes. Mounted at /api/health in app.ts.
 */
const router = Router();

router.get('/', healthCheck);

export default router;
