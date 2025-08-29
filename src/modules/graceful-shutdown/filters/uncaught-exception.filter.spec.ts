import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ElkLoggerModule,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
} from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { UncaughtExceptionFilter } from './uncaught-exception.filter';
import { GracefulShutdownConfig } from '../services/graceful-shutdown.config';

describe(UncaughtExceptionFilter.name, () => {
  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let gracefulShutdownConfig: GracefulShutdownConfig;
  let filter: UncaughtExceptionFilter;

  const error = new Error('Test uncaughtException');

  beforeEach(async () => {
    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), ElkLoggerModule.forRoot(), PrometheusModule],
      providers: [
        {
          provide: ConfigService,
          useValue: new MockConfigService({
            LOGGER_FORMAT_RECORD: 'NULL',
          }),
        },
        GracefulShutdownConfig,
        {
          provide: HttpAdapterHost,
          useValue: {
            httpAdapter: {
              reply: () => {
                /** Nothing */
              },
            },
          },
        },
        UncaughtExceptionFilter,
      ],
    })
      .overrideProvider(ELK_LOGGER_SERVICE_BUILDER_DI)
      .useValue({
        build: () => logger,
      })

      .compile();

    await module.init();

    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);
    gracefulShutdownConfig = module.get(GracefulShutdownConfig);
    filter = module.get(UncaughtExceptionFilter);
  });

  it('init', async () => {
    expect(loggerBuilder).toBeDefined();
    expect(gracefulShutdownConfig).toBeDefined();
    expect(filter).toBeDefined();
    expect(gracefulShutdownConfig.getDestroySignal()).toBe('SIGTERM');
  });

  it('uncaughtException', async () => {
    const spyLogger = jest.spyOn(logger, 'fatal');
    const spyProcess = jest.spyOn(process, 'emit');

    process.emit('uncaughtException', error);

    expect(spyLogger).toHaveBeenCalledWith('Critical error - uncaughtException', {
      payload: { error },
    });

    expect(spyProcess).toHaveBeenCalledWith('SIGTERM');
  });

  it('unhandledRejection', async () => {
    const spyLogger = jest.spyOn(logger, 'fatal');
    const spyProcess = jest.spyOn(process, 'emit');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process.emit('unhandledRejection' as any, error);

    expect(spyLogger).toHaveBeenCalledWith('Critical error - unhandledRejection', {
      payload: { reason: error },
    });

    expect(spyProcess).toHaveBeenCalledWith('SIGTERM');
  });
});
