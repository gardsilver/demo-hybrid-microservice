import { Observable } from 'rxjs';
import { Metadata, status as GrpcStatus } from '@grpc/grpc-js';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientGrpcProxy } from '@nestjs/microservices';
import { GeneralAsyncContext, IGeneralAsyncContext, LoggerMarkers } from 'src/modules/common';
import { TimeoutError } from 'src/modules/date-timestamp';
import {
  ITraceSpan,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
  ElkLoggerModule,
  ELK_LOGGER_SERVICE_BUILDER_DI,
  TraceSpanBuilder,
  ILogFields,
} from 'src/modules/elk-logger';
import {
  IHistogramService,
  ICounterService,
  PrometheusModule,
  PROMETHEUS_COUNTER_SERVICE_DI,
  PROMETHEUS_HISTOGRAM_SERVICE_DI,
} from 'src/modules/prometheus';
import { GrpcHeadersHelper } from 'src/modules/grpc/grpc-common';
import { MockConfigService } from 'tests/nestjs';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { IGrpcMetadataRequestBuilder } from '../types/types';
import { GrpcClientService } from './grpc-client.service';
import { GrpcClientResponseHandler } from '../filters/grpc-client.response.handler';
import {
  GRPC_CLIENT_METADATA_REQUEST_BUILDER_DI,
  GRPC_CLIENT_PROXY_DI,
  GRPC_CLIENT_REQUEST_OPTIONS_DI,
} from '../types/tokens';
import { GrpcMetadataRequestBuilder } from '../builders/grpc.metadata-request.builder';
import {
  GRPC_EXTERNAL_REQUEST_DURATIONS,
  GRPC_EXTERNAL_REQUEST_FAILED,
  GRPC_EXTERNAL_REQUEST_RETRY,
} from '../types/metrics';
import { GrpcClientExternalException } from '../errors/grpc-client.external.error';
import { GrpcClientTimeoutError } from '../errors/grpc-client.timeout.error';
import { isGrpcServiceError } from '../errors/grpc-client.error';
import { GrpcClientConfigService } from './grpc-client.config.service';

