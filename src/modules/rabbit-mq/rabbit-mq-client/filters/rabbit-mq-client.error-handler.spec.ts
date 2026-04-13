import { interval, timeout, firstValueFrom, TimeoutError as TimeoutErrorRxjs } from 'rxjs';
import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerMarkers } from 'src/modules/common';
import { TimeoutError } from 'src/modules/date-timestamp';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ElkLoggerModule,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
  ILogFields,
  LogLevel,
  TraceSpanBuilder,
} from 'src/modules/elk-logger';
import { RabbitMqError } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { MockConfigService } from 'tests/nestjs';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { RabbitMqClientError } from '../errors/rabbit-mq-client.error';
import { RabbitMqClientErrorHandler } from './rabbit-mq-client.error-handler';

class TestRabbitMqError extends RabbitMqClientError {
  constructor(message: string, statusCode: string | number, loggerMarker: string, cause?: unknown) {
    super(message, statusCode, loggerMarker, cause);
  }
}

describe(RabbitMqClientErrorHandler.name, () => {
  let loggerBuilder: IElkLoggerServiceBuilder;
  let logger: IElkLoggerService;
  let handler: RabbitMqClientErrorHandler;

  let fieldsLogs: ILogFields;
  let error: Error;
  let rabbitMqClientError: RabbitMqClientError;
  let rabbitMqError: RabbitMqError;
  let spyLogBuilder: jest.SpyInstance;
  let spyLog: jest.SpyInstance;

  beforeEach(async () => {
    logger = new MockElkLoggerService();
    const module = await Test.createTestingModule({
      imports: [ConfigModule, ElkLoggerModule.forRoot()],
      providers: [RabbitMqClientErrorHandler],
    })
      .overrideProvider(ConfigService)
      .useValue(new MockConfigService())
      .overrideProvider(ELK_LOGGER_SERVICE_BUILDER_DI)
      .useValue({
        build: () => logger,
      })
      .compile();

    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);
    handler = module.get(RabbitMqClientErrorHandler);

    fieldsLogs = {
      ...TraceSpanBuilder.build(),
    };

    error = new Error('Test error');
    rabbitMqClientError = new TestRabbitMqError('Test RabbitMq Error', 'test', LoggerMarkers.FAILED, error);
    rabbitMqError = new RabbitMqError(
      'Connection failed',
      {
        serverName: 'server',
        url: {
          protocol: 'rmq',
          hostname: 'rabbitmq',
          port: 60,
          vhost: '/path',
        },
        eventType: 'connectionFailed',
      },
      error,
    );

    spyLogBuilder = jest.spyOn(loggerBuilder, 'build');
    spyLog = jest.spyOn(logger, 'log');

    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(handler).toBeDefined();
  });

  describe('loggingStatus', () => {
    it('skipLog', async () => {
      handler.loggingStatus('success', { skipLog: true });

      expect(spyLogBuilder).toHaveBeenCalledTimes(0);
      expect(spyLog).toHaveBeenCalledTimes(0);
    });

    it('response', async () => {
      handler.loggingStatus('success');

      expect(spyLogBuilder).toHaveBeenCalledWith({
        module: 'RabbitMqClientErrorHandler',
      });
      expect(spyLog).toHaveBeenCalledWith(LogLevel.INFO, 'RMQ request success', {
        markers: [LoggerMarkers.REQUEST, LoggerMarkers.SUCCESS, LoggerMarkers.EXTERNAL],
        payload: {
          status: 'success',
        },
      });

      handler.loggingStatus('success', {
        fieldsLogs,
        retryCount: faker.number.int(),
        logLevel: LogLevel.DEBUG,
      });

      expect(spyLogBuilder).toHaveBeenCalledWith({
        module: 'RabbitMqClientErrorHandler',
        ...fieldsLogs,
      });
      expect(spyLog).toHaveBeenCalledTimes(1);

      handler.loggingStatus('success', {
        logLevel: LogLevel.DEBUG,
      });

      expect(spyLog).toHaveBeenCalledWith(LogLevel.DEBUG, 'RMQ request success', {
        markers: [LoggerMarkers.REQUEST, LoggerMarkers.SUCCESS, LoggerMarkers.EXTERNAL],
        payload: {
          status: 'success',
        },
      });
    });

    it('error', async () => {
      handler.loggingStatus(rabbitMqClientError);

      expect(spyLog).toHaveBeenCalledWith(LogLevel.ERROR, 'RMQ request failed', {
        markers: [LoggerMarkers.REQUEST, LoggerMarkers.ERROR, rabbitMqClientError.loggerMarker],
        payload: {
          error: rabbitMqClientError,
        },
      });

      handler.loggingStatus(rabbitMqClientError, {
        logLevel: LogLevel.DEBUG,
      });

      expect(spyLog).toHaveBeenCalledWith(LogLevel.DEBUG, 'RMQ request failed', {
        markers: [LoggerMarkers.REQUEST, LoggerMarkers.ERROR, rabbitMqClientError.loggerMarker],
        payload: {
          error: rabbitMqClientError,
        },
      });

      const retryCount = faker.number.int();
      handler.loggingStatus(rabbitMqClientError, {
        retryCount,
      });

      expect(spyLog).toHaveBeenCalledWith(LogLevel.WARN, 'RMQ request retry', {
        markers: [LoggerMarkers.REQUEST, LoggerMarkers.RETRY, rabbitMqClientError.loggerMarker],
        payload: {
          retryCount,
          error: rabbitMqClientError,
        },
      });
    });
  });

  describe('handleError', () => {
    let spyLoggingStatus: jest.SpyInstance;

    beforeEach(async () => {
      spyLoggingStatus = jest.spyOn(handler, 'loggingStatus');
    });

    it('as TimeoutError', async () => {
      let exception;
      let result;

      // TimeoutError
      exception = new TimeoutError(10_000);

      result = handler.handleError(exception, { fieldsLogs });

      expect(result.name).toBe('RabbitMq Client Timeout Error');
      expect(result.statusCode).toBe('timeout');
      expect(result.cause).toEqual(exception);

      expect(spyLoggingStatus).toHaveBeenCalledWith(result, { fieldsLogs });

      // TimeoutErrorRxjs
      exception = undefined;
      try {
        const source$ = interval(500).pipe(timeout(1));
        await firstValueFrom(source$);
      } catch (e) {
        exception = e;
      }

      expect(exception).toBeDefined();
      expect(exception instanceof TimeoutErrorRxjs).toBeTruthy();
      result = handler.handleError(exception, { fieldsLogs });

      expect(result.name).toBe('RabbitMq Client Timeout Error');
      expect(result.statusCode).toBe('timeout');
      expect(result.cause).toEqual(exception);
      expect(spyLoggingStatus).toHaveBeenCalledWith(result, { fieldsLogs });
    });

    it('as RabbitMqClientInternalError', async () => {
      let exception;
      let result;

      exception = Object.assign(new Error('Eny Error'), {
        name: 'TestError',
      });

      result = handler.handleError(exception, { fieldsLogs });

      expect(result.name).toBe('RabbitMq Client Internal Error');
      expect(result.statusCode).toBe('TestError');
      expect(result.cause).toEqual(exception);

      exception = Object.assign(new Error('Eny Error'), {
        name: 'CustomError',
        type: 'INVALID_RECORD',
      });

      result = handler.handleError(exception, { fieldsLogs });

      expect(result.name).toBe('RabbitMq Client Internal Error');
      expect(result.statusCode).toBe('INVALID_RECORD');
      expect(result.cause).toEqual(exception);

      exception = error;

      result = handler.handleError(exception, { fieldsLogs });

      expect(result.name).toBe('RabbitMq Client Internal Error');
      expect(result.statusCode).toBe('Error');
      expect(result.cause).toEqual(exception);

      exception = 'Error';

      result = handler.handleError(exception, { fieldsLogs });

      expect(result.name).toBe('RabbitMq Client Internal Error');
      expect(result.message).toBe(exception);
      expect(result.statusCode).toBe('UnknownError');
      expect(result.cause).toBeUndefined();

      exception = { status: 'Error' };

      result = handler.handleError(exception, { fieldsLogs });

      expect(result.name).toBe('RabbitMq Client Internal Error');
      expect(result.message).toBe('Internal RabbitMq Server Error');
      expect(result.statusCode).toBe('UnknownError');
      expect(result.cause).toEqual(exception);

      exception = { message: 'Error' };

      result = handler.handleError(exception, { fieldsLogs });

      expect(result.name).toBe('RabbitMq Client Internal Error');
      expect(result.message).toBe('Error');
      expect(result.statusCode).toBe('UnknownError');
      expect(result.cause).toEqual(exception);

      exception = faker.number.int();

      result = handler.handleError(exception, { fieldsLogs });

      expect(result.name).toBe('RabbitMq Client Internal Error');
      expect(result.message).toBe('Internal RabbitMq Server Error');
      expect(result.statusCode).toBe('UnknownError');
      expect(result.cause).toEqual(exception);
    });

    it('as RabbitMqClientExternalError', async () => {
      const result = handler.handleError(rabbitMqError, { fieldsLogs });

      expect(result['name']).toBe('RabbitMq Client External Error');
      expect(result.statusCode).toBe('connectionFailed');
      expect(result.cause).toEqual(rabbitMqError);
    });
  });
});
