import { Router } from 'express';
import auditRoutes from './auditRoutes';
import healthRoutes from './healthRoutes';

const router = Router();

router.use('/api/v1', auditRoutes);
router.use('/api', auditRoutes); // unversioned alias for convenience
router.use('/', healthRoutes);

export default router;
