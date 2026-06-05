import { RedisCache } from './redis';

// Helper to check if Redis is available
async function isRedisAvailable(): Promise<boolean> {
  try {
    const cache = new RedisCache({ url: 'redis://localhost:6379' });
    await cache.connect();
    await cache.disconnect();
    return true;
  } catch {
    return false;
  }
}

describe('Redis Cache', () => {
  let cache: RedisCache;
  let redisAvailable = false;

  beforeAll(async () => {
    redisAvailable = await isRedisAvailable();
  });

  afterEach(async () => {
    if (cache) {
      await cache.disconnect();
      cache = null as any;
    }
  });

  it('should set and get value', async () => {
    if (!redisAvailable) {
      console.log('Skipping: Redis not available');
      return;
    }

    cache = new RedisCache({ url: 'redis://localhost:6379' });
    await cache.connect();

    await cache.set('test-key', { data: 'test-value' }, 60);
    const value = await cache.get('test-key');
    expect(value).toEqual({ data: 'test-value' });
  });

  it('should expire keys', async () => {
    if (!redisAvailable) {
      console.log('Skipping: Redis not available');
      return;
    }

    cache = new RedisCache({ url: 'redis://localhost:6379' });
    await cache.connect();

    await cache.set('expire-key', 'value', 1); // 1 second TTL
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const value = await cache.get('expire-key');
    expect(value).toBeNull();
  });

  it('should delete keys', async () => {
    if (!redisAvailable) {
      console.log('Skipping: Redis not available');
      return;
    }

    cache = new RedisCache({ url: 'redis://localhost:6379' });
    await cache.connect();

    await cache.set('delete-me', 'value', 60);
    await cache.delete('delete-me');
    const value = await cache.get('delete-me');
    expect(value).toBeNull();
  });
});
