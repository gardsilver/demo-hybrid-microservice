import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { IRedisCacheAdapter } from '../types/types';
import { JsonRedisCacheAdapter } from '../adapters/json-redis.cache-adapter';
import { RedisCacheManagerConfig } from './redis-cache-manager.config';

@Injectable()
export class RedisCacheService {
  constructor(
    private readonly redisCacheManagerConfig: RedisCacheManagerConfig,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly jsonRedisCacheAdapter: JsonRedisCacheAdapter,
  ) {}

  async set<T extends object = object>(
    key: string,
    value: T | string,
    options?: { adapter: IRedisCacheAdapter<T> | false; ttl?: number },
  ): Promise<void | never> {
    if (options?.adapter === false) {
      if (typeof value === 'string') {
        this.cacheManager.set(key, value, options?.ttl ?? this.redisCacheManagerConfig.getTtl());

        return;
      }

      throw new Error('RedisCacheService: value должно быть строкой.');
    }

    const formatter = options?.adapter ?? this.jsonRedisCacheAdapter;

    await this.cacheManager.set(key, formatter.decode(value), options?.ttl ?? this.redisCacheManagerConfig.getTtl());
  }

  async get<T extends object = object>(
    key: string,
    options?: { adapter?: IRedisCacheAdapter<T> | false },
  ): Promise<T | string | undefined> {
    if (options?.adapter === false) {
      return this.cacheManager.get<string>(key);
    }

    const formatter = options?.adapter ?? this.jsonRedisCacheAdapter;

    return formatter.encode(await this.cacheManager.get<string>(key));
  }

  async del(key: string): Promise<void> {
    this.cacheManager.del(key);
  }

  async clear(): Promise<void> {
    this.cacheManager.clear();
  }
}
