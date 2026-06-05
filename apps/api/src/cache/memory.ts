export interface CacheInterface {
  set(key: string, value: any, ttlSeconds: number): Promise<void>;
  get(key: string): Promise<any | null>;
  delete(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}

export class MemoryCache implements CacheInterface {
  private cache: Map<string, { value: any; expiresAt: number }> = new Map();

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  async get(key: string): Promise<any | null> {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}
