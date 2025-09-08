import { Cache } from 'cache-manager';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { MockConfigService } from 'tests/nestjs';
import { RedisCacheManagerConfig } from './redis-cache-manager.config';
import { RedisCacheService } from './redis-cache.service';
import { JsonRedisCacheFormatter } from '../cache-formatters/json-redis.cache-formatter';
import { IRedisCacheFormatter } from '../types/types';
import { REDIS_CACHE_MANAGER_DEFAULT_OPTIONS } from '../types/constants';

describe(RedisCacheService.name, () => {
  const data = {
    status: 'ok',
  };
  const mockCacheFormatter = {
    encode: () => data,
    decode: () => 'decode',
  } as IRedisCacheFormatter;

  let redisCacheManagerConfig: RedisCacheManagerConfig;
  let cacheManager: Cache;
  let cacheFormatter: JsonRedisCacheFormatter;
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
        JsonRedisCacheFormatter,
        RedisCacheService,
      ],
    }).compile();

    redisCacheManagerConfig = module.get(RedisCacheManagerConfig);
    cacheManager = module.get(CACHE_MANAGER);
    cacheFormatter = module.get(JsonRedisCacheFormatter);
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

  it('set', async () => {
    await service.set('key', 'value');
    await service.set('key', 'value', { formatter: false });
    await service.set('key', 'value', { formatter: false, ttl: 100 });
    await service.set('key', data);
    await service.set('key', data, { formatter: mockCacheFormatter });
    await service.set('key', data, { formatter: mockCacheFormatter, ttl: 100 });
    await expect(service.set('key', data, { formatter: false })).rejects.toThrow(
      new Error('RedisCacheService: value должно быть строкой.'),
    );

    expect(cacheManager.set).toHaveBeenCalledTimes(6);
    expect(cacheManager.set).toHaveBeenCalledWith('key', '"value"', REDIS_CACHE_MANAGER_DEFAULT_OPTIONS.ttl);

    expect(cacheManager.set).toHaveBeenCalledWith('key', 'value', REDIS_CACHE_MANAGER_DEFAULT_OPTIONS.ttl);
    expect(cacheManager.set).toHaveBeenCalledWith('key', 'value', 100);
    expect(cacheManager.set).toHaveBeenCalledWith('key', '{"status":"ok"}', REDIS_CACHE_MANAGER_DEFAULT_OPTIONS.ttl);
    expect(cacheManager.set).toHaveBeenCalledWith('key', 'decode', REDIS_CACHE_MANAGER_DEFAULT_OPTIONS.ttl);
    expect(cacheManager.set).toHaveBeenCalledWith('key', 'decode', 100);
  });

  it('get', async () => {
    const spyMockEncode = jest.spyOn(mockCacheFormatter, 'encode');
    const spyDefaultEncode = jest.spyOn(cacheFormatter, 'encode');
    const spyCacheGet = jest.spyOn(cacheManager, 'get').mockImplementation(async () => '[]');

    await service.get('key', { formatter: false });
    await service.get('key');
    await service.get('key', { formatter: mockCacheFormatter });

    expect(spyCacheGet).toHaveBeenCalledTimes(3);
    expect(spyCacheGet).toHaveBeenCalledWith('key');

    expect(spyMockEncode).toHaveBeenCalledTimes(1);
    expect(spyMockEncode).toHaveBeenCalledWith('[]');

    expect(spyDefaultEncode).toHaveBeenCalledTimes(1);
    expect(spyDefaultEncode).toHaveBeenCalledWith('[]');
  });

  it('del', async () => {
    await service.del('key');

    expect(cacheManager.del).toHaveBeenCalledTimes(1);
    expect(cacheManager.del).toHaveBeenCalledWith('key');
  });

  it('clear', async () => {
    await service.clear();

    expect(cacheManager.clear).toHaveBeenCalledTimes(1);
  });
});
