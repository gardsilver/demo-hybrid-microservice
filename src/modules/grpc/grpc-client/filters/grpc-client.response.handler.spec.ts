import { interval, timeout, firstValueFrom, TimeoutError as TimeoutErrorRxjs } from 'rxjs';
import { faker } from '@faker-js/faker';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { Test } from '@nestjs/testing';
import { TimeoutError } from 'src/modules/date-timestamp';
import { IGeneralAsyncContext, IHeaders, LoggerMarkers } from 'src/modules/common';
import {
  ILogFields,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
  ELK_LOGGER_SERVICE_BUILDER_DI,
  TraceSpanBuilder,
  ITraceSpan,
  LogLevel,
} from 'src/modules/elk-logger';
import { GrpcHeadersHelper } from 'src/modules/grpc/grpc-common';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { grpcHeadersFactory, grpcMetadataFactory } from 'tests/modules/grpc/grpc-common';
import { GrpcClientResponseHandler } from './grpc-client.response.handler';
import { GrpcClientError } from '../errors/grpc-client.error';
import { GrpcClientExternalException } from '../errors/grpc-client.external.error';
import { GrpcClientInternalException } from '../errors/grpc-client.internal.error';
import { GrpcClientTimeoutError } from '../errors/grpc-client.timeout.error';

