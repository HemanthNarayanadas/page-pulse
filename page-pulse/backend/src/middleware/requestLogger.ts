import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  req.requestId = randomUUID();
  req.startTime = Date.now();
  res.setHeader('X-Request-Id', req.requestId);

  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    logger.info({
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      durationMs: duration,
      ip: req.ip,
      route: req.originalUrl,
      method: req.method,
      status: res.statusCode,
    });
  });

  next();
}
