import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config';
import { ApiError } from '../types';

export const auditRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const body: ApiError = {
      success: false,
      requestId: req.requestId ?? 'unknown',
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    };
    res.status(429).json(body);
  },
});