describe(GrpcClientResponseHandler.name, () => {
  let traceSpan: ITraceSpan;
  let asyncContext: IGeneralAsyncContext;
  let headers: IHeaders;
  let fieldsLogs: ILogFields;
  let grpcError;
  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let responseHandler: GrpcClientResponseHandler;

  beforeEach(async () => {
    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: ELK_LOGGER_SERVICE_BUILDER_DI,
          useValue: {
            build: () => logger,
          },
        },
        GrpcClientResponseHandler,
      ],
    }).compile();

    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);
    responseHandler = module.get(GrpcClientResponseHandler);

    traceSpan = TraceSpanBuilder.build();
    asyncContext = generalAsyncContextFactory.build(
      {},
      {
        transient: {
          traceId: undefined,
          spanId: undefined,
          initialSpanId: undefined,
          parentSpanId: undefined,
          requestId: undefined,
          correlationId: undefined,
          ...traceSpan,
        },
      },
    );

    headers = grpcHeadersFactory.build(
      {
        programsIds: ['1', '30'],
      },
      {
        transient: asyncContext,
      },
    );

    fieldsLogs = {
      module: 'GrpcService',
      markers: [LoggerMarkers.GRPC],
      payload: {
        request: {
          method: 'main',
          headers: GrpcHeadersHelper.normalize(headers),
        },
      },
    };

    grpcError = new Error('Test Error');

    grpcError['metadata'] = grpcMetadataFactory.build(headers);

    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(responseHandler).toBeDefined();
  });

  describe('handleError', () => {
    let spyLoggingResponse;

    beforeEach(async () => {
      spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');
    });

    it('as External', async () => {
      grpcError['code'] = GrpcStatus.CANCELLED;

      const result = responseHandler.handleError(grpcError, { fieldsLogs });

      expect(result instanceof GrpcClientError).toBeTruthy();
      expect(result).toEqual(new GrpcClientExternalException(grpcError.message, grpcError.code, grpcError));
      expect(spyLoggingResponse).toHaveBeenCalledWith(result, { fieldsLogs });
    });

    it('as Internal', async () => {
      grpcError['code'] = GrpcStatus.INVALID_ARGUMENT;

      const result = responseHandler.handleError(grpcError, { fieldsLogs });

      expect(result instanceof GrpcClientError).toBeTruthy();
      expect(result).toEqual(new GrpcClientInternalException(grpcError.message, grpcError.code, grpcError));
      expect(spyLoggingResponse).toHaveBeenCalledWith(result, { fieldsLogs });
    });

    it('as Not found', async () => {
      grpcError['code'] = GrpcStatus.NOT_FOUND;

      const result = responseHandler.handleError(grpcError, { fieldsLogs });

      expect(result).toBeNull();
      expect(spyLoggingResponse).toHaveBeenCalledWith(
        new GrpcClientExternalException(grpcError.message, grpcError.code, grpcError),
        { fieldsLogs, logLevel: LogLevel.WARN },
      );
    });

    it('as Timeout', async () => {
      let exception;
      let result;

      exception = new TimeoutError(10_000);

      result = responseHandler.handleError(exception, { fieldsLogs });

      expect(result instanceof GrpcClientError).toBeTruthy();
      expect(result).toEqual(new GrpcClientTimeoutError(exception.message, 'timeout', exception));
      expect(spyLoggingResponse).toHaveBeenCalledWith(result, { fieldsLogs });

      jest.clearAllMocks();

      exception = undefined;
      try {
        const source$ = interval(500).pipe(timeout(1));
        await firstValueFrom(source$);
      } catch (e) {
        exception = e;
      }

      expect(exception).toBeDefined();
      expect(exception instanceof TimeoutErrorRxjs).toBeTruthy();

      result = responseHandler.handleError(exception, { fieldsLogs });

      expect(result instanceof GrpcClientError).toBeTruthy();
      expect(result).toEqual(new GrpcClientTimeoutError(exception.message, 'timeout', exception));
      expect(spyLoggingResponse).toHaveBeenCalledWith(result, { fieldsLogs });
    });

    it('Custom Error as string', async () => {
      const result = responseHandler.handleError('Test error', { fieldsLogs });

      expect(result instanceof GrpcClientError).toBeTruthy();
      expect(result).toEqual(new GrpcClientExternalException('Test error', undefined));
      expect(spyLoggingResponse).toHaveBeenCalledWith(result, { fieldsLogs });
    });

    it('Custom Error as any', async () => {
      let error;
      let result;

      error = faker.number.int();
      result = responseHandler.handleError(error, { fieldsLogs });

      expect(result instanceof GrpcClientError).toBeTruthy();
      expect(result).toEqual(new GrpcClientExternalException(undefined, undefined, error));
      expect(spyLoggingResponse).toHaveBeenCalledWith(result, { fieldsLogs });

      error = { error: 'Test error' };
      result = responseHandler.handleError(error, { fieldsLogs });

      expect(result instanceof GrpcClientError).toBeTruthy();
      expect(result).toEqual(new GrpcClientExternalException(undefined, undefined, error));
      expect(spyLoggingResponse).toHaveBeenCalledWith(result, { fieldsLogs });

      jest.clearAllMocks();

      error = { message: 'Test error' };
      result = responseHandler.handleError(error, { fieldsLogs });

      expect(result instanceof GrpcClientError).toBeTruthy();
      expect(result).toEqual(new GrpcClientExternalException('Test error', undefined, error));
      expect(spyLoggingResponse).toHaveBeenCalledWith(result, { fieldsLogs });

      jest.clearAllMocks();

      error = new Error('Test error');
      result = responseHandler.handleError(error, { fieldsLogs });

      expect(result instanceof GrpcClientError).toBeTruthy();
      expect(result).toEqual(new GrpcClientExternalException('Test error', undefined, error));
      expect(spyLoggingResponse).toHaveBeenCalledWith(result, { fieldsLogs });
    });
  });

  describe('loggingResponse', () => {
    let spyLogBuilder;
    let spyLog;

    beforeEach(async () => {
      spyLogBuilder = jest.spyOn(loggerBuilder, 'build');
      spyLog = jest.spyOn(logger, 'log');
    });

    it('response', async () => {
      let response;

      response = { status: 'ok' };

      responseHandler.loggingResponse(response);

      expect(spyLogBuilder).toHaveBeenCalledWith({ module: 'GrpcClientResponseHandler' });
      expect(spyLog).toHaveBeenCalledWith(LogLevel.INFO, 'gRPC response success', {
        markers: [LoggerMarkers.RESPONSE, LoggerMarkers.SUCCESS, LoggerMarkers.EXTERNAL],
        payload: {
          response,
        },
      });

      jest.clearAllMocks();

      responseHandler.loggingResponse(response, { skipLog: true });

      expect(spyLogBuilder).toHaveBeenCalledTimes(0);
      expect(spyLog).toHaveBeenCalledTimes(0);

      jest.clearAllMocks();

      responseHandler.loggingResponse(response, { retryCount: 10 });

      expect(spyLogBuilder).toHaveBeenCalledTimes(1);
      expect(spyLog).toHaveBeenCalledTimes(0);

      jest.clearAllMocks();

      responseHandler.loggingResponse(response, { logLevel: LogLevel.WARN });

      expect(spyLog).toHaveBeenCalledWith(LogLevel.WARN, 'gRPC response success', {
        markers: [LoggerMarkers.RESPONSE, LoggerMarkers.SUCCESS, LoggerMarkers.EXTERNAL],
        payload: {
          response,
        },
      });

      jest.clearAllMocks();

      response = null;

      responseHandler.loggingResponse(response, { fieldsLogs });

      expect(spyLogBuilder).toHaveBeenCalledWith(fieldsLogs);
      expect(spyLog).toHaveBeenCalledWith(LogLevel.INFO, 'gRPC response success', {
        markers: [LoggerMarkers.RESPONSE, LoggerMarkers.SUCCESS, LoggerMarkers.EXTERNAL],
        payload: {
          response: null,
        },
      });
    });

    it('GrpcClientError with ServiceError', async () => {
      grpcError['code'] = GrpcStatus.INVALID_ARGUMENT;
      grpcError.stack = 'Error: message\n    at <anonymous>:1:2\n';

      const error = new GrpcClientExternalException(grpcError.message, grpcError.code, grpcError);

      responseHandler.loggingResponse(error, { fieldsLogs });

      expect(spyLog).toHaveBeenCalledWith(LogLevel.ERROR, 'gRPC response failed', {
        markers: [LoggerMarkers.RESPONSE, LoggerMarkers.ERROR, LoggerMarkers.EXTERNAL],
        payload: {
          error,
        },
      });

      jest.clearAllMocks();

      responseHandler.loggingResponse(error, { retryCount: 10 });

      expect(spyLog).toHaveBeenCalledWith(LogLevel.WARN, 'gRPC response retry', {
        markers: [LoggerMarkers.RESPONSE, LoggerMarkers.RETRY, LoggerMarkers.EXTERNAL],
        payload: {
          retryCount: 10,
          error,
        },
      });

      jest.clearAllMocks();

      responseHandler.loggingResponse(error, { logLevel: LogLevel.DEBUG });

      expect(spyLog).toHaveBeenCalledWith(LogLevel.DEBUG, 'gRPC response failed', {
        markers: [LoggerMarkers.RESPONSE, LoggerMarkers.ERROR, LoggerMarkers.EXTERNAL],
        payload: {
          error,
        },
      });
    });

    it('GrpcClientError with any', async () => {
      const error = new GrpcClientExternalException(undefined, undefined, { status: 'error' });

      responseHandler.loggingResponse(error);

      expect(spyLog).toHaveBeenCalledWith(LogLevel.ERROR, 'gRPC response failed', {
        markers: [LoggerMarkers.RESPONSE, LoggerMarkers.ERROR, LoggerMarkers.EXTERNAL],
        payload: {
          error,
        },
      });
    });

    it('GrpcClientError with string', async () => {
      const error = new GrpcClientExternalException(undefined, undefined, 'Test error');

      responseHandler.loggingResponse(error);

      expect(spyLog).toHaveBeenCalledWith(LogLevel.ERROR, 'gRPC response failed', {
        markers: [LoggerMarkers.RESPONSE, LoggerMarkers.ERROR, LoggerMarkers.EXTERNAL],
        payload: {
          error,
        },
      });
    });
  });
});
