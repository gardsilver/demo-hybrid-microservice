import { Test } from '@nestjs/testing';
import { DiscoveryModule } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { MetadataExplorer } from 'src/modules/common';
import { TimeoutError } from 'src/modules/date-timestamp';
import { ELK_LOGGER_SERVICE_BUILDER_DI, ElkLoggerModule, IElkLoggerService } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { TestShutdownService } from 'tests/modules/graceful-shutdown';
import { GracefulShutdownConfig } from './graceful-shutdown.config';
import { GracefulShutdownService } from './graceful-shutdown.service';
import { GracefulShutdownEventHandler } from './graceful-shutdown.event-handler';
import { GracefulShutdownCountHandler } from './graceful-shutdown.count-handle';
import { GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS } from '../types/constants';
import { GracefulShutdownMessages } from '../types/messages';
import { GracefulShutdownEvents } from '../types/types';

describe(GracefulShutdownService.name, () => {
  let logger: IElkLoggerService;
  let eventHandler: GracefulShutdownEventHandler;
  let countHandler: GracefulShutdownCountHandler;
  let service: GracefulShutdownService;
  let testShutdownService: TestShutdownService;
  let spyExit;

  beforeEach(async () => {
    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      imports: [DiscoveryModule, ElkLoggerModule.forRoot(), PrometheusModule],
      providers: [
        {
          provide: ConfigService,
          useValue: new MockConfigService(),
        },
        GracefulShutdownConfig,
        MetadataExplorer,
        GracefulShutdownEventHandler,
        GracefulShutdownCountHandler,
        GracefulShutdownService,
        TestShutdownService,
      ],
    })
      .overrideProvider(ELK_LOGGER_SERVICE_BUILDER_DI)
      .useValue({
        build: () => logger,
      })
      .compile();

    await module.init();

    eventHandler = module.get(GracefulShutdownEventHandler);
    countHandler = module.get(GracefulShutdownCountHandler);
    service = module.get(GracefulShutdownService);
    testShutdownService = module.get(TestShutdownService);

    spyExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      return null as never;
    });

    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('init', async () => {
    expect(eventHandler).toBeDefined();
    expect(countHandler).toBeDefined();
    expect(service).toBeDefined();
    expect(testShutdownService).toBeDefined();
    expect(service.isActive()).toBeFalsy();
  });

  describe('beforeApplicationShutdown', () => {
    it('ignore', async () => {
      service.beforeApplicationShutdown('SIGSTOP');

      expect(spyExit).toHaveBeenCalledTimes(0);
      expect(service.isActive()).toBeFalsy();
    });

    it('Должен вызвать все методы завершения', async () => {
      const spyEmit = jest.spyOn(eventHandler, 'emit');
      const spyTotalCountActiveMethods = jest.spyOn(countHandler, 'getTotalCountActiveMethods');
      const spyLoggerInfo = jest.spyOn(logger, 'info');

      jest.advanceTimersByTimeAsync(
        GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS.timeoutBeforeDestroy +
          GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS.timeoutDestroy +
          GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS.timeoutAfterDestroy +
          GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS.gracePeriod,
      );

      await service.beforeApplicationShutdown('SIGTERM');

      expect(spyLoggerInfo).toHaveBeenCalledWith(GracefulShutdownMessages.PROCESS_MESSAGE + ': start', {
        payload: {
          signal: 'SIGTERM',
        },
      });
      expect(spyEmit).toHaveBeenCalledWith(GracefulShutdownEvents.BEFORE_DESTROY);
      expect(spyTotalCountActiveMethods).toHaveBeenCalledTimes(1);
      expect(spyEmit).toHaveBeenCalledWith(GracefulShutdownEvents.AFTER_DESTROY);
      expect(spyLoggerInfo).toHaveBeenCalledWith(GracefulShutdownMessages.PROCESS_MESSAGE + ': success', {
        payload: {
          details: ['Waiting Grace Period'],
        },
      });
      expect(spyExit).toHaveBeenCalledWith(0);
      expect(service.isActive()).toBeTruthy();
    });

    it('Должен завершиться с exit(1) при возникновении ошибки', async () => {
      const spyEmit = jest.spyOn(eventHandler, 'emit').mockImplementation(async (event) => {
        if (event === GracefulShutdownEvents.AFTER_DESTROY) {
          throw Error('Test error');
        }
      });
      const spyTotalCountActiveMethods = jest.spyOn(countHandler, 'getTotalCountActiveMethods');
      const spyLoggerInfo = jest.spyOn(logger, 'info');
      const spyLoggerWarn = jest.spyOn(logger, 'warn');
      const spyLoggerError = jest.spyOn(logger, 'error');

      jest.advanceTimersByTimeAsync(
        GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS.timeoutBeforeDestroy +
          GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS.timeoutDestroy +
          GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS.timeoutAfterDestroy +
          GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS.gracePeriod,
      );

      await service.beforeApplicationShutdown('SIGTERM');

      expect(spyLoggerInfo).toHaveBeenCalledWith(GracefulShutdownMessages.PROCESS_MESSAGE + ': start', {
        payload: {
          signal: 'SIGTERM',
        },
      });
      expect(spyEmit).toHaveBeenCalledWith(GracefulShutdownEvents.BEFORE_DESTROY);
      expect(spyTotalCountActiveMethods).toHaveBeenCalledTimes(1);
      expect(spyEmit).toHaveBeenCalledWith(GracefulShutdownEvents.AFTER_DESTROY);
      expect(spyLoggerError).toHaveBeenCalledWith(GracefulShutdownMessages.PROCESS_MESSAGE + ': filed', {
        payload: {
          error: Error('Test error'),
        },
      });
      expect(spyLoggerWarn).toHaveBeenCalledWith(GracefulShutdownMessages.ACTIVE_PROCESS_STATUS_MESSAGE, {
        payload: {
          details: {
            total: 0,
            details: [],
          },
        },
      });
      expect(spyExit).toHaveBeenCalledWith(1);
      expect(service.isActive()).toBeTruthy();
    });

    it('Должен выбрасывать ошибку TimeoutError если waitForMethodsDone выполняется дольше TIMEOUT_ON_DESTROY', async () => {
      const spyEmit = jest.spyOn(eventHandler, 'emit');
      const spyTotalCountActiveMethods = jest.spyOn(countHandler, 'getTotalCountActiveMethods');
      const spyLoggerInfo = jest.spyOn(logger, 'info');
      const spyLoggerWarn = jest.spyOn(logger, 'warn');
      const spyLoggerError = jest.spyOn(logger, 'error');

      jest.advanceTimersByTimeAsync(
        GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS.timeoutBeforeDestroy +
          GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS.timeoutDestroy +
          GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS.timeoutAfterDestroy +
          GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS.gracePeriod,
      );

      testShutdownService.onAsyncRun(GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS.timeoutDestroy + 10_000);

      await service.beforeApplicationShutdown('SIGTERM');

      expect(spyLoggerInfo).toHaveBeenCalledWith(GracefulShutdownMessages.PROCESS_MESSAGE + ': start', {
        payload: {
          signal: 'SIGTERM',
        },
      });
      expect(spyEmit).toHaveBeenCalledWith(GracefulShutdownEvents.BEFORE_DESTROY);
      expect(spyTotalCountActiveMethods).toHaveBeenCalledTimes(1);
      expect(spyEmit).not.toHaveBeenCalledWith(GracefulShutdownEvents.AFTER_DESTROY);
      expect(spyLoggerWarn).toHaveBeenCalledWith(GracefulShutdownMessages.ACTIVE_PROCESS_STATUS_MESSAGE, {
        payload: {
          details: {
            total: 1,
            details: [
              {
                count: 1,
                service: 'TestShutdownService',
                method: 'onAsyncRun',
              },
            ],
          },
        },
      });

      expect(spyLoggerError).toHaveBeenCalledWith(GracefulShutdownMessages.PROCESS_MESSAGE + ': timeout', {
        payload: {
          error: new TimeoutError(GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS.timeoutDestroy),
        },
      });
      expect(spyExit).toHaveBeenCalledWith(1);
      expect(service.isActive()).toBeTruthy();
    });
  });
});
