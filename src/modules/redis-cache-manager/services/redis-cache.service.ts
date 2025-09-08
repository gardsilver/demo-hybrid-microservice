import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { RedisCacheFormatter } from '../types/types';
import { REDIS_CACHE_MANAGER_MAP_FORMATTERS_DI } from '../types/tokens';
import { MapRedisCacheFormatter } from '../types/module.options';
import { BaseRedisCacheFormatter } from '../cache-formatters/base-redis.cache-formatter';
import { RedisCacheManagerConfig } from './redis-cache-manager.config';

@Injectable()
export class RedisCacheService {
  constructor(
    private readonly redisCacheManagerConfig: RedisCacheManagerConfig,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly cacheFormatter: BaseRedisCacheFormatter,
    @Inject(REDIS_CACHE_MANAGER_MAP_FORMATTERS_DI) private readonly mapFormatters: MapRedisCacheFormatter,
  ) {}

  setCacheFormatter<T extends object = object>(cacheFormatter: RedisCacheFormatter<T>) {
    this.mapFormatters[cacheFormatter.type()] = cacheFormatter;
  }

  async setRaw(key: string, value: string, ttl?: number): Promise<void> {
    this.cacheManager.set(key, value, ttl ?? this.redisCacheManagerConfig.getTtl());
  }

  async getRaw(key: string): Promise<string | undefined> {
    return this.cacheManager.get<string>(key);
  }

  async set<T extends object = object>(key: string, params: { value: T; type?: string }, ttl?: number): Promise<void> {
    this.cacheManager.set(
      key,
      this.getCacheFormatter<T>(params.type).decode(params.value),
      ttl ?? this.redisCacheManagerConfig.getTtl(),
    );
  }

  async get<T extends object = object>(key: string, type?: string): Promise<T | undefined> {
    return this.getCacheFormatter<T>(type).encode(await this.cacheManager.get<string>(key));
  }

  async del(key: string): Promise<void> {
    this.cacheManager.del(key);
  }

  async clear(): Promise<void> {
    this.cacheManager.clear();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getCacheFormatter<T extends object = object>(type?: string): RedisCacheFormatter<T | any> {
    if (!type) {
      return this.cacheFormatter;
    }

    return this.mapFormatters[type] || this.cacheFormatter;
  }
}
