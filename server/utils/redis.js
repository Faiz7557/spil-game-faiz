/**
 * Redis Client Abstraction with In-Memory Fallback
 * 
 * Provides distributed caching and pub/sub capabilities when REDIS_URL or REDIS_HOST
 * is set, while transparently falling back to an in-memory store in development/testing
 * or when Redis is unavailable.
 */

import Redis from 'ioredis';

class InMemoryRedisFallback {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
    this.subscribers = new Map();
    this.isCluster = false;
  }

  async get(key) {
    this._purgeExpired(key);
    return this.store.has(key) ? this.store.get(key) : null;
  }

  async set(key, value, mode, duration) {
    this.store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    if (mode === 'EX' && typeof duration === 'number') {
      this.ttls.set(key, Date.now() + duration * 1000);
    } else {
      this.ttls.delete(key);
    }
    return 'OK';
  }

  async del(key) {
    this.ttls.delete(key);
    return this.store.delete(key) ? 1 : 0;
  }

  async exists(key) {
    this._purgeExpired(key);
    return this.store.has(key) ? 1 : 0;
  }

  async publish(channel, message) {
    const subs = this.subscribers.get(channel) || [];
    subs.forEach(cb => {
      try {
        cb(channel, message);
      } catch (err) {
        console.error(`[InMemoryRedis] Subscriber error on channel ${channel}:`, err);
      }
    });
    return subs.length;
  }

  async subscribe(channel, callback) {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, []);
    }
    this.subscribers.get(channel).push(callback);
    return 'OK';
  }

  _purgeExpired(key) {
    if (this.ttls.has(key)) {
      if (Date.now() > this.ttls.get(key)) {
        this.store.delete(key);
        this.ttls.delete(key);
      }
    }
  }

  isReady() {
    return true;
  }
}

let redisInstance = null;
const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST;

if (process.env.NODE_ENV !== 'test' && (redisUrl || redisHost)) {
  try {
    const options = {
      host: redisHost || '127.0.0.1',
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('[Redis] Max connection retries reached. Operating in degraded mode.');
          return null;
        }
        return Math.min(times * 100, 1000);
      }
    };

    redisInstance = redisUrl ? new Redis(redisUrl, options) : new Redis(options);

    redisInstance.on('connect', () => {
      console.log('✅ [Redis] Connected successfully to Redis server');
    });

    redisInstance.on('error', (err) => {
      console.warn('⚠️ [Redis] Connection warning (falling back to memory):', err.message);
    });
  } catch (err) {
    console.warn('⚠️ [Redis] Failed to initialize Redis client. Falling back to in-memory store:', err.message);
    redisInstance = new InMemoryRedisFallback();
  }
} else {
  redisInstance = new InMemoryRedisFallback();
}

export const redis = redisInstance;
export default redis;
