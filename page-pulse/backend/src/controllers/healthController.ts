import { Request, Response } from 'express';
import { cacheService } from '../cache/cacheService';
import { fetchQueue } from '../services/fetchService';

export function getHealth(req: Request, res: Response): void {
  res.status(200).json({
    success: true,
    requestId: req.requestId,
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    redisConnected: cacheService.isRedisConnected(),
    activeFetches: fetchQueue.activeCount,
    queuedFetches: fetchQueue.queueLength,
  });
}
