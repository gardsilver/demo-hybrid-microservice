import { IElkLoggerService } from 'src/modules/elk-logger';
import { PrometheusManager } from 'src/modules/prometheus';
import { RedisCacheManagerConfig } from '../services/redis-cache-manager.config';
import { REDIS_CLIENT_RECONNECT_FAILED } from '../types/metrics';

export type ReconnectStrategyFunction = (retries: number, cause: Error) => false | Error | number;

export const defaultRedisReconnectStrategyBuilder = {
  build(
    logger: IElkLoggerService,
    prometheusManager: PrometheusManager,
    redisCacheManagerConfig: RedisCacheManagerConfig,
  ): ReconnectStrategyFunction {
    let attempts: number = 1;

    return (retries: number, cause: Error): false | Error | number => {
      ++attempts;
      if (attempts > redisCacheManagerConfig.getCountForResetReconnectStrategy()) {
        logger.error('Redis client reconnect filed', {
          payload: {
            retries,
            cause,
          },
        });
        attempts = 1;

        prometheusManager.counter().increment(REDIS_CLIENT_RECONNECT_FAILED, {
          labels: {},
        });
      }

      const backoff = Math.min(2 ** attempts * 100, redisCacheManagerConfig.getMaxDelayBeforeReconnect());

      const jitter = (Math.random() - 0.5) * 100;

      return backoff + jitter;
    };
  },
};
