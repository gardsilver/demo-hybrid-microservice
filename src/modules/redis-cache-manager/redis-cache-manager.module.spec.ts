const redisClient = {
  on: jest.fn(),
} as unknown as RedisClientType;

const mockKeyv = {
  store: {
    client: redisClient,
  },
} as Keyv;

const mockCreateKeyv = jest.fn().mockImplementation(() => {
  return mockKeyv;
});

jest.mock('@keyv/redis', () => {
  const actualKeyvRedis = jest.requireActual('@keyv/redis');

  return Object.assign(
    {
      createKeyv: mockCreateKeyv,
    },
    actualKeyvRedis,
  );
});

import { Keyv, RedisClientType } from '@keyv/redis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { MockConfigService } from 'tests/nestjs';
import { TestModule, TestService } from 'tests/src/test-module';
import { RedisCacheManagerHealthIndicator, RedisCacheManagerModule, RedisCacheService } from './';
import { REDIS_CACHE_MANAGER_REDIS_CLIENT_DI } from './types/tokens';

describe(RedisCacheManagerModule.name, () => {
  let redisCacheService: RedisCacheService;

  describe('default', () => {
    let healthIndicator: RedisCacheManagerHealthIndicator;
    let redisClientProvider: RedisClientType;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [ConfigModule, ElkLoggerModule.forRoot(), PrometheusModule, RedisCacheManagerModule.forRoot()],
      })
        .overrideProvider(ConfigService)
        .useValue(new MockConfigService())
        .compile();

      redisCacheService = module.get(RedisCacheService);
      healthIndicator = module.get(RedisCacheManagerHealthIndicator);
      redisClientProvider = module.get(REDIS_CACHE_MANAGER_REDIS_CLIENT_DI);
    });

    it('init', async () => {
      expect(redisCacheService).toBeDefined();
      expect(healthIndicator).toBeDefined();
      expect(redisClientProvider).toBeDefined();
    });
  });

  describe('custom', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule,
          ElkLoggerModule.forRoot(),
          PrometheusModule,
          RedisCacheManagerModule.forRoot({
            imports: [TestModule],
            providers: [TestService],
            redisClientOptions: {
              useValue: {},
            },
          }),
        ],
      })
        .overrideProvider(ConfigService)
        .useValue(new MockConfigService())
        .compile();

      redisCacheService = module.get(RedisCacheService);
    });

    it('init', async () => {
      expect(redisCacheService).toBeDefined();
    });
  });
});
