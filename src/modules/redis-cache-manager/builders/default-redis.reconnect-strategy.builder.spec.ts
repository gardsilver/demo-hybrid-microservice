import { ConfigService } from '@nestjs/config';
import { IElkLoggerService } from 'src/modules/elk-logger';
import { ICounterService, PrometheusManager } from 'src/modules/prometheus';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { RedisCacheManagerConfig } from '../services/redis-cache-manager.config';
import { defaultRedisReconnectStrategyBuilder } from './default-redis.reconnect-strategy.builder';
import { REDIS_CLIENT_RECONNECT_FAILED } from '../types/metrics';

describe('defaultRedisReconnectStrategyBuilder', () => {
  let logger: IElkLoggerService;
  let counterService: ICounterService;
  let prometheusManager: PrometheusManager;
  let redisCacheManagerConfig: RedisCacheManagerConfig;

  beforeEach(async () => {
    logger = new MockElkLoggerService();
    counterService = {
      increment: jest.fn(),
    } as undefined as ICounterService;

    prometheusManager = {
      counter: () => counterService,
    } as undefined as PrometheusManager;

    redisCacheManagerConfig = new RedisCacheManagerConfig(new MockConfigService() as undefined as ConfigService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('build', async () => {
    const reconnectStrategyFunction = defaultRedisReconnectStrategyBuilder.build(
      logger,
      prometheusManager,
      redisCacheManagerConfig,
    );

    expect(reconnectStrategyFunction).toBeDefined();
    expect(typeof reconnectStrategyFunction).toBe('function');
  });

  describe('ReconnectStrategyFunction', () => {
    let cause: Error;
    beforeEach(async () => {
      cause = new Error();
      jest.spyOn(redisCacheManagerConfig, 'getCountForResetReconnectStrategy').mockImplementation(() => 2);
      jest.spyOn(redisCacheManagerConfig, 'getMaxDelayBeforeReconnect').mockImplementation(() => 2000);
      jest.spyOn(Math, 'random').mockImplementation(() => 0.5);
    });

    it('build', async () => {
      const spyLog = jest.spyOn(logger, 'error');
      const spyIncrement = jest.spyOn(counterService, 'increment');

      const reconnectStrategyFunction = defaultRedisReconnectStrategyBuilder.build(
        logger,
        prometheusManager,
        redisCacheManagerConfig,
      );

      expect(reconnectStrategyFunction(0, cause)).toBe(400);
      expect(spyLog).toHaveBeenCalledTimes(0);
      expect(spyIncrement).toHaveBeenCalledTimes(0);

      expect(reconnectStrategyFunction(0, cause)).toBe(200);

      expect(spyLog).toHaveBeenCalledTimes(1);
      expect(spyLog).toHaveBeenCalledWith('Redis client reconnect filed', {
        payload: {
          retries: 0,
          cause,
        },
      });
      expect(spyIncrement).toHaveBeenCalledTimes(1);
      expect(spyIncrement).toHaveBeenCalledWith(REDIS_CLIENT_RECONNECT_FAILED, {
        labels: {},
      });
    });
  });
});
