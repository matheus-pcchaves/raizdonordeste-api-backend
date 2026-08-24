/** Port: serviço de cache in-memory ou Redis */
export interface ICache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlSeconds?: number): void;
  del(key: string): void;
  flush(): void;
}
