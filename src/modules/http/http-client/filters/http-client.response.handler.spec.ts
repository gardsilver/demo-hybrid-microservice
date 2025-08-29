import { firstValueFrom, interval, timeout, TimeoutError as TimeoutErrorRxjs } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TimeoutError } from 'src/modules/date-timestamp';
import { IGeneralAsyncContext, IHeaders, LoggerMarkers } from 'src/modules/common';
import {
  IElkLoggerService,
  IElkLoggerServiceBuilder,
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ILogFields,
  ITraceSpan,
  TraceSpanBuilder,
  LogLevel,
} from 'src/modules/elk-logger';
import { HttHeadersHelper } from 'src/modules/http/http-common';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { HttpClientResponseHandler } from './http-client.response.handler';
import { HttpClientExternalError } from '../errors/http-client.external.error';
import { HttpClientInternalError } from '../errors/http-client.internal.error';
import { HttpClientTimeoutError } from '../errors/http-client.timeout.error';
import { HttpClientError } from '../errors/http-client.error';

describe(HttpClientResponseHandler.name, () => {
  let traceSpan: ITraceSpan;
  let asyncContext: IGeneralAsyncContext;
  let headers: IHeaders;
  let fieldsLogs: ILogFields;
  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let responseHandler: HttpClientResponseHandler;

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
        HttpClientResponseHandler,
      ],
    }).compile();

    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);
    responseHandler = module.get(HttpClientResponseHandler);

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

    headers = httpHeadersFactory.build(
      {
        programsIds: ['1', '30'],
      },
      {
        transient: asyncContext,
      },
    );

    fieldsLogs = {
      module: 'hostname/path',
      markers: [LoggerMarkers.HTTP],
      payload: {
        request: {
          method: 'GET',
          headers: HttHeadersHelper.normalize(headers),
        },
      },
    };

    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(responseHandler).toBeDefined();
  });

  describe('handleError', () => {
    it('default', async () => {
      const axiosResponse = {
        status: HttpStatus.BAD_REQUEST,
        data: { status: 'error' },
        headers,
      } as AxiosResponse;
      const error = new AxiosError(
        'Get response with status 400',
        AxiosError.ERR_BAD_REQUEST,
        undefined,
        undefined,
        axiosResponse,
      );

      const spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');

      const result = responseHandler.handleError(error, { fieldsLogs });

      expect(result instanceof HttpClientExternalError).toBeTruthy();
      expect(result).toEqual(new HttpClientExternalError('Get response with status 400', 400, error, axiosResponse));

      expect(spyLoggingResponse).toHaveBeenCalledWith(result, {
        fieldsLogs,
      });
    });

    it('as Not Found', async () => {
      const axiosResponse = {
        status: HttpStatus.NOT_FOUND,
        data: { status: 'Not Found' },
        headers,
      } as AxiosResponse;

      const error = new AxiosError(
        'Get response with status 404',
        AxiosError.ERR_BAD_REQUEST,
        undefined,
        undefined,
        axiosResponse,
      );

      const spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');

      const result = responseHandler.handleError(error, { fieldsLogs });

      expect(result instanceof HttpClientError).toBeFalsy();
      expect(result['data']).toBeNull();

      expect(spyLoggingResponse).toHaveBeenCalledWith(axiosResponse, {
        logLevel: 'WARN',
        fieldsLogs,
      });
    });

    it('error without response', async () => {
      const error = new AxiosError('Unknown response', AxiosError.ERR_BAD_RESPONSE);

      const spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');

      const result = responseHandler.handleError(error, { fieldsLogs });

      expect(result instanceof HttpClientExternalError).toBeTruthy();
      expect(result).toEqual(new HttpClientExternalError('Unknown response', 'ERR_BAD_RESPONSE', error));
      expect(spyLoggingResponse).toHaveBeenCalledWith(result, { fieldsLogs });
    });

    it('error without response as Internal error', async () => {
      const error = new AxiosError('Unknown url format', AxiosError.ERR_INVALID_URL);

      const spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');

      const result = responseHandler.handleError(error, { fieldsLogs });

      expect(result instanceof HttpClientInternalError).toBeTruthy();
      expect(result).toEqual(new HttpClientInternalError('Unknown url format', 'ERR_INVALID_URL', error));

      expect(spyLoggingResponse).toHaveBeenCalledWith(result, { fieldsLogs });
    });

    it('as Timeout', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let exception: any = new AxiosError('Timeout', AxiosError.ETIMEDOUT);

      const spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');

      let result = responseHandler.handleError(exception, { fieldsLogs });

      expect(exception instanceof TimeoutErrorRxjs).toBeFalsy();
      expect(result instanceof HttpClientTimeoutError).toBeTruthy();
      expect(result).toEqual(new HttpClientTimeoutError('Timeout', AxiosError.ETIMEDOUT, exception));

      expect(spyLoggingResponse).toHaveBeenCalledWith(result, { fieldsLogs });

      exception = new TimeoutError(10_000);

      result = responseHandler.handleError(exception, { fieldsLogs });

      expect(result instanceof HttpClientTimeoutError).toBeTruthy();
      expect(exception instanceof TimeoutErrorRxjs).toBeFalsy();
      expect(result).toEqual(new HttpClientTimeoutError(exception.message, 'timeout', exception));

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

      expect(result instanceof HttpClientTimeoutError).toBeTruthy();
      expect(result).toEqual(new HttpClientTimeoutError(exception.message, 'timeout', exception));
    });

    it('Unknown Error', async () => {
      const error = new Error('Test error');

      const spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');

      const result = responseHandler.handleError(error, { fieldsLogs });

      expect(result instanceof HttpClientInternalError).toBeTruthy();
      expect(result).toEqual(new HttpClientInternalError('Test error', undefined, error));

      expect(spyLoggingResponse).toHaveBeenCalledWith(result, { fieldsLogs });
    });

    it('Custom Error as string', async () => {
      const error = 'Test error';

      const spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');

      const result = responseHandler.handleError(error, { fieldsLogs });

      expect(result instanceof HttpClientInternalError).toBeTruthy();
      expect(result).toEqual(new HttpClientInternalError('Test error', undefined));

      expect(spyLoggingResponse).toHaveBeenCalledWith(result, { fieldsLogs });
    });

    it('Custom Error as any', async () => {
      const error = { description: 'Test error' };

      const spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');

      const result = responseHandler.handleError(error, { fieldsLogs });

      expect(result instanceof HttpClientInternalError).toBeTruthy();
      expect(result).toEqual(new HttpClientInternalError(undefined, undefined, error));

      expect(spyLoggingResponse).toHaveBeenCalledWith(result, { fieldsLogs });
    });
  });

  describe('loggingResponse', () => {
    it('AxiosResponse', async () => {
      const axiosResponse = {
        status: HttpStatus.BAD_REQUEST,
        data: { status: 'error' },
        headers,
      } as AxiosResponse;

      const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
      const spyLogger = jest.spyOn(logger, 'log');

      responseHandler.loggingResponse(axiosResponse, { fieldsLogs, skipLog: true });

      expect(spyLoggerBuilder).toHaveBeenCalledTimes(0);
      expect(spyLogger).toHaveBeenCalledTimes(0);

      responseHandler.loggingResponse(axiosResponse, { fieldsLogs, retryCount: 20 });

      expect(spyLoggerBuilder).toHaveBeenCalledWith(fieldsLogs);
      expect(spyLogger).toHaveBeenCalledTimes(0);

      responseHandler.loggingResponse(axiosResponse, { fieldsLogs });

      expect(spyLogger).toHaveBeenCalledWith(LogLevel.INFO, 'HTTP response success', {
        markers: [LoggerMarkers.RESPONSE, LoggerMarkers.SUCCESS, LoggerMarkers.EXTERNAL],
        payload: {
          response: {
            code: 400,
            data: { status: 'error' },
            headers: HttHeadersHelper.normalize(headers),
          },
        },
      });
    });

    describe('Error', () => {
      let axiosResponse: AxiosResponse;
      let axiosError: AxiosError;

      beforeEach(() => {
        axiosResponse = {
          status: HttpStatus.OK,
          data: { status: 'ok' },
          headers,
        } as AxiosResponse;
        axiosError = new AxiosError(
          'Can not parse response',
          AxiosError.ERR_BAD_RESPONSE,
          undefined,
          undefined,
          axiosResponse,
        );
        axiosError.stack = 'Error: message\n    at <anonymous>:1:2\n';
      });

      it('HttpClientError without response', async () => {
        axiosError.response = undefined;
        axiosError.code = AxiosError.ETIMEDOUT;

        const error = new HttpClientTimeoutError('Timeout', AxiosError.ETIMEDOUT, axiosError);

        const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
        const spyLogger = jest.spyOn(logger, 'log');

        responseHandler.loggingResponse(error, { fieldsLogs, skipLog: true });

        expect(spyLoggerBuilder).toHaveBeenCalledTimes(0);
        expect(spyLogger).toHaveBeenCalledTimes(0);

        responseHandler.loggingResponse(error, { fieldsLogs, retryCount: 12 });

        expect(spyLoggerBuilder).toHaveBeenCalledWith(fieldsLogs);

        expect(spyLogger).toHaveBeenCalledWith(LogLevel.WARN, 'HTTP response retry', {
          markers: [LoggerMarkers.RESPONSE, LoggerMarkers.RETRY, LoggerMarkers.EXTERNAL],
          payload: {
            retryCount: 12,
            error,
          },
        });

        responseHandler.loggingResponse(error, { fieldsLogs });

        expect(spyLogger).toHaveBeenCalledWith(LogLevel.ERROR, 'HTTP response failed', {
          markers: [LoggerMarkers.RESPONSE, LoggerMarkers.ERROR, LoggerMarkers.EXTERNAL],
          payload: {
            error,
          },
        });
      });

      it('HttpClientError with response', async () => {
        axiosError.stack = undefined;
        axiosError.cause = { description: 'Test error' } as undefined as Error;

        const error = new HttpClientInternalError('Bed request', AxiosError.ERR_BAD_REQUEST, axiosError, axiosResponse);

        const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
        const spyLogger = jest.spyOn(logger, 'log');

        responseHandler.loggingResponse(error, { fieldsLogs });

        expect(spyLoggerBuilder).toHaveBeenCalledWith(fieldsLogs);

        expect(spyLogger).toHaveBeenCalledWith(LogLevel.ERROR, 'HTTP response failed', {
          markers: [LoggerMarkers.RESPONSE, LoggerMarkers.ERROR, LoggerMarkers.INTERNAL],
          payload: {
            error,
          },
        });
      });

      it('HttpClientError with Error as any object', async () => {
        const error = new HttpClientExternalError(undefined, undefined, { description: 'Test error' });

        const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
        const spyLogger = jest.spyOn(logger, 'log');

        responseHandler.loggingResponse(error, { fieldsLogs });

        expect(spyLoggerBuilder).toHaveBeenCalledWith(fieldsLogs);

        expect(spyLogger).toHaveBeenCalledWith(LogLevel.ERROR, 'HTTP response failed', {
          markers: [LoggerMarkers.RESPONSE, LoggerMarkers.ERROR, LoggerMarkers.EXTERNAL],
          payload: {
            error,
          },
        });
      });

      it('HttpClientError with Error as string', async () => {
        const error = new HttpClientExternalError(undefined, undefined, 'Test error');

        const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
        const spyLogger = jest.spyOn(logger, 'log');

        responseHandler.loggingResponse(error, { fieldsLogs });

        expect(spyLoggerBuilder).toHaveBeenCalledWith(fieldsLogs);

        expect(spyLogger).toHaveBeenCalledWith(LogLevel.ERROR, 'HTTP response failed', {
          markers: [LoggerMarkers.RESPONSE, LoggerMarkers.ERROR, LoggerMarkers.EXTERNAL],
          payload: {
            error,
          },
        });
      });
    });
  });
});
