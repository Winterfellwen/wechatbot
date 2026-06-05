import Redis from 'ioredis';

export interface RedisCacheConfig {
  url: string;
}

export class RedisCache {
  private client: Redis;
  private connected = false;

  constructor(config: RedisCacheConfig) {
    this.client = new Redis(config.url, {
      maxRetriesPerRequest: 3,
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
    this.connected = false;
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.client.setex(key, ttlSeconds, serialized);
  }

  async get(key: string): Promise<any | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    return JSON.parse(value);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }
}
