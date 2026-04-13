import { faker } from '@faker-js/faker';
import { interval, timeout, firstValueFrom, TimeoutError as TimeoutErrorRxjs } from 'rxjs';
import {
  KafkaJSErrorMetadata,
  KafkaJSError,
  KafkaJSConnectionError,
  KafkaJSRequestTimeoutError,
  KafkaJSNumberOfRetriesExceeded,
} from 'kafkajs';
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
import { MockConfigService } from 'tests/nestjs';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { KafkaClientError } from '../errors/kafka-client.error';
import { KafkaClientInternalError } from '../errors/kafka-client.internal.error';
import { KafkaClientErrorHandler } from './kafka-client.error.handler';

describe(KafkaClientErrorHandler.name, () => {
  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let fieldsLogs: ILogFields;
  let cause: Error;
  let baseParams: KafkaJSErrorMetadata;
  let kafkaError: KafkaJSError;
  let error: KafkaClientError;
  let handler: KafkaClientErrorHandler;
  let spyLogBuilder: jest.SpyInstance;
  let spyLog: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();

    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      imports: [ConfigModule, ElkLoggerModule.forRoot()],
      providers: [KafkaClientErrorHandler],
    })
      .overrideProvider(ConfigService)
      .useValue(new MockConfigService())
      .overrideProvider(ELK_LOGGER_SERVICE_BUILDER_DI)
      .useValue({
        build: () => logger,
      })
      .compile();

    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);
    handler = module.get(KafkaClientErrorHandler);

    fieldsLogs = {
      ...TraceSpanBuilder.build(),
    };

    cause = new Error('Cause error');

    baseParams = {
      retriable: true,
      topic: faker.string.alpha(10),
      partitionId: faker.number.int(),
      metadata: {
        partitionErrorCode: faker.number.int(),
        partitionId: faker.number.int(),
        leader: faker.number.int(),
        replicas: [faker.number.int()],
        isr: [faker.number.int()],
        offlineReplicas: [faker.number.int()],
      },
    };

    kafkaError = new KafkaJSError('Server error', {
      ...baseParams,
      cause,
    } as unknown as KafkaJSErrorMetadata);
    kafkaError.stack = 'Error: message\n    at <anonymous>:1:2\n';

    error = new KafkaClientInternalError('Test Error', 'status', kafkaError);

    spyLogBuilder = jest.spyOn(loggerBuilder, 'build');
    spyLog = jest.spyOn(logger, 'log');
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
        module: 'KafkaClientErrorHandler',
      });
      expect(spyLog).toHaveBeenCalledWith(LogLevel.INFO, 'Kafka request success', {
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
        module: 'KafkaClientErrorHandler',
        ...fieldsLogs,
      });
      expect(spyLog).toHaveBeenCalledTimes(1);

      handler.loggingStatus('success', {
        logLevel: LogLevel.DEBUG,
      });

      expect(spyLog).toHaveBeenCalledWith(LogLevel.DEBUG, 'Kafka request success', {
        markers: [LoggerMarkers.REQUEST, LoggerMarkers.SUCCESS, LoggerMarkers.EXTERNAL],
        payload: {
          status: 'success',
        },
      });
    });

    it('error', async () => {
      handler.loggingStatus(error);

      expect(spyLog).toHaveBeenCalledWith(LogLevel.ERROR, 'Kafka request failed', {
        markers: [LoggerMarkers.REQUEST, LoggerMarkers.ERROR, error.loggerMarker],
        payload: {
          error,
        },
      });

      handler.loggingStatus(error, {
        logLevel: LogLevel.DEBUG,
      });

      expect(spyLog).toHaveBeenCalledWith(LogLevel.DEBUG, 'Kafka request failed', {
        markers: [LoggerMarkers.REQUEST, LoggerMarkers.ERROR, error.loggerMarker],
        payload: {
          error,
        },
      });

      const retryCount = faker.number.int();
      handler.loggingStatus(error, {
        retryCount,
      });

      expect(spyLog).toHaveBeenCalledWith(LogLevel.WARN, 'Kafka request retry', {
        markers: [LoggerMarkers.REQUEST, LoggerMarkers.RETRY, error.loggerMarker],
        payload: {
          retryCount,
          error,
        },
      });
    });
  });

  describe('getCause', () => {
    it('getCause', async () => {
      let exception = undefined;

      expect(handler.getCause(exception)).toBeUndefined();

      exception = faker.number.int();

      expect(handler.getCause(exception)).toBe(exception);

      exception = kafkaError;

      expect(handler.getCause(exception)).toBe(exception);

      exception = new KafkaJSConnectionError('Timeout', {
        broker: 'broker',
      });

      expect(handler.getCause(exception)).toBe(exception);

      (exception as unknown as { cause: unknown }).cause = kafkaError;

      expect(handler.getCause(exception)).toBe(kafkaError);
    });
  });

  describe('handleError', () => {
    let spyLoggingStatus: jest.SpyInstance;
    let mockCause: unknown;

    beforeEach(async () => {
      spyLoggingStatus = jest.spyOn(handler, 'loggingStatus');
      jest.spyOn(handler, 'getCause').mockImplementation(() => mockCause);
    });

    it('as TimeoutError', async () => {
      let exception;
      let result;

      // TimeoutError
      exception = new TimeoutError(10_000);
      mockCause = exception;

      result = handler.handleError(exception, { fieldsLogs });

      expect(result.name).toBe('Kafka Client TimeoutError');
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

      mockCause = exception;

      result = handler.handleError(exception, { fieldsLogs });

      expect(result.name).toBe('Kafka Client TimeoutError');
      expect(result.statusCode).toBe('timeout');
      expect(result.cause).toEqual(exception);
      expect(spyLoggingStatus).toHaveBeenCalledWith(result, { fieldsLogs });

      /**  @TODO
       *    В kafkajs закрыта возможность создания исключений KafkaJSLockTimeout вне библиотеки
       */
      // KafkaJSLockTimeout
      // exception = new KafkaJSLockTimeout();
      // mockCause = exception;
      // result = handler.handleError(exception, { fieldsLogs });
      // expect(result.name).toBe('Kafka Client TimeoutError');
      // expect(result.statusCode).toBe('timeout');
      // expect(result.cause).toEqual(exception);
      // expect(spyLoggingStatus).toHaveBeenCalledWith(result, { fieldsLogs });

      // KafkaJSRequestTimeoutError
      exception = new KafkaJSRequestTimeoutError('Timeout');
      mockCause = exception;

      result = handler.handleError(exception, { fieldsLogs });

      expect(result.name).toBe('Kafka Client TimeoutError');
      expect(result.statusCode).toBe('timeout');
      expect(result.cause).toEqual(exception);
      expect(spyLoggingStatus).toHaveBeenCalledWith(result, { fieldsLogs });

      // KafkaJSNumberOfRetriesExceeded
      exception = new KafkaJSNumberOfRetriesExceeded('Timeout', {
        retryCount: faker.number.int(),
        retryTime: faker.number.int(),
      });
      mockCause = exception;

      result = handler.handleError(exception, { fieldsLogs });

      expect(result.name).toBe('Kafka Client TimeoutError');
      expect(result.statusCode).toBe('timeout');
      expect(result.cause).toEqual(exception);
      expect(spyLoggingStatus).toHaveBeenCalledWith(result, { fieldsLogs });

      // KafkaJSConnectionError
      exception = new KafkaJSConnectionError('Connection timeout');
      mockCause = exception;

      result = handler.handleError(exception, { fieldsLogs });

      expect(result.name).toBe('Kafka Client TimeoutError');
      expect(result.statusCode).toBe('timeout');
      expect(result.cause).toEqual(exception);
      expect(spyLoggingStatus).toHaveBeenCalledWith(result, { fieldsLogs });

      exception = new KafkaJSConnectionError('Timeout');
      mockCause = exception;

      result = handler.handleError(exception, { fieldsLogs });

      expect(result.name).not.toBe('Kafka Client TimeoutError');
      expect(result.statusCode).not.toBe('timeout');

      /**  @TODO
       *    В kafkajs закрыта возможность создания исключений KafkaJSTimeout вне библиотеки
       */
      // KafkaJSTimeout
      // exception = new KafkaJSTimeout();
      // mockCause = exception;

      // result = handler.handleError(exception, { fieldsLogs });

      // expect(result.name).toBe('Kafka Client TimeoutError');
      // expect(result.statusCode).toBe('timeout');
      // expect(result.cause).toEqual(exception);
    });

    it('as KafkaClientInternalError', async () => {
      let exception;
      let result;

      exception = Object.assign(kafkaError, {
        name: 'KafkaJSInvariantViolation',
      });

      mockCause = exception;

      result = handler.handleError(exception, { fieldsLogs });

      expect(result.name).toBe('Kafka Client Internal Error');
      expect(result.statusCode).toBe('KafkaJSInvariantViolation');
      expect(result.cause).toEqual(exception);

      exception = Object.assign(kafkaError, {
        name: 'CustomError',
        type: 'INVALID_RECORD',
      });
      mockCause = exception;

      result = handler.handleError(exception, { fieldsLogs });

      expect(result.name).toBe('Kafka Client Internal Error');
      expect(result.statusCode).toBe('INVALID_RECORD');
      expect(result.cause).toEqual(exception);

      exception = new Error();
      mockCause = exception;

      result = handler.handleError(exception, { fieldsLogs });

      expect(result.name).toBe('Kafka Client Internal Error');
      expect(result.statusCode).toBe('Error');
      expect(result.cause).toEqual(exception);

      exception = 'Error';
      mockCause = exception;

      result = handler.handleError(exception, { fieldsLogs });

      expect(result.name).toBe('Kafka Client Internal Error');
      expect(result.message).toBe(exception);
      expect(result.statusCode).toBe('UnknownError');
      expect(result.cause).toBeUndefined();

      exception = { status: 'Error' };
      mockCause = exception;

      result = handler.handleError(exception, { fieldsLogs });

      expect(result.name).toBe('Kafka Client Internal Error');
      expect(result.message).toBe('Internal Kafka Server Error');
      expect(result.statusCode).toBe('UnknownError');
      expect(result.cause).toEqual(exception);

      exception = { message: 'Error' };
      mockCause = exception;

      result = handler.handleError(exception, { fieldsLogs });

      expect(result.name).toBe('Kafka Client Internal Error');
      expect(result.message).toBe('Error');
      expect(result.statusCode).toBe('UnknownError');
      expect(result.cause).toEqual(exception);

      exception = faker.number.int();
      mockCause = exception;

      result = handler.handleError(exception, { fieldsLogs });

      expect(result.name).toBe('Kafka Client Internal Error');
      expect(result.message).toBe('Internal Kafka Server Error');
      expect(result.statusCode).toBe('UnknownError');
      expect(result.cause).toEqual(exception);
    });

    it('as KafkaClientExternalError', async () => {
      const exception = Object.assign(kafkaError, {
        name: 'CustomError',
      });
      mockCause = exception;

      const result = handler.handleError(exception, { fieldsLogs });

      expect(result['name']).toBe('Kafka Client External Error');
      expect(result.statusCode).toBe('CustomError');
      expect(result.cause).toEqual(exception);
    });
  });
});
