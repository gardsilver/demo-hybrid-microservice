import { ConfigService } from '@nestjs/config';
import { DiscoveryModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { LoggerMarkers, MetadataExplorer } from 'src/modules/common';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ElkLoggerModule,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
} from 'src/modules/elk-logger';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { TestShutdownService } from 'tests/modules/graceful-shutdown';
import { GracefulShutdownEventHandler } from './graceful-shutdown.event-handler';
import { GracefulShutdownEvents } from '../types/types';

describe(GracefulShutdownEventHandler.name, () => {
  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let service: TestShutdownService;
  let handler: GracefulShutdownEventHandler;

  beforeEach(async () => {
    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      imports: [DiscoveryModule, ElkLoggerModule.forRoot()],
      providers: [
        {
          provide: ConfigService,
          useValue: new MockConfigService(),
        },
        MetadataExplorer,
        TestShutdownService,
        GracefulShutdownEventHandler,
      ],
    })
      .overrideProvider(ELK_LOGGER_SERVICE_BUILDER_DI)
      .useValue({
        build: () => logger,
      })
      .compile();

    await module.init();

    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);
    service = module.get(TestShutdownService);
    handler = module.get(GracefulShutdownEventHandler);

    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('init', async () => {
    expect(service).toBeDefined();
    expect(handler).toBeDefined();
    expect(loggerBuilder.build()).toBe(logger);
  });

  it('emit success', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spyOnBeforeDestroy = jest.spyOn(service['onBeforeDestroy'] as any, 'apply');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spyOnAfterDestroy = jest.spyOn(service['onAfterDestroy'] as any, 'apply');

    const spyLogInfo = jest.spyOn(logger, 'info');
    const spyLogDebug = jest.spyOn(logger, 'debug');

    await handler.emit(GracefulShutdownEvents.AFTER_DESTROY);

    expect(spyOnBeforeDestroy).toHaveBeenCalledTimes(0);
    expect(spyOnAfterDestroy).toHaveBeenCalledTimes(1);
    expect(spyOnAfterDestroy).toHaveBeenCalledWith(service);

    expect(spyLogDebug).toHaveBeenCalledWith('TestShutdownService: Test after destroy process. Success afterDestroy', {
      markers: [LoggerMarkers.SUCCESS],
      payload: {
        event: 'afterDestroy',
        service: 'TestShutdownService',
        method: 'onAfterDestroy',
      },
    });
    expect(spyLogInfo).toHaveBeenCalledWith('[afterDestroy]: success', {
      payload: {
        total: 1,
      },
    });
  });

  it('emit failed', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spyOnBeforeDestroy = jest.spyOn(service['onBeforeDestroy'] as any, 'apply').mockImplementation(() => {
      throw new Error('Test error');
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spyOnAfterDestroy = jest.spyOn(service['onAfterDestroy'] as any, 'apply');
    const spyLogError = jest.spyOn(logger, 'error');

    await handler.emit(GracefulShutdownEvents.BEFORE_DESTROY);

    expect(spyOnBeforeDestroy).toHaveBeenCalledTimes(1);
    expect(spyOnAfterDestroy).toHaveBeenCalledTimes(0);
    expect(spyOnBeforeDestroy).toHaveBeenCalledWith(service);

    expect(spyLogError).toHaveBeenCalledWith('TestShutdownService: call onBeforeDestroy. Failed beforeDestroy', {
      markers: [LoggerMarkers.FAILED],
      payload: {
        event: 'beforeDestroy',
        service: 'TestShutdownService',
        method: 'onBeforeDestroy',
        exception: new Error('Test error'),
      },
    });
    expect(spyLogError).toHaveBeenCalledWith('[beforeDestroy]: failed', {
      payload: {
        total: 1,
        details: ['TestShutdownService.onBeforeDestroy: Test error'],
        event: 'beforeDestroy',
        failed: 1,
        isSuccess: false,
      },
    });
  });
});
