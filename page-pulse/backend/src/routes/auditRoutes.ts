import { Router } from 'express';
import { postAudit } from '../controllers/auditController';
import { auditRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/audit', auditRateLimiter, postAudit);

export default router;
