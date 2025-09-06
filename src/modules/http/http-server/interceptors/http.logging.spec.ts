import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { ExecutionContext, CallHandler, HttpStatus } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { IGeneralAsyncContext, IHeaders, LoggerMarkers } from 'src/modules/common';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ElkLoggerModule,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
  ILogFields,
} from 'src/modules/elk-logger';
import {
  HttHeadersHelper,
  HttpHeadersToAsyncContextAdapter,
  IHttpHeadersToAsyncContextAdapter,
} from 'src/modules/http/http-common';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { MockConfigService } from 'tests/nestjs';
import { requestFactory, responseFactory } from 'tests/express';
import { HttpLogging } from './http.logging';
import { HttpRequestHelper } from '../helpers/http.request.helper';
import { HttpResponseHandler } from '../filters/http.response.handler';
import { HTTP_SERVER_HEADERS_ADAPTER_DI } from '../types/tokens';

describe(HttpLogging.name, () => {
  let reflector: Reflector;

  const requestData = {
    data: {
      query: 'Петр',
    },
  };
  let asyncContext: IGeneralAsyncContext;
  let headers: IHeaders;
  let request: Request;
  let response: Response;
  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let host: ExecutionContext;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: CallHandler<any>;
  let headersAdapter: IHttpHeadersToAsyncContextAdapter;
  let responseHandler: HttpResponseHandler;
  let interceptor: HttpLogging;

  beforeEach(async () => {
    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      imports: [ConfigModule, ElkLoggerModule.forRoot()],
      providers: [
        {
          provide: HTTP_SERVER_HEADERS_ADAPTER_DI,
          useClass: HttpHeadersToAsyncContextAdapter,
        },
        HttpResponseHandler,
        HttpLogging,
      ],
    })
      .overrideProvider(ConfigService)
      .useValue(new MockConfigService())
      .overrideProvider(ELK_LOGGER_SERVICE_BUILDER_DI)
      .useValue({
        build: () => logger,
      })
      .compile();

    await module.init();

    reflector = module.get(Reflector);
    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);
    headersAdapter = module.get(HTTP_SERVER_HEADERS_ADAPTER_DI);
    responseHandler = module.get(HttpResponseHandler);
    interceptor = module.get(HttpLogging);

    headers = httpHeadersFactory.build(
      {
        programsIds: ['1', '30'],
      },
      {
        transient: {
          traceId: undefined,
          spanId: undefined,
          requestId: undefined,
          correlationId: undefined,
        },
      },
    );

    asyncContext = headersAdapter.adapt(HttHeadersHelper.normalize(headers));

    request = requestFactory.build({
      method: 'get',
      route: 'api/test',
      params: {},
      headers,
      body: requestData,
    });

    response = responseFactory.build({
      status: HttpStatus.OK,
      headers,
    });

    host = {
      getClass: () => 'TestHttpController',
      getHandler: jest.fn(),
      switchToHttp: () =>
        ({
          getRequest: () => request,
          getResponse: () => response,
          getNext: jest.fn(),
        }) as undefined as HttpArgumentsHost,
    } as undefined as ExecutionContext;

    handler = {
      handle: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(interceptor).toBeDefined();
  });

  it('ignore', async () => {
    host.getType = jest.fn().mockImplementation(() => 'rpc');

    const spy = jest.spyOn(host, 'switchToHttp');
    const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
    const spyLoggerInfo = jest.spyOn(logger, 'info');
    const spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');
    const spyHandleError = jest.spyOn(responseHandler, 'handleError');

    await interceptor.intercept(host, handler);

    expect(spy).toHaveBeenCalledTimes(0);
    expect(spyLoggerBuilder).toHaveBeenCalledTimes(0);
    expect(spyLoggerInfo).toHaveBeenCalledTimes(0);
    expect(spyLoggingResponse).toHaveBeenCalledTimes(0);
    expect(spyHandleError).toHaveBeenCalledTimes(0);
    expect(HttpRequestHelper.getAsyncContext(request)).toBeUndefined();

    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(() => {
      return {
        HttpLogging: true,
      };
    });
    host.getType = jest.fn().mockImplementation(() => 'http');

    await interceptor.intercept(host, handler);

    expect(spy).toHaveBeenCalledTimes(0);
    expect(spyLoggerBuilder).toHaveBeenCalledTimes(0);
    expect(spyLoggerInfo).toHaveBeenCalledTimes(0);
    expect(spyLoggingResponse).toHaveBeenCalledTimes(0);
    expect(spyHandleError).toHaveBeenCalledTimes(0);
    expect(HttpRequestHelper.getAsyncContext(request)).toBeUndefined();
  });

  it('logging success', async () => {
    jest.spyOn(headersAdapter, 'adapt').mockImplementation(() => {
      return asyncContext;
    });
    host.getType = jest.fn().mockImplementation(() => 'http');

    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(() => {
      return {};
    });

    handler.handle = jest.fn().mockImplementation(() => {
      return new Observable((subscriber) => {
        subscriber.next({ status: 'ok' });
      });
    });

    const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
    const spyLoggerInfo = jest.spyOn(logger, 'info');
    const spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');
    const spyHandleError = jest.spyOn(responseHandler, 'handleError');

    const fields: ILogFields = {
      module: 'HttpLogging.intercept',
      markers: [LoggerMarkers.INTERNAL],
      traceId: asyncContext.traceId,
      spanId: asyncContext.spanId,
      parentSpanId: asyncContext.parentSpanId,
      initialSpanId: asyncContext.initialSpanId,
      payload: {
        request: {
          method: 'get',
          route: request.route,
          url: request.url,
          params: {},
          body: requestData,
          headers: HttHeadersHelper.normalize(headers),
        },
      },
    };

    (await interceptor.intercept(host, handler)).subscribe();

    expect(HttpRequestHelper.getAsyncContext(request)).toEqual(asyncContext);

    expect(spyLoggerBuilder).toHaveBeenCalledWith(fields);

    expect(spyLoggerInfo).toHaveBeenCalledWith('Request', {
      markers: [LoggerMarkers.REQUEST],
    });

    expect(spyLoggingResponse).toHaveBeenCalledWith(200, {
      ...fields,
      payload: {
        ...fields.payload,
        response: {
          statusCode: 200,
          headers: HttHeadersHelper.normalize(headers),
          data: { status: 'ok' },
        },
      },
    });
    expect(spyHandleError).toHaveBeenCalledTimes(0);
  });

  it('logging error', async () => {
    const spyHeadersAdapter = jest.spyOn(headersAdapter, 'adapt');

    host.getType = jest.fn().mockImplementation(() => 'http');

    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(() => {
      return {};
    });

    HttpRequestHelper.setAsyncContext(asyncContext, request);

    const error = new Error('Test error');

    handler.handle = jest.fn().mockImplementation(() => {
      return new Observable((subscriber) => {
        try {
          subscriber.error(error);
        } catch (e) {
          subscriber.error(e);
        }
      });
    });

    const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
    const spyLoggerInfo = jest.spyOn(logger, 'info');
    const spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');
    const spyHandleError = jest.spyOn(responseHandler, 'handleError');

    const fields: ILogFields = {
      module: 'HttpLogging.intercept',
      markers: [LoggerMarkers.INTERNAL],
      traceId: asyncContext.traceId,
      spanId: asyncContext.spanId,
      parentSpanId: asyncContext.parentSpanId,
      initialSpanId: asyncContext.initialSpanId,
      payload: {
        request: {
          method: 'get',
          route: request.route,
          url: request.url,
          params: {},
          body: requestData,
          headers: HttHeadersHelper.normalize(headers),
        },
      },
    };

    (await interceptor.intercept(host, handler)).subscribe({
      next: jest.fn(),
      error: jest.fn(),
    });

    expect(spyHeadersAdapter).toHaveBeenCalledTimes(0);

    expect(spyLoggerBuilder).toHaveBeenCalledWith(fields);

    expect(spyLoggerInfo).toHaveBeenCalledWith('Request', {
      markers: [LoggerMarkers.REQUEST],
    });

    expect(spyLoggingResponse).not.toHaveBeenCalledWith(200, {
      ...fields,
      payload: {
        ...fields.payload,
        response: {
          statusCode: 200,
          headers: HttHeadersHelper.normalize(headers),
          data: { status: 'ok' },
        },
      },
    });
    expect(spyHandleError).toHaveBeenCalledWith(host, error, fields);
  });
});
