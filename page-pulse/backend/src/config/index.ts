import dotenv from 'dotenv';
import { AppConfig } from '../types';

dotenv.config();

function toInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config: AppConfig = {
  port: toInt(process.env.PORT, 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  cacheTtlSeconds: toInt(process.env.CACHE_TTL, 600),
  maxConcurrentFetches: toInt(process.env.MAX_CONCURRENT_FETCHES, 5),
  fetchTimeoutMs: toInt(process.env.FETCH_TIMEOUT_MS, 5000),
  rateLimitWindowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000),
  rateLimitMax: toInt(process.env.RATE_LIMIT_MAX, 100),
  logLevel: process.env.LOG_LEVEL ?? 'info',
};
