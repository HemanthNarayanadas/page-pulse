import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { ApiError } from '../types';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.requestId ?? 'unknown';

  if (err instanceof AppError) {
    logger.warn({ requestId, code: err.code, message: err.message }, 'Handled application error');
    const body: ApiError = {
      success: false,
      requestId,
      error: { code: err.code, message: err.message },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  // Never leak stack traces or internal error details to clients.
  logger.error({ requestId, err }, 'Unhandled error');
  const body: ApiError = {
    success: false,
    requestId,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
  };
  res.status(500).json(body);
}

export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiError = {
    success: false,
    requestId: req.requestId ?? 'unknown',
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found.` },
  };
  res.status(404).json(body);
}
