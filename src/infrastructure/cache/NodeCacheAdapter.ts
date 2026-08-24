import NodeCache from 'node-cache';
import { ICache } from '../../application/ports/ICache';

export class NodeCacheAdapter implements ICache {
  private readonly cache: NodeCache;

  constructor(defaultTtlSeconds = 120) {
    this.cache = new NodeCache({
      stdTTL: defaultTtlSeconds,
      checkperiod: 60,
      useClones: false,
    });
  }

  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  set<T>(key: string, value: T, ttlSeconds?: number): void {
    if (ttlSeconds !== undefined) {
      this.cache.set(key, value, ttlSeconds);
    } else {
      this.cache.set(key, value);
    }
  }

  del(key: string): void {
    this.cache.del(key);
  }

  flush(): void {
    this.cache.flushAll();
  }
}
