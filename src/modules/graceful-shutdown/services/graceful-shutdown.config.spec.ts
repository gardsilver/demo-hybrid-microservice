import { ConfigService } from '@nestjs/config';
import { MockConfigService } from 'tests/nestjs';
import { GracefulShutdownConfig } from './graceful-shutdown.config';
import { GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS } from '../types/constants';

describe(GracefulShutdownConfig.name, () => {
  it('default', async () => {
    const configService = new MockConfigService() as undefined as ConfigService;
    const gracefulShutdownConfig = new GracefulShutdownConfig(configService);

    expect({
      getTimeoutBeforeDestroy: gracefulShutdownConfig.getTimeoutBeforeDestroy(),
      getTimeoutDestroy: gracefulShutdownConfig.getTimeoutDestroy(),
      getTimeoutAfterDestroy: gracefulShutdownConfig.getTimeoutAfterDestroy(),
      getGracePeriod: gracefulShutdownConfig.getGracePeriod(),
      getDestroySignal: gracefulShutdownConfig.getDestroySignal(),
      getIsEnabled: gracefulShutdownConfig.getIsEnabled(),
    }).toEqual({
      getTimeoutBeforeDestroy: GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS.timeoutBeforeDestroy,
      getTimeoutDestroy: GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS.timeoutDestroy,
      getTimeoutAfterDestroy: GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS.timeoutAfterDestroy,
      getGracePeriod: GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS.gracePeriod,
      getDestroySignal: 'SIGTERM',
      getIsEnabled: true,
    });
  });

  it('custom', async () => {
    const configService = new MockConfigService({
      GRACEFUL_SHUTDOWN_TIMEOUT_ON_BEFORE_DESTROY: String(10_000),
      GRACEFUL_SHUTDOWN_TIMEOUT_ON_DESTROY: String(20_000),
      GRACEFUL_SHUTDOWN_TIMEOUT_ON_AFTER_DESTROY: String(30_000),
      GRACEFUL_SHUTDOWN_GRACE_PERIOD: String(40_000),
      GRACEFUL_SHUTDOWN_DESTROY_SIGNAL: 'SIGINT',
      GRACEFUL_SHUTDOWN_ENABLED: 'no',
    }) as undefined as ConfigService;
    const gracefulShutdownConfig = new GracefulShutdownConfig(configService);

    expect({
      getTimeoutBeforeDestroy: gracefulShutdownConfig.getTimeoutBeforeDestroy(),
      getTimeoutDestroy: gracefulShutdownConfig.getTimeoutDestroy(),
      getTimeoutAfterDestroy: gracefulShutdownConfig.getTimeoutAfterDestroy(),
      getGracePeriod: gracefulShutdownConfig.getGracePeriod(),
      getDestroySignal: gracefulShutdownConfig.getDestroySignal(),
      getIsEnabled: gracefulShutdownConfig.getIsEnabled(),
    }).toEqual({
      getTimeoutBeforeDestroy: 10_000,
      getTimeoutDestroy: 20_000,
      getTimeoutAfterDestroy: 30_000,
      getGracePeriod: 40_000,
      getDestroySignal: 'SIGINT',
      getIsEnabled: false,
    });
  });

  it('failed', async () => {
    const configService = new MockConfigService({
      GRACEFUL_SHUTDOWN_DESTROY_SIGNAL: 'test',
    }) as undefined as ConfigService;

    expect(() => {
      return new GracefulShutdownConfig(configService);
    }).toThrow(new Error("Не корректно задан параметр: GRACEFUL_SHUTDOWN_DESTROY_SIGNAL='test'."));
  });
});
