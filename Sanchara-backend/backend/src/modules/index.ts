import { Router } from 'express';
import healthRoutes from './health/health.routes';
import authRoutes from './auth/auth.routes';
import onboardingRoutes from './onboarding/onboarding.routes';
import exerciseRoutes from './exercises/exercise.routes';
import sessionRoutes from './sessions/session.routes';

/**
 * Root API router. Every feature module mounts its own sub-router here, keeping
 * route wiring in one place while the feature owns its own controller/service/
 * validation (feature-folder architecture).
 */
const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/onboarding', onboardingRoutes);
apiRouter.use('/exercises', exerciseRoutes);
apiRouter.use('/sessions', sessionRoutes);

export default apiRouter;
