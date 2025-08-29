import { Observable } from 'rxjs';
import { AxiosError, AxiosResponse, isAxiosError } from 'axios';
import { HttpService } from '@nestjs/axios';
import { HttpStatus } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { GeneralAsyncContext, IGeneralAsyncContext, LoggerMarkers } from 'src/modules/common';
import { TimeoutError } from 'src/modules/date-timestamp';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ElkLoggerModule,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
  ILogFields,
  ITraceSpan,
  TraceSpanBuilder,
} from 'src/modules/elk-logger';
import {
  ICounterService,
  IHistogramService,
  PROMETHEUS_COUNTER_SERVICE_DI,
  PROMETHEUS_HISTOGRAM_SERVICE_DI,
  PrometheusModule,
} from 'src/modules/prometheus';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { MockConfigService } from 'tests/nestjs';
import { HTTP_CLIENT_HEADERS_REQUEST_BUILDER_DI, HTTP_CLIENT_REQUEST_OPTIONS_DI } from '../types/tokens';
import { IHttpHeadersRequestBuilder } from '../types/types';
import { HttpHeadersRequestBuilder } from '../builders/http.headers-request.builder';
import { HttpClientService } from './http-client.service';
import { HttpClientResponseHandler } from '../filters/http-client.response.handler';
import {
  HTTP_EXTERNAL_REQUEST_DURATIONS,
  HTTP_EXTERNAL_REQUEST_FAILED,
  HTTP_EXTERNAL_REQUEST_RETRY,
} from '../types/metrics';
import { HttpClientExternalError } from '../errors/http-client.external.error';
import { HttpClientInternalError } from '../errors/http-client.internal.error';
import { HttpClientTimeoutError } from '../errors/http-client.timeout.error';
import { HttpClientConfigService } from './http-client.config.service';

