import { RedisCacheInstanceService } from '../services/redis-cache.instance-service';
import { RedisCacheService } from '../services/redis-cache.service';
import { IRedisCacheAdapter } from '../types/types';
import { RedisCacheOnAsyncMethod } from './redis-cache.on-method';

const spyCacheKeyAdapter = jest.fn().mockImplementation((query: string) => query);
const cacheAdapter: IRedisCacheAdapter = {
  encode: () => {},
  decode: () => {},
} as undefined as IRedisCacheAdapter;

describe(RedisCacheOnAsyncMethod.name, () => {
  let spyGet;
  let spySet;
  let mockResult;
  let cacheService: RedisCacheService;

  beforeEach(async () => {
    mockResult = { status: 'ok' };
    spyGet = jest.fn().mockImplementation(() => mockResult);
    spySet = jest.fn();
    cacheService = {
      get: spyGet,
      set: spySet,
    } as undefined as RedisCacheService;

    RedisCacheInstanceService.getInstance = () => undefined;

    jest.clearAllMocks();
  });

  describe('success', () => {
    class TestService {
      @RedisCacheOnAsyncMethod({
        cacheKeyAdapter: spyCacheKeyAdapter,
        adapter: cacheAdapter,
        ttl: 10_000,
      })
      async run(query: string) {
        return {
          status: query,
        };
      }
    }

    let testService: TestService;

    beforeEach(async () => {
      testService = new TestService();
    });

    it('Not use RedisCacheService', async () => {
      expect(RedisCacheInstanceService.getInstance()).toBeUndefined();
      const result = await testService.run('start');

      expect(result).toEqual({ status: 'start' });
      expect(spyCacheKeyAdapter).toHaveBeenCalledTimes(1);
      expect(spyCacheKeyAdapter).toHaveBeenCalledWith('start');

      expect(spyGet).toHaveBeenCalledTimes(0);
      expect(spySet).toHaveBeenCalledTimes(0);
    });

    it('get value from RedisCacheService', async () => {
      RedisCacheInstanceService.getInstance = () => cacheService;

      expect(RedisCacheInstanceService.getInstance()).toBeDefined();
      const result = await testService.run('start');

      expect(result).toEqual(mockResult);
      expect(spyCacheKeyAdapter).toHaveBeenCalledTimes(1);
      expect(spyCacheKeyAdapter).toHaveBeenCalledWith('start');

      expect(spyGet).toHaveBeenCalledTimes(1);
      expect(spyGet).toHaveBeenCalledWith('start', { adapter: cacheAdapter });
      expect(spySet).toHaveBeenCalledTimes(0);
    });

    it('set value to RedisCacheService', async () => {
      spyGet = jest.fn().mockImplementation(() => undefined);
      cacheService.get = spyGet;
      RedisCacheInstanceService.getInstance = () => cacheService;

      expect(RedisCacheInstanceService.getInstance()).toBeDefined();
      const result = await testService.run('start');

      expect(result).toEqual({ status: 'start' });
      expect(spyCacheKeyAdapter).toHaveBeenCalledTimes(1);
      expect(spyCacheKeyAdapter).toHaveBeenCalledWith('start');

      expect(spyGet).toHaveBeenCalledTimes(1);
      expect(spyGet).toHaveBeenCalledWith('start', { adapter: cacheAdapter });
      expect(spySet).toHaveBeenCalledTimes(1);
      expect(spySet).toHaveBeenCalledWith('start', { status: 'start' }, { adapter: cacheAdapter, ttl: 10_000 });
    });
  });

  describe('failed', () => {
    let mockError;

    class TestService {
      @RedisCacheOnAsyncMethod({
        cacheKeyAdapter: spyCacheKeyAdapter,
        adapter: cacheAdapter,
        ttl: 10_000,
      })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async run(query: string) {
        throw mockError;
      }
    }

    let testService: TestService;

    beforeEach(async () => {
      mockError = new Error('Test error');
      testService = new TestService();
    });

    it('Not use RedisCacheService', async () => {
      expect(RedisCacheInstanceService.getInstance()).toBeUndefined();
      let result;
      try {
        result = await testService.run('start');
      } catch (err) {
        result = err;
      }

      expect(result).toEqual(mockError);
      expect(spyCacheKeyAdapter).toHaveBeenCalledTimes(1);
      expect(spyCacheKeyAdapter).toHaveBeenCalledWith('start');

      expect(spyGet).toHaveBeenCalledTimes(0);
      expect(spySet).toHaveBeenCalledTimes(0);
    });

    it('get value from RedisCacheService', async () => {
      RedisCacheInstanceService.getInstance = () => cacheService;

      expect(RedisCacheInstanceService.getInstance()).toBeDefined();
      let result;
      try {
        result = await testService.run('start');
      } catch (err) {
        result = err;
      }

      expect(result).toEqual(mockResult);
      expect(spyCacheKeyAdapter).toHaveBeenCalledTimes(1);
      expect(spyCacheKeyAdapter).toHaveBeenCalledWith('start');

      expect(spyGet).toHaveBeenCalledTimes(1);
      expect(spyGet).toHaveBeenCalledWith('start', { adapter: cacheAdapter });
      expect(spySet).toHaveBeenCalledTimes(0);
    });

    it('set value to RedisCacheService', async () => {
      spyGet = jest.fn().mockImplementation(() => undefined);
      cacheService.get = spyGet;
      RedisCacheInstanceService.getInstance = () => cacheService;

      expect(RedisCacheInstanceService.getInstance()).toBeDefined();
      let result;
      try {
        result = await testService.run('start');
      } catch (err) {
        result = err;
      }

      expect(result).toEqual(mockError);
      expect(spyCacheKeyAdapter).toHaveBeenCalledTimes(1);
      expect(spyCacheKeyAdapter).toHaveBeenCalledWith('start');

      expect(spyGet).toHaveBeenCalledTimes(1);
      expect(spyGet).toHaveBeenCalledWith('start', { adapter: cacheAdapter });
      expect(spySet).toHaveBeenCalledTimes(0);
    });
  });
});
