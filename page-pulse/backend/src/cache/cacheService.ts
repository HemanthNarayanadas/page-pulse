import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Cache abstraction. Prefers Redis; transparently falls back to an
 * in-memory Map if Redis is unavailable so the service degrades
 * gracefully instead of failing requests.
 */
export interface CacheService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  isRedisConnected(): boolean;
}

class InMemoryStore {
  private store = new Map<string, { value: string; expiresAt: number }>();

  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: string, ttlSeconds: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}

class RedisBackedCacheService implements CacheService {
  private redis: Redis;
  private connected = false;
  private fallback = new InMemoryStore();

  constructor() {
    this.redis = new Redis(config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // don't hammer retries; rely on fallback
    });

    this.redis.on('connect', () => {
      this.connected = true;
      logger.info('Connected to Redis');
    });

    this.redis.on('error', (err) => {
      if (this.connected) logger.warn({ err }, 'Redis connection error; using in-memory fallback');
      this.connected = false;
    });

    // Skip the connection attempt in the automated test suite so tests
    // run hermetically (no network) and don't leave open handles.
    if (config.nodeEnv !== 'test') {
      this.redis.connect().catch(() => {
        logger.warn('Redis unavailable at startup; using in-memory cache fallback');
      });
    }
  }

  isRedisConnected(): boolean {
    return this.connected;
  }

  async get(key: string): Promise<string | null> {
    if (this.connected) {
      try {
        return await this.redis.get(key);
      } catch (err) {
        logger.warn({ err }, 'Redis GET failed, falling back to memory');
      }
    }
    return this.fallback.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    // Always mirror to in-memory store so a mid-flight Redis outage
    // doesn't lose the cache entirely.
    this.fallback.set(key, value, ttlSeconds);
    if (this.connected) {
      try {
        await this.redis.set(key, value, 'EX', ttlSeconds);
      } catch (err) {
        logger.warn({ err }, 'Redis SET failed, value kept in memory only');
      }
    }
  }
}

export const cacheService: CacheService = new RedisBackedCacheService();

export function buildCacheKey(url: string): string {
  return `audit:${url.toLowerCase()}`;
}
