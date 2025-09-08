import { ConfigService } from '@nestjs/config';
import { MockConfigService } from 'tests/nestjs';
import { RedisCacheManagerConfig } from './redis-cache-manager.config';
import { REDIS_CACHE_MANAGER_DEFAULT_OPTIONS } from '../types/constants';

describe(RedisCacheManagerConfig.name, () => {
  let configService: ConfigService;
  let redisCacheManagerConfig: RedisCacheManagerConfig;

  beforeEach(async () => {
    configService = undefined;
    redisCacheManagerConfig = undefined;
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('default', async () => {
    configService = new MockConfigService() as undefined as ConfigService;
    redisCacheManagerConfig = new RedisCacheManagerConfig(configService);

    expect({
      getTtl: redisCacheManagerConfig.getTtl(),
      getMaxDelayBeforeReconnect: redisCacheManagerConfig.getMaxDelayBeforeReconnect(),
      getCountForResetReconnectStrategy: redisCacheManagerConfig.getCountForResetReconnectStrategy(),
      getRedisHost: redisCacheManagerConfig.getRedisHost(),
      getRedisPort: redisCacheManagerConfig.getRedisPort(),
    }).toEqual({
      getTtl: REDIS_CACHE_MANAGER_DEFAULT_OPTIONS.ttl,
      getMaxDelayBeforeReconnect: REDIS_CACHE_MANAGER_DEFAULT_OPTIONS.maxDelayBeforeReconnect,
      getCountForResetReconnectStrategy: REDIS_CACHE_MANAGER_DEFAULT_OPTIONS.countForResetReconnectStrategy,
      getRedisHost: REDIS_CACHE_MANAGER_DEFAULT_OPTIONS.redisHost,
      getRedisPort: undefined,
    });
  });

  it('custom', async () => {
    configService = new MockConfigService({
      REDIS_CACHE_MANAGER_TTL: '100',
      REDIS_CACHE_MANAGER_MAX_DELAY_BEFORE_RECONNECT: '200',
      REDIS_CACHE_MANAGER_COUNT_FOR_RESET_RECONNECT_STRATEGY: '10',
      REDIS_CACHE_MANAGER_HOST: 'localhost',
      REDIS_CACHE_MANAGER_PORT: '3002',
    }) as undefined as ConfigService;
    redisCacheManagerConfig = new RedisCacheManagerConfig(configService);

    expect({
      getTtl: redisCacheManagerConfig.getTtl(),
      getMaxDelayBeforeReconnect: redisCacheManagerConfig.getMaxDelayBeforeReconnect(),
      getCountForResetReconnectStrategy: redisCacheManagerConfig.getCountForResetReconnectStrategy(),
      getRedisHost: redisCacheManagerConfig.getRedisHost(),
      getRedisPort: redisCacheManagerConfig.getRedisPort(),
    }).toEqual({
      getTtl: 100,
      getMaxDelayBeforeReconnect: 200,
      getCountForResetReconnectStrategy: 10,
      getRedisHost: 'localhost',
      getRedisPort: 3002,
    });
  });
});