describe(HttpClientService.name, () => {
  let traceSpan: ITraceSpan;
  let asyncContext: IGeneralAsyncContext;
  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let headersBuilder: IHttpHeadersRequestBuilder;
  let histogramService: IHistogramService;
  let counterService: ICounterService;
  let httpService: HttpService;
  let responseHandler: HttpClientResponseHandler;
  let httpClient: HttpClientService;

  beforeEach(async () => {
    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      imports: [ConfigModule, ElkLoggerModule.forRoot(), PrometheusModule],
      providers: [
        {
          provide: HTTP_CLIENT_HEADERS_REQUEST_BUILDER_DI,
          useClass: HttpHeadersRequestBuilder,
        },
        {
          provide: HttpService,
          useValue: {
            axiosRef: {
              getUri: () => '0.0.0.0:300/path',
            },
            request: jest.fn(),
          },
        },
        {
          provide: HTTP_CLIENT_REQUEST_OPTIONS_DI,
          useValue: {},
        },
        HttpClientConfigService,
        HttpClientResponseHandler,
        HttpClientService,
      ],
    })
      .overrideProvider(ConfigService)
      .useValue(new MockConfigService())
      .overrideProvider(ELK_LOGGER_SERVICE_BUILDER_DI)
      .useValue({
        build: () => logger,
      })
      .compile();

    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);
    headersBuilder = module.get(HTTP_CLIENT_HEADERS_REQUEST_BUILDER_DI);
    histogramService = module.get(PROMETHEUS_HISTOGRAM_SERVICE_DI);
    counterService = module.get(PROMETHEUS_COUNTER_SERVICE_DI);
    httpService = module.get(HttpService);
    responseHandler = module.get(HttpClientResponseHandler);
    httpClient = module.get(HttpClientService);

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

    jest.spyOn(GeneralAsyncContext.instance, 'extend').mockImplementation(() => asyncContext);
    jest.spyOn(headersBuilder, 'build').mockImplementation(() => ({
      correlationId: asyncContext.correlationId,
      traceId: traceSpan.traceId,
      spanId: traceSpan.spanId,
    }));

    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  it('init', async () => {
    expect(httpService).toBeDefined();
    expect(responseHandler).toBeDefined();
    expect(httpClient).toBeDefined();
  });

  it('success', async () => {
    const axiosResponse = {
      status: HttpStatus.OK,
      data: { status: 'ok' },
    } as AxiosResponse;

    httpService.request = () => {
      return new Observable((subscriber) => {
        subscriber.next(axiosResponse);
        subscriber.complete();
      });
    };

    const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
    const spyLog = jest.spyOn(logger, 'info');
    const spyStartTimer = jest.spyOn(histogramService, 'startTimer');
    const spyIncrement = jest.spyOn(counterService, 'increment');
    const spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');
    const spyHandleError = jest.spyOn(responseHandler, 'handleError');

    const result = await httpClient.request({
      method: 'get',
      headers: {
        correlationId: asyncContext.correlationId,
      },
    });

    const fieldsLogs: ILogFields = {
      module: '0.0.0.0:300/path',
      markers: [LoggerMarkers.HTTP],
      payload: {
        request: {
          method: 'GET',
          headers: {
            traceid: traceSpan.traceId,
            spanid: traceSpan.spanId,
            correlationid: asyncContext.correlationId,
          },
        },
      },
    };

    expect(spyLoggerBuilder).toHaveBeenCalledWith(fieldsLogs);
    expect(spyStartTimer).toHaveBeenCalledWith(HTTP_EXTERNAL_REQUEST_DURATIONS, {
      labels: {
        method: 'GET',
        hostname: '0.0.0.0:300/path',
        pathname: '',
      },
    });
    expect(spyIncrement).toHaveBeenCalledTimes(0);

    expect(spyLog).toHaveBeenCalledWith('HTTP request', {
      markers: [LoggerMarkers.REQUEST, LoggerMarkers.EXTERNAL],
    });

    expect(spyLoggingResponse).toHaveBeenCalledWith(axiosResponse, { fieldsLogs });
    expect(spyHandleError).toHaveBeenCalledTimes(0);
    expect(result).toEqual({ status: 'ok' });
  });

  it('AxiosError', async () => {
    const axiosResponse = {
      status: HttpStatus.BAD_REQUEST,
      data: { status: 'error' },
    } as AxiosResponse;
    const error = new AxiosError(
      'Get response with status 400',
      AxiosError.ERR_BAD_REQUEST,
      undefined,
      undefined,
      axiosResponse,
    );

    httpService.request = () => {
      return new Observable((subscriber) => {
        subscriber.error(error);
        subscriber.complete();
      });
    };
    const handleError = new HttpClientExternalError('Test Error', 400, error, axiosResponse);

    const fieldsLogs: ILogFields = {
      module: '0.0.0.0:300/path',
      markers: [LoggerMarkers.HTTP],
      payload: {
        request: {
          method: 'GET',
          headers: {
            traceid: traceSpan.traceId,
            spanid: traceSpan.spanId,
            correlationid: asyncContext.correlationId,
          },
        },
      },
    };

    const spyIncrement = jest.spyOn(counterService, 'increment');
    const spyHandleError = jest.spyOn(responseHandler, 'handleError').mockImplementation(() => handleError);

    let response;
    let exception;
    try {
      response = await httpClient.request({
        method: 'get',
        headers: {
          correlationId: asyncContext.correlationId,
        },
      });
    } catch (e) {
      exception = e;
    }
    expect(response).toBeUndefined();
    expect(exception).toEqual(handleError);

    expect(spyHandleError).toHaveBeenCalledWith(error, { fieldsLogs });
    expect(spyIncrement).toHaveBeenCalledWith(HTTP_EXTERNAL_REQUEST_FAILED, {
      labels: {
        method: 'GET',
        hostname: '0.0.0.0:300/path',
        pathname: '',
        statusCode: handleError.statusCode?.toString(),
        type: handleError.loggerMarker,
      },
    });
  });

  it('AxiosError with Response as Not Found', async () => {
    const axiosResponse = {
      status: HttpStatus.NOT_FOUND,
      data: { status: 'Not Found' },
    } as AxiosResponse;
    const error = new AxiosError(
      'Get response with status 404',
      AxiosError.ERR_BAD_REQUEST,
      undefined,
      undefined,
      axiosResponse,
    );

    httpService.request = () => {
      return new Observable((subscriber) => {
        subscriber.error(error);
        subscriber.complete();
      });
    };

    const fieldsLogs: ILogFields = {
      module: '0.0.0.0:300/path',
      markers: [LoggerMarkers.HTTP],
      payload: {
        request: {
          method: 'GET',
          headers: {
            traceid: traceSpan.traceId,
            spanid: traceSpan.spanId,
            correlationid: asyncContext.correlationId,
          },
        },
      },
    };

    const spyIncrement = jest.spyOn(counterService, 'increment');
    const spyHandleError = jest
      .spyOn(responseHandler, 'handleError')
      .mockImplementation(() => ({ data: null }) as AxiosResponse);

    let response;
    let exception;
    try {
      response = await httpClient.request({
        method: 'get',
        headers: {
          correlationId: asyncContext.correlationId,
        },
      });
    } catch (e) {
      exception = e;
    }

    expect(response).toBeDefined();
    expect(response).toBeNull();
    expect(exception).toBeUndefined();

    expect(spyHandleError).toHaveBeenCalledWith(error, { fieldsLogs });
    expect(spyIncrement).toHaveBeenCalledTimes(0);
  });

  it('Unknown Error', async () => {
    const error = new Error('Unknown Error');

    httpService.request = () => {
      return new Observable((subscriber) => {
        subscriber.error(error);
        subscriber.complete();
      });
    };
    const handleError = new HttpClientInternalError('Test Error', undefined, error);

    const fieldsLogs: ILogFields = {
      module: '0.0.0.0:300/path',
      markers: [LoggerMarkers.HTTP],
      payload: {
        request: {
          method: 'GET',
          headers: {
            traceid: traceSpan.traceId,
            spanid: traceSpan.spanId,
            correlationid: asyncContext.correlationId,
          },
        },
      },
    };

    const spyIncrement = jest.spyOn(counterService, 'increment');
    const spyHandleError = jest.spyOn(responseHandler, 'handleError').mockImplementation(() => handleError);

    let response;
    let exception;
    try {
      response = await httpClient.request({
        method: 'get',
        headers: {
          correlationId: asyncContext.correlationId,
        },
      });
    } catch (e) {
      exception = e;
    }
    expect(response).toBeUndefined();
    expect(exception).toEqual(handleError);

    expect(spyHandleError).toHaveBeenCalledWith(error, { fieldsLogs });

    expect(spyIncrement).toHaveBeenCalledWith(HTTP_EXTERNAL_REQUEST_FAILED, {
      labels: {
        method: 'GET',
        hostname: '0.0.0.0:300/path',
        pathname: '',
        statusCode: handleError.statusCode?.toString(),
        type: handleError.loggerMarker,
      },
    });
  });

  it('AxiosError with retry failed', async () => {
    const axiosResponse = {
      status: HttpStatus.REQUEST_TIMEOUT,
      data: { status: 'error' },
    } as AxiosResponse;
    const error = new AxiosError(
      'Get response with status 408',
      AxiosError.ERR_BAD_REQUEST,
      undefined,
      undefined,
      axiosResponse,
    );

    httpService.request = () => {
      return new Observable((subscriber) => {
        setTimeout(() => {
          subscriber.error(error);
          subscriber.complete();
        }, 3_000);
      });
    };
    const handleError = new HttpClientExternalError('Get response with status 408', 408, error, axiosResponse);

    const fieldsLogs: ILogFields = {
      module: '0.0.0.0:300/path',
      markers: [LoggerMarkers.HTTP],
      payload: {
        request: {
          method: 'GET',
          headers: {
            traceid: traceSpan.traceId,
            spanid: traceSpan.spanId,
            correlationid: asyncContext.correlationId,
          },
        },
      },
    };

    const spyStartTimer = jest.spyOn(histogramService, 'startTimer');
    const spyIncrement = jest.spyOn(counterService, 'increment');
    const spyHandleError = jest.spyOn(responseHandler, 'handleError').mockImplementation((err) => {
      if (isAxiosError(err)) {
        return handleError;
      }
      return new HttpClientTimeoutError((err as Error).message, undefined);
    });
    const spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');
    const spyLog = jest.spyOn(logger, 'warn');

    jest.advanceTimersToNextTimerAsync(11_000);

    let response;
    let exception;
    try {
      response = await httpClient.request(
        {
          method: 'get',
          headers: {
            correlationId: asyncContext.correlationId,
          },
        },
        {
          retryOptions: {
            delay: 5_000,
            retryMaxCount: 1,
            statusCodes: [408],
          },
        },
      );
    } catch (e) {
      exception = e;
    }
    expect(response).toBeUndefined();
    expect(exception).toEqual(handleError);

    expect(spyHandleError).toHaveBeenCalledTimes(2);
    expect(spyHandleError).toHaveBeenCalledWith(error, { fieldsLogs, skipLog: true });
    expect(spyHandleError).toHaveBeenCalledWith(error, { fieldsLogs });

    expect(spyLoggingResponse).toHaveBeenCalledTimes(1);
    expect(spyLoggingResponse).toHaveBeenCalledWith(handleError, { fieldsLogs, retryCount: 0 });

    expect(spyLog).toHaveBeenCalledTimes(1);
    expect(spyLog).toHaveBeenCalledWith('HTTP request retry', {
      markers: [LoggerMarkers.REQUEST, LoggerMarkers.RETRY, handleError.loggerMarker],
      payload: {
        retryCount: 1,
      },
    });

    expect(spyStartTimer).toHaveBeenCalledTimes(2);
    expect(spyIncrement).toHaveBeenCalledWith(HTTP_EXTERNAL_REQUEST_FAILED, {
      labels: {
        method: 'GET',
        hostname: '0.0.0.0:300/path',
        pathname: '',
        statusCode: handleError.statusCode?.toString(),
        type: handleError.loggerMarker,
      },
    });

    expect(spyIncrement).toHaveBeenCalledWith(HTTP_EXTERNAL_REQUEST_RETRY, {
      labels: {
        method: 'GET',
        hostname: '0.0.0.0:300/path',
        pathname: '',
        statusCode: handleError.statusCode?.toString(),
        type: handleError.loggerMarker,
      },
    });
  });

  it('AxiosError with retry off', async () => {
    const axiosResponse = {
      status: HttpStatus.REQUEST_TIMEOUT,
      data: { status: 'error' },
    } as AxiosResponse;
    const error = new AxiosError(
      'Get response with status 408',
      AxiosError.ERR_BAD_REQUEST,
      undefined,
      undefined,
      axiosResponse,
    );

    httpService.request = () => {
      return new Observable((subscriber) => {
        setTimeout(() => {
          subscriber.error(error);
          subscriber.complete();
        }, 3_000);
      });
    };
    const handleError = new HttpClientExternalError('Get response with status 408', 408, error, axiosResponse);

    const fieldsLogs: ILogFields = {
      module: '0.0.0.0:300/path',
      markers: [LoggerMarkers.HTTP],
      payload: {
        request: {
          method: 'GET',
          headers: {
            traceid: traceSpan.traceId,
            spanid: traceSpan.spanId,
            correlationid: asyncContext.correlationId,
          },
        },
      },
    };

    const spyStartTimer = jest.spyOn(histogramService, 'startTimer');
    const spyIncrement = jest.spyOn(counterService, 'increment');
    const spyHandleError = jest.spyOn(responseHandler, 'handleError').mockImplementation((err) => {
      if (isAxiosError(err)) {
        return handleError;
      }
      return new HttpClientTimeoutError((err as Error).message, undefined);
    });
    const spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');
    const spyLog = jest.spyOn(logger, 'warn');

    jest.advanceTimersToNextTimerAsync(11_000);

    let response;
    let exception;
    try {
      response = await httpClient.request(
        {
          method: 'get',
          headers: {
            correlationId: asyncContext.correlationId,
          },
        },
        {
          retryOptions: {
            retry: false,
            delay: 5_000,
            retryMaxCount: 1,
            statusCodes: [408],
          },
        },
      );
    } catch (e) {
      exception = e;
    }
    expect(response).toBeUndefined();
    expect(exception).toEqual(handleError);

    expect(spyHandleError).toHaveBeenCalledTimes(1);
    expect(spyHandleError).toHaveBeenCalledWith(error, { fieldsLogs });

    expect(spyLoggingResponse).toHaveBeenCalledTimes(0);

    expect(spyLog).toHaveBeenCalledTimes(0);

    expect(spyStartTimer).toHaveBeenCalledTimes(1);
    expect(spyIncrement).toHaveBeenCalledWith(HTTP_EXTERNAL_REQUEST_FAILED, {
      labels: {
        method: 'GET',
        hostname: '0.0.0.0:300/path',
        pathname: '',
        statusCode: handleError.statusCode?.toString(),
        type: handleError.loggerMarker,
      },
    });

    expect(spyIncrement).not.toHaveBeenCalledWith(HTTP_EXTERNAL_REQUEST_RETRY, {
      labels: {
        method: 'GET',
        hostname: '0.0.0.0:300/path',
        pathname: '',
        statusCode: handleError.statusCode?.toString(),
        type: handleError.loggerMarker,
      },
    });
  });

  it('AxiosError with retry and after Timeout', async () => {
    const axiosResponse = {
      status: HttpStatus.REQUEST_TIMEOUT,
      data: { status: 'error' },
    } as AxiosResponse;
    const error = new AxiosError(
      'Get response with status 408',
      AxiosError.ERR_BAD_REQUEST,
      undefined,
      undefined,
      axiosResponse,
    );

    httpService.request = () => {
      return new Observable((subscriber) => {
        setTimeout(() => {
          subscriber.error(error);
          subscriber.complete();
        }, 3_000);
      });
    };

    const handleError = new HttpClientExternalError('Get response with status 408', 408, error, axiosResponse);

    const fieldsLogs: ILogFields = {
      module: '0.0.0.0:300/path',
      markers: [LoggerMarkers.HTTP],
      payload: {
        request: {
          method: 'GET',
          headers: {
            traceid: traceSpan.traceId,
            spanid: traceSpan.spanId,
            correlationid: asyncContext.correlationId,
          },
        },
      },
    };

    const spyStartTimer = jest.spyOn(histogramService, 'startTimer');
    const spyIncrement = jest.spyOn(counterService, 'increment');
    const spyHandleError = jest.spyOn(responseHandler, 'handleError').mockImplementation((err) => {
      if (isAxiosError(err)) {
        return handleError;
      }
      return new HttpClientTimeoutError((err as Error).message, undefined);
    });
    const spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');
    const spyLog = jest.spyOn(logger, 'warn');

    jest.advanceTimersToNextTimerAsync(13_000);

    let response;
    let exception;
    try {
      response = await httpClient.request(
        {
          method: 'get',
          headers: {
            correlationId: asyncContext.correlationId,
          },
        },
        {
          retryOptions: {
            timeout: 4_000,
            delay: 5_000,
            retryMaxCount: 0,
            statusCodes: [408],
          },
        },
      );
    } catch (e) {
      exception = e;
    }

    const handleTimeoutError = new HttpClientTimeoutError('HTTP Retry-Request Timeout (4 sec)', undefined);

    expect(response).toBeUndefined();
    expect(exception).toEqual(handleTimeoutError);

    expect(spyHandleError).toHaveBeenCalledTimes(2);
    expect(spyHandleError).toHaveBeenCalledWith(error, { fieldsLogs, skipLog: true });
    expect(spyHandleError).toHaveBeenCalledWith(new TimeoutError('HTTP Retry-Request Timeout (4 sec)'), { fieldsLogs });

    expect(spyLoggingResponse).toHaveBeenCalledTimes(1);
    expect(spyLoggingResponse).toHaveBeenCalledWith(handleError, { fieldsLogs, retryCount: 0 });

    expect(spyLog).toHaveBeenCalledTimes(0);

    expect(spyStartTimer).toHaveBeenCalledTimes(1);
    expect(spyIncrement).toHaveBeenCalledTimes(2);
    expect(spyIncrement).toHaveBeenCalledWith(HTTP_EXTERNAL_REQUEST_FAILED, {
      labels: {
        method: 'GET',
        hostname: '0.0.0.0:300/path',
        pathname: '',
        statusCode: handleError.statusCode?.toString(),
        type: handleError.loggerMarker,
      },
    });
  });
});
