const redisClient = {
  on: jest.fn(),
} as undefined as RedisClientType;

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
import { MockConfigService } from 'tests/nestjs';
import { TestModule, TestService } from 'tests/src/test-module';
import { RedisCacheManagerModule } from './redis-cache-manager.module';
import { RedisCacheService } from './services/redis-cache.service';
import { PrometheusModule } from '../prometheus';
import { RedisCacheFormatter } from './types/types';

const mockData = {
  status: 'ok',
};

class MockCacheFormatter extends RedisCacheFormatter<object> {
  public static type = 'type';

  constructor(private readonly testService: TestService) {
    super();
  }

  public type(): string {
    return MockCacheFormatter.type;
  }

  public encode(): object {
    return mockData;
  }
  public decode(): string {
    return 'decode';
  }
}

describe(RedisCacheManagerModule.name, () => {
  let mockCacheFormatter: MockCacheFormatter;
  let redisCacheService: RedisCacheService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule,
        ElkLoggerModule.forRoot(),
        PrometheusModule,
        RedisCacheManagerModule.forRoot({
          imports: [TestModule],
          providers: [TestService],
          mapFormatters: {
            inject: [TestService],
            useFactory: (testService: TestService) => {
              mockCacheFormatter = new MockCacheFormatter(testService);

              return { [MockCacheFormatter.type]: mockCacheFormatter };
            },
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
    expect(redisCacheService['mapFormatters']).toEqual({
      type: mockCacheFormatter,
    });
  });
});
