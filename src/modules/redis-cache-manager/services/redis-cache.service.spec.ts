import { Cache } from 'cache-manager';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { MockConfigService } from 'tests/nestjs';
import { RedisCacheManagerConfig } from './redis-cache-manager.config';
import { RedisCacheService } from './redis-cache.service';
import { BaseRedisCacheFormatter } from '../cache-formatters/base-redis.cache-formatter';
import { REDIS_CACHE_MANAGER_MAP_FORMATTERS_DI } from '../types/tokens';
import { RedisCacheFormatter } from '../types/types';
import { REDIS_CACHE_MANAGER_DEFAULT_OPTIONS } from '../types/constants';

describe(RedisCacheService.name, () => {
  const data = {
    status: 'ok',
  };
  const mockCacheFormatter = {
    type: () => 'type',
    encode: () => data,
    decode: () => 'decode',
  } as RedisCacheFormatter;

  let redisCacheManagerConfig: RedisCacheManagerConfig;
  let cacheManager: Cache;
  let cacheFormatter: BaseRedisCacheFormatter;
  let service: RedisCacheService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [],
      providers: [
        {
          provide: ConfigService,
          useValue: new MockConfigService(),
        },
        RedisCacheManagerConfig,
        {
          provide: CACHE_MANAGER,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
            clear: jest.fn(),
          },
        },
        BaseRedisCacheFormatter,
        {
          provide: REDIS_CACHE_MANAGER_MAP_FORMATTERS_DI,
          useValue: {},
        },
        RedisCacheService,
      ],
    }).compile();

    redisCacheManagerConfig = module.get(RedisCacheManagerConfig);
    cacheManager = module.get(CACHE_MANAGER);
    cacheFormatter = module.get(BaseRedisCacheFormatter);
    service = module.get(RedisCacheService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(redisCacheManagerConfig).toBeDefined();
    expect(cacheManager).toBeDefined();
    expect(cacheFormatter).toBeDefined();
    expect(service).toBeDefined();
  });

  it('setCacheFormatter', async () => {
    service.setCacheFormatter(mockCacheFormatter);

    expect(service['mapFormatters']).toEqual({
      type: mockCacheFormatter,
    });
  });

  it('setRaw', async () => {
    await service.setRaw('key', 'value');
    await service.setRaw('key', 'value', 100);

    expect(cacheManager.set).toHaveBeenCalledTimes(2);
    expect(cacheManager.set).toHaveBeenCalledWith('key', 'value', REDIS_CACHE_MANAGER_DEFAULT_OPTIONS.ttl);
    expect(cacheManager.set).toHaveBeenCalledWith('key', 'value', 100);
  });

  it('getRaw', async () => {
    await service.getRaw('key');

    expect(cacheManager.get).toHaveBeenCalledTimes(1);
    expect(cacheManager.get).toHaveBeenCalledWith('key');
  });

  it('set', async () => {
    service.setCacheFormatter(mockCacheFormatter);

    await service.set('key', { value: data });
    await service.set('key', { value: data, type: 'type' });
    await service.set('key', { value: data, type: 'type' }, 100);

    expect(cacheManager.set).toHaveBeenCalledTimes(3);
    expect(cacheManager.set).toHaveBeenCalledWith('key', '{"status":"ok"}', REDIS_CACHE_MANAGER_DEFAULT_OPTIONS.ttl);
    expect(cacheManager.set).toHaveBeenCalledWith('key', 'decode', REDIS_CACHE_MANAGER_DEFAULT_OPTIONS.ttl);
    expect(cacheManager.set).toHaveBeenCalledWith('key', 'decode', 100);
  });

  it('get', async () => {
    const spyMockEncode = jest.spyOn(mockCacheFormatter, 'encode');
    const spyDefaultEncode = jest.spyOn(cacheFormatter, 'encode');
    const spyCacheGet = jest.spyOn(cacheManager, 'get').mockImplementation(async () => '[]');

    service.setCacheFormatter(mockCacheFormatter);

    service.get('key');
    await service.get('key', 'type');

    expect(spyCacheGet).toHaveBeenCalledTimes(2);
    expect(spyCacheGet).toHaveBeenCalledWith('key');

    expect(spyMockEncode).toHaveBeenCalledTimes(1);
    expect(spyMockEncode).toHaveBeenCalledWith('[]');

    expect(spyDefaultEncode).toHaveBeenCalledTimes(1);
    expect(spyDefaultEncode).toHaveBeenCalledWith('[]');
  });

  it('del', async () => {
    service.setCacheFormatter(mockCacheFormatter);

    await service.del('key');

    expect(cacheManager.del).toHaveBeenCalledTimes(1);
    expect(cacheManager.del).toHaveBeenCalledWith('key');
  });

  it('clear', async () => {
    service.setCacheFormatter(mockCacheFormatter);

    await service.clear();

    expect(cacheManager.clear).toHaveBeenCalledTimes(1);
  });
});
