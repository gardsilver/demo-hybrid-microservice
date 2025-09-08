import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigServiceHelper } from 'src/modules/common';
import { REDIS_CACHE_MANAGER_DEFAULT_OPTIONS } from '../types/constants';

@Injectable()
export class RedisCacheManagerConfig {
  private ttl: number;
  private maxDelayBeforeReconnect: number;
  private countForResetReconnectStrategy: number;
  private redisHost: string;
  private redisPort?: number;

  constructor(configService: ConfigService) {
    const configServiceHelper = new ConfigServiceHelper(configService, 'REDIS_CACHE_MANAGER_');

    this.ttl = configServiceHelper.parseInt('TTL', REDIS_CACHE_MANAGER_DEFAULT_OPTIONS.ttl);
    this.maxDelayBeforeReconnect = configServiceHelper.parseInt(
      'MAX_DELAY_BEFORE_RECONNECT',
      REDIS_CACHE_MANAGER_DEFAULT_OPTIONS.maxDelayBeforeReconnect,
    );
    this.countForResetReconnectStrategy = configServiceHelper.parseInt(
      'COUNT_FOR_RESET_RECONNECT_STRATEGY',
      REDIS_CACHE_MANAGER_DEFAULT_OPTIONS.countForResetReconnectStrategy,
    );
    this.redisHost = configService
      .get<string>(configServiceHelper.getKeyName('HOST'), REDIS_CACHE_MANAGER_DEFAULT_OPTIONS.redisHost)
      .trim();
    this.redisPort = configServiceHelper.parseInt('PORT', undefined);
  }

  getTtl(): number {
    return this.ttl;
  }

  getMaxDelayBeforeReconnect(): number {
    return this.maxDelayBeforeReconnect;
  }

  getCountForResetReconnectStrategy(): number {
    return this.countForResetReconnectStrategy;
  }

  getRedisHost(): string {
    return this.redisHost;
  }

  getRedisPort(): number | undefined {
    return this.redisPort;
  }
}
