import { describe, it, expect } from 'vitest';
import redis from '../utils/redis.js';

describe('Redis Store / Fallback Tests', () => {
  it('sets and gets keys correctly', async () => {
    await redis.set('test_key', 'hello_spil');
    const val = await redis.get('test_key');
    expect(val).toBe('hello_spil');
  });

  it('deletes keys correctly', async () => {
    await redis.set('del_key', 'to_delete');
    await redis.del('del_key');
    const val = await redis.get('del_key');
    expect(val).toBeNull();
  });

  it('handles TTL expiration in memory fallback', async () => {
    // Set 1-second TTL
    await redis.set('expiring_key', 'short_lived', 'EX', 1);
    const initial = await redis.get('expiring_key');
    expect(initial).toBe('short_lived');

    // Wait 1.1s for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));
    const expired = await redis.get('expiring_key');
    expect(expired).toBeNull();
  });

  it('supports pub/sub pattern in fallback', async () => {
    let received = null;
    await redis.subscribe('test_channel', (channel, msg) => {
      received = msg;
    });

    await redis.publish('test_channel', 'hello_pubsub');
    expect(received).toBe('hello_pubsub');
  });
});