describe(GrpcClientService.name, () => {
  const testService = {
    main: jest.fn(),
  };

  let traceSpan: ITraceSpan;
  let asyncContext: IGeneralAsyncContext;
  let metadataReq: Metadata;
  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let metadataBuilder: IGrpcMetadataRequestBuilder;
  let histogramService: IHistogramService;
  let counterService: ICounterService;
  let responseHandler: GrpcClientResponseHandler;
  let clientProxy: ClientGrpcProxy;
  let grpcClient: GrpcClientService;

  beforeEach(async () => {
    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      imports: [ConfigModule, ElkLoggerModule.forRoot(), PrometheusModule],
      providers: [
        {
          provide: GRPC_CLIENT_REQUEST_OPTIONS_DI,
          useValue: {},
        },
        {
          provide: GRPC_CLIENT_METADATA_REQUEST_BUILDER_DI,
          useClass: GrpcMetadataRequestBuilder,
        },
        {
          provide: GRPC_CLIENT_PROXY_DI,
          useValue: {
            getService: () => testService,
          },
        },
        GrpcClientConfigService,
        GrpcClientResponseHandler,
        GrpcClientService,
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
    histogramService = module.get(PROMETHEUS_HISTOGRAM_SERVICE_DI);
    counterService = module.get(PROMETHEUS_COUNTER_SERVICE_DI);
    metadataBuilder = module.get(GRPC_CLIENT_METADATA_REQUEST_BUILDER_DI);
    clientProxy = module.get(GRPC_CLIENT_PROXY_DI);
    responseHandler = module.get(GrpcClientResponseHandler);
    grpcClient = module.get(GrpcClientService);

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

    metadataReq = new Metadata();
    metadataReq.set('correlationId', asyncContext.correlationId);
    metadataReq.set('traceId', asyncContext.traceId);
    metadataReq.set('spanId', asyncContext.spanId);

    jest.spyOn(GeneralAsyncContext.instance, 'extend').mockImplementation(() => asyncContext);
    jest.spyOn(metadataBuilder, 'build').mockImplementation(() => metadataReq);

    jest.spyOn(testService, 'main').mockImplementation(() => {
      return new Observable((observer) => {
        setTimeout(() => {
          observer.next({
            status: 'OK',
            message: 'Запрос успешно выполнен',
          });
          observer.complete();
        }, 3_000);
      });
    });

    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  it('init', async () => {
    expect(metadataBuilder).toBeDefined();
    expect(responseHandler).toBeDefined();
    expect(clientProxy).toBeDefined();
    expect(grpcClient).toBeDefined();
  });

  it('default', async () => {
    const spyMain = jest.spyOn(testService, 'main');
    const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');

    jest.advanceTimersByTimeAsync(3_000);

    await grpcClient.request({
      service: 'TestService',
      method: 'main',
    });

    jest.advanceTimersByTimeAsync(3_000);

    await grpcClient.request({
      service: 'TestService',
      method: 'main',
      data: null,
    });

    jest.advanceTimersByTimeAsync(3_000);

    await grpcClient.request({
      service: 'TestService',
      method: 'main',
      data: {
        query: 'Петя',
      },
    });

    expect(spyMain).toHaveBeenCalledWith(undefined, metadataReq);
    expect(spyMain).toHaveBeenCalledWith(metadataReq);
    expect(spyMain).toHaveBeenCalledWith({ query: 'Петя' }, metadataReq);

    expect(spyLoggerBuilder).toHaveBeenCalledWith({
      module: 'TestService.main',
      markers: [LoggerMarkers.GRPC],
      payload: {
        request: {
          data: 'undefined',
          headers: GrpcHeadersHelper.normalize(metadataReq.getMap()),
        },
      },
    });
    expect(spyLoggerBuilder).toHaveBeenCalledWith({
      module: 'TestService.main',
      markers: [LoggerMarkers.GRPC],
      payload: {
        request: {
          headers: GrpcHeadersHelper.normalize(metadataReq.getMap()),
        },
      },
    });
    expect(spyLoggerBuilder).toHaveBeenCalledWith({
      module: 'TestService.main',
      markers: [LoggerMarkers.GRPC],
      payload: {
        request: {
          data: {
            query: 'Петя',
          },
          headers: GrpcHeadersHelper.normalize(metadataReq.getMap()),
        },
      },
    });
  });

  it('success', async () => {
    const spyLog = jest.spyOn(logger, 'info');
    const spyStartTimer = jest.spyOn(histogramService, 'startTimer');
    const spyIncrement = jest.spyOn(counterService, 'increment');
    const spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');
    const spyHandleError = jest.spyOn(responseHandler, 'handleError');

    const fieldsLogs: ILogFields = {
      module: 'TestService.main',
      markers: [LoggerMarkers.GRPC],
      payload: {
        request: {
          headers: GrpcHeadersHelper.normalize(metadataReq.getMap()),
        },
      },
    };

    jest.advanceTimersByTimeAsync(3_000);

    const response = await grpcClient.request({
      service: 'TestService',
      method: 'main',
      data: null,
    });

    expect(response).toEqual({
      status: 'OK',
      message: 'Запрос успешно выполнен',
    });

    expect(spyLog).toHaveBeenCalledWith('gRPC request', {
      markers: [LoggerMarkers.REQUEST, LoggerMarkers.EXTERNAL],
    });
    expect(spyStartTimer).toHaveBeenCalledWith(GRPC_EXTERNAL_REQUEST_DURATIONS, {
      labels: {
        service: 'TestService',
        method: 'main',
      },
    });

    expect(spyIncrement).toHaveBeenCalledTimes(0);
    expect(spyLoggingResponse).toHaveBeenCalledWith(
      {
        status: 'OK',
        message: 'Запрос успешно выполнен',
      },
      { fieldsLogs },
    );
    expect(spyHandleError).toHaveBeenCalledTimes(0);
  });

  it('with Server error', async () => {
    const serverError = new Error('Test Error Server');
    serverError['code'] = GrpcStatus.INTERNAL;
    serverError['metadata'] = null;

    jest.spyOn(testService, 'main').mockImplementation(() => {
      return new Observable((observer) => {
        setTimeout(() => {
          observer.error(serverError);
        }, 3_000);
      });
    });

    const spyStartTimer = jest.spyOn(histogramService, 'startTimer');
    const spyIncrement = jest.spyOn(counterService, 'increment');
    const spyHandleError = jest.spyOn(responseHandler, 'handleError');

    const fieldsLogs: ILogFields = {
      module: 'TestService.main',
      markers: [LoggerMarkers.GRPC],
      payload: {
        request: {
          headers: GrpcHeadersHelper.normalize(metadataReq.getMap()),
        },
      },
    };

    jest.advanceTimersByTimeAsync(3_000);

    let response;
    let exception;
    try {
      response = await grpcClient.request({
        service: 'TestService',
        method: 'main',
        data: null,
      });
    } catch (e) {
      exception = e;
    }

    expect(response).toBeUndefined();
    expect(exception instanceof GrpcClientExternalException).toBeTruthy();
    expect(exception).toEqual(new GrpcClientExternalException('Test Error Server', GrpcStatus.INTERNAL, serverError));

    expect(spyStartTimer).toHaveBeenCalledTimes(1);
    expect(spyIncrement).toHaveBeenCalledTimes(1);

    expect(spyIncrement).toHaveBeenCalledWith(GRPC_EXTERNAL_REQUEST_FAILED, {
      labels: {
        service: 'TestService',
        method: 'main',
        statusCode: GrpcStatus.INTERNAL.toString(),
        type: 'external',
      },
    });

    expect(spyHandleError).toHaveBeenCalledWith(serverError, { fieldsLogs });
  });

  it('with Not Found', async () => {
    const serverError = new Error('Test Error Server');
    serverError['code'] = GrpcStatus.NOT_FOUND;
    serverError['metadata'] = null;

    jest.spyOn(testService, 'main').mockImplementation(() => {
      return new Observable((observer) => {
        setTimeout(() => {
          observer.error(serverError);
        }, 3_000);
      });
    });

    const spyStartTimer = jest.spyOn(histogramService, 'startTimer');
    const spyIncrement = jest.spyOn(counterService, 'increment');
    const spyHandleError = jest.spyOn(responseHandler, 'handleError');

    const fieldsLogs: ILogFields = {
      module: 'TestService.main',
      markers: [LoggerMarkers.GRPC],
      payload: {
        request: {
          headers: GrpcHeadersHelper.normalize(metadataReq.getMap()),
        },
      },
    };

    jest.advanceTimersByTimeAsync(3_000);

    let response;
    let exception;
    try {
      response = await grpcClient.request({
        service: 'TestService',
        method: 'main',
        data: null,
      });
    } catch (e) {
      exception = e;
    }

    expect(response).toBeNull();
    expect(exception).toBeUndefined();

    expect(spyStartTimer).toHaveBeenCalledTimes(1);
    expect(spyIncrement).toHaveBeenCalledTimes(0);
    expect(spyHandleError).toHaveBeenCalledWith(serverError, { fieldsLogs });
  });

  it('with Timeout request', async () => {
    jest.advanceTimersByTimeAsync(1_000);

    let response;
    let exception;
    try {
      response = await grpcClient.request(
        {
          service: 'TestService',
          method: 'main',
          data: null,
        },
        {
          requestOptions: {
            timeout: 1_000,
          },
          retryOptions: {
            statusCodes: [1],
          },
        },
      );
    } catch (e) {
      exception = e;
    }

    const errorTimeout = new TimeoutError('gRPC Request Timeout (1 sec)');
    expect(response).toBeUndefined();
    expect(exception).toEqual(new GrpcClientTimeoutError(errorTimeout.message, undefined, errorTimeout));
  });

  it('with retry failed', async () => {
    const serverError = new Error('Test Error Server');
    serverError['code'] = GrpcStatus.UNAVAILABLE;
    serverError['metadata'] = null;

    const handleError = new GrpcClientExternalException('Test Error Server', GrpcStatus.UNAVAILABLE, serverError);

    jest.spyOn(testService, 'main').mockImplementation(() => {
      return new Observable((observer) => {
        setTimeout(() => {
          observer.error(serverError);
          observer.complete();
        }, 3_000);
      });
    });

    const fieldsLogs: ILogFields = {
      module: 'TestService.main',
      markers: [LoggerMarkers.GRPC],
      payload: {
        request: {
          headers: GrpcHeadersHelper.normalize(metadataReq.getMap()),
        },
      },
    };

    const spyStartTimer = jest.spyOn(histogramService, 'startTimer');
    const spyIncrement = jest.spyOn(counterService, 'increment');
    const spyHandleError = jest.spyOn(responseHandler, 'handleError').mockImplementation((err) => {
      if (isGrpcServiceError(err)) {
        return handleError;
      }
      return new GrpcClientTimeoutError((err as Error).message, undefined);
    });
    const spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');
    const spyLog = jest.spyOn(logger, 'warn');

    jest.advanceTimersToNextTimerAsync(11_000);

    let response;
    let exception;
    try {
      response = await grpcClient.request(
        {
          service: 'TestService',
          method: 'main',
          data: null,
        },
        {
          retryOptions: {
            delay: 5_000,
            retryMaxCount: 1,
            statusCodes: [GrpcStatus.UNAVAILABLE],
          },
        },
      );
    } catch (e) {
      exception = e;
    }

    expect(response).toBeUndefined();
    expect(exception).toEqual(handleError);

    expect(spyHandleError).toHaveBeenCalledTimes(2);
    expect(spyHandleError).toHaveBeenCalledWith(serverError, { fieldsLogs, skipLog: true });
    expect(spyHandleError).toHaveBeenCalledWith(serverError, { fieldsLogs });

    expect(spyLoggingResponse).toHaveBeenCalledTimes(1);
    expect(spyLoggingResponse).toHaveBeenCalledWith(handleError, { fieldsLogs, retryCount: 0 });

    expect(spyLog).toHaveBeenCalledTimes(1);
    expect(spyLog).toHaveBeenCalledWith('gRPC request retry', {
      markers: [LoggerMarkers.REQUEST, LoggerMarkers.RETRY, handleError.loggerMarker],
      payload: {
        retryCount: 1,
      },
    });

    expect(spyStartTimer).toHaveBeenCalledTimes(2);
    expect(spyIncrement).toHaveBeenCalledWith(GRPC_EXTERNAL_REQUEST_FAILED, {
      labels: {
        service: 'TestService',
        method: 'main',
        statusCode: GrpcStatus.UNAVAILABLE.toString(),
        type: 'external',
      },
    });

    expect(spyIncrement).toHaveBeenCalledWith(GRPC_EXTERNAL_REQUEST_RETRY, {
      labels: {
        service: 'TestService',
        method: 'main',
        statusCode: GrpcStatus.UNAVAILABLE.toString(),
        type: 'external',
      },
    });
  });

  it('with retry off', async () => {
    const serverError = new Error('Test Error Server');
    serverError['code'] = GrpcStatus.UNAVAILABLE;
    serverError['metadata'] = null;

    const handleError = new GrpcClientExternalException('Test Error Server', GrpcStatus.UNAVAILABLE, serverError);

    jest.spyOn(testService, 'main').mockImplementation(() => {
      return new Observable((observer) => {
        setTimeout(() => {
          observer.error(serverError);
          observer.complete();
        }, 3_000);
      });
    });

    const fieldsLogs: ILogFields = {
      module: 'TestService.main',
      markers: [LoggerMarkers.GRPC],
      payload: {
        request: {
          headers: GrpcHeadersHelper.normalize(metadataReq.getMap()),
        },
      },
    };

    const spyStartTimer = jest.spyOn(histogramService, 'startTimer');
    const spyIncrement = jest.spyOn(counterService, 'increment');
    const spyHandleError = jest.spyOn(responseHandler, 'handleError').mockImplementation((err) => {
      if (isGrpcServiceError(err)) {
        return handleError;
      }
      return new GrpcClientTimeoutError((err as Error).message, undefined);
    });
    const spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');
    const spyLog = jest.spyOn(logger, 'warn');

    jest.advanceTimersToNextTimerAsync(11_000);

    let response;
    let exception;
    try {
      response = await grpcClient.request(
        {
          service: 'TestService',
          method: 'main',
          data: null,
        },
        {
          retryOptions: {
            retry: false,
            delay: 5_000,
            retryMaxCount: 1,
            statusCodes: [GrpcStatus.UNAVAILABLE],
          },
        },
      );
    } catch (e) {
      exception = e;
    }

    expect(response).toBeUndefined();
    expect(exception).toEqual(handleError);

    expect(spyHandleError).toHaveBeenCalledTimes(1);
    expect(spyHandleError).toHaveBeenCalledWith(serverError, { fieldsLogs });

    expect(spyLoggingResponse).toHaveBeenCalledTimes(0);

    expect(spyLog).toHaveBeenCalledTimes(0);

    expect(spyStartTimer).toHaveBeenCalledTimes(1);
    expect(spyIncrement).toHaveBeenCalledWith(GRPC_EXTERNAL_REQUEST_FAILED, {
      labels: {
        service: 'TestService',
        method: 'main',
        statusCode: GrpcStatus.UNAVAILABLE.toString(),
        type: 'external',
      },
    });

    expect(spyIncrement).not.toHaveBeenCalledWith(GRPC_EXTERNAL_REQUEST_RETRY, {
      labels: {
        service: 'TestService',
        method: 'main',
        statusCode: GrpcStatus.UNAVAILABLE.toString(),
        type: 'external',
      },
    });
  });

  it('with retry and after Timeout', async () => {
    const serverError = new Error('Test Error Server');
    serverError['code'] = GrpcStatus.UNAVAILABLE;
    serverError['metadata'] = null;

    const handleError = new GrpcClientExternalException('Test Error Server', GrpcStatus.UNAVAILABLE, serverError);

    jest.spyOn(testService, 'main').mockImplementation(() => {
      return new Observable((observer) => {
        setTimeout(() => {
          observer.error(serverError);
          observer.complete();
        }, 3_000);
      });
    });

    const fieldsLogs: ILogFields = {
      module: 'TestService.main',
      markers: [LoggerMarkers.GRPC],
      payload: {
        request: {
          headers: GrpcHeadersHelper.normalize(metadataReq.getMap()),
        },
      },
    };

    const spyStartTimer = jest.spyOn(histogramService, 'startTimer');
    const spyIncrement = jest.spyOn(counterService, 'increment');
    const spyHandleError = jest.spyOn(responseHandler, 'handleError').mockImplementation((err) => {
      if (isGrpcServiceError(err)) {
        return handleError;
      }
      return new GrpcClientTimeoutError((err as Error).message, undefined);
    });
    const spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');
    const spyLog = jest.spyOn(logger, 'warn');

    jest.advanceTimersToNextTimerAsync(13_000);

    let response;
    let exception;
    try {
      response = await grpcClient.request(
        {
          service: 'TestService',
          method: 'main',
          data: null,
        },
        {
          retryOptions: {
            timeout: 4_000,
            delay: 5_000,
            retryMaxCount: 0,
            statusCodes: [GrpcStatus.UNAVAILABLE],
          },
        },
      );
    } catch (e) {
      exception = e;
    }
    const handleTimeoutError = new GrpcClientTimeoutError('gRPC Retry-Request Timeout (4 sec)', undefined);

    expect(response).toBeUndefined();
    expect(exception).toEqual(handleTimeoutError);

    expect(spyHandleError).toHaveBeenCalledTimes(2);
    expect(spyHandleError).toHaveBeenCalledWith(serverError, { fieldsLogs, skipLog: true });
    expect(spyHandleError).toHaveBeenCalledWith(new TimeoutError('gRPC Retry-Request Timeout (4 sec)'), { fieldsLogs });

    expect(spyLoggingResponse).toHaveBeenCalledTimes(1);
    expect(spyLoggingResponse).toHaveBeenCalledWith(handleError, { fieldsLogs, retryCount: 0 });

    expect(spyLog).toHaveBeenCalledTimes(0);

    expect(spyStartTimer).toHaveBeenCalledTimes(1);
    expect(spyIncrement).toHaveBeenCalledTimes(2);
    expect(spyIncrement).toHaveBeenCalledWith(GRPC_EXTERNAL_REQUEST_FAILED, {
      labels: {
        service: 'TestService',
        method: 'main',
        statusCode: GrpcStatus.UNAVAILABLE.toString(),
        type: 'external',
      },
    });

    expect(spyIncrement).not.toHaveBeenCalledWith(GRPC_EXTERNAL_REQUEST_RETRY, {
      labels: {
        service: 'TestService',
        method: 'main',
        statusCode: GrpcStatus.UNAVAILABLE.toString(),
        type: 'external',
      },
    });
  });
});
