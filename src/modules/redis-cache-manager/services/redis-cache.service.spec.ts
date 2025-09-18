import { Cache } from 'cache-manager';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { MockConfigService } from 'tests/nestjs';
import { RedisCacheManagerConfig } from './redis-cache-manager.config';
import { RedisCacheService } from './redis-cache.service';
import { JsonRedisCacheAdapter } from '../adapters/json-redis.cache-adapter';
import { IRedisCacheAdapter } from '../types/types';
import { REDIS_CACHE_MANAGER_DEFAULT_OPTIONS } from '../types/constants';

describe(RedisCacheService.name, () => {
  const data = {
    status: 'ok',
  };
  const mockCacheAdapter = {
    encode: () => data,
    decode: () => 'decode',
  } as IRedisCacheAdapter;

  let redisCacheManagerConfig: RedisCacheManagerConfig;
  let cacheManager: Cache;
  let cacheAdapter: JsonRedisCacheAdapter;
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
        JsonRedisCacheAdapter,
        RedisCacheService,
      ],
    }).compile();

    redisCacheManagerConfig = module.get(RedisCacheManagerConfig);
    cacheManager = module.get(CACHE_MANAGER);
    cacheAdapter = module.get(JsonRedisCacheAdapter);
    service = module.get(RedisCacheService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(redisCacheManagerConfig).toBeDefined();
    expect(cacheManager).toBeDefined();
    expect(cacheAdapter).toBeDefined();
    expect(service).toBeDefined();
  });

  it('set', async () => {
    await service.set('key', 'value');
    await service.set('key', 'value', { adapter: false });
    await service.set('key', 'value', { adapter: false, ttl: 100 });
    await service.set('key', data);
    await service.set('key', data, { adapter: mockCacheAdapter });
    await service.set('key', data, { adapter: mockCacheAdapter, ttl: 100 });
    await expect(service.set('key', data, { adapter: false })).rejects.toThrow(
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
    const spyMockEncode = jest.spyOn(mockCacheAdapter, 'encode');
    const spyDefaultEncode = jest.spyOn(cacheAdapter, 'encode');
    const spyCacheGet = jest.spyOn(cacheManager, 'get').mockImplementation(async () => '[]');

    await service.get('key', { adapter: false });
    await service.get('key');
    await service.get('key', { adapter: mockCacheAdapter });

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
