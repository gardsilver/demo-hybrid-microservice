import { Observable } from 'rxjs';
import { Request } from 'express';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { IGeneralAsyncContext, IHeaders } from 'src/modules/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, ElkLoggerModule, IElkLoggerService } from 'src/modules/elk-logger';
import {
  ICounterService,
  IHistogramService,
  PROMETHEUS_COUNTER_SERVICE_DI,
  PROMETHEUS_HISTOGRAM_SERVICE_DI,
  PrometheusModule,
} from 'src/modules/prometheus';
import {
  HttHeadersHelper,
  HttpHeadersToAsyncContextAdapter,
  IHttpHeadersToAsyncContextAdapter,
} from 'src/modules/http/http-common';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { MockConfigService } from 'tests/nestjs';
import { requestFactory } from 'tests/express-js';
import { HttpRequestHelper } from '../helpers/http.request.helper';
import { HTTP_SERVER_HEADERS_ADAPTER_DI } from '../types/tokens';
import { HttpPrometheus } from './http.prometheus';
import { HTTP_INTERNAL_REQUEST_DURATIONS, HTTP_INTERNAL_REQUEST_FAILED } from '../types/metrics';

describe(HttpPrometheus.name, () => {
  let reflector: Reflector;

  const requestData = {
    data: {
      query: 'Петр',
    },
  };
  let asyncContext: IGeneralAsyncContext;
  let headers: IHeaders;
  let request: Request;
  let logger: IElkLoggerService;
  let host: ExecutionContext;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: CallHandler<any>;
  let headersAdapter: IHttpHeadersToAsyncContextAdapter;
  let histogramService: IHistogramService;
  let counterService: ICounterService;
  let interceptor: HttpPrometheus;

  beforeEach(async () => {
    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      imports: [ConfigModule, ElkLoggerModule.forRoot(), PrometheusModule],
      providers: [
        {
          provide: HTTP_SERVER_HEADERS_ADAPTER_DI,
          useClass: HttpHeadersToAsyncContextAdapter,
        },
        HttpPrometheus,
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
    headersAdapter = module.get(HTTP_SERVER_HEADERS_ADAPTER_DI);
    histogramService = module.get(PROMETHEUS_HISTOGRAM_SERVICE_DI);
    counterService = module.get(PROMETHEUS_COUNTER_SERVICE_DI);
    interceptor = module.get(HttpPrometheus);

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
      path: 'api/test',
      params: {},
      headers,
      body: requestData,
    });

    host = {
      getClass: () => ({ name: 'TestHttpController' }),
      getHandler: jest.fn(),
      switchToHttp: () =>
        ({
          getRequest: () => request,
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
    const spyStartTimer = jest.spyOn(histogramService, 'startTimer');
    const spyIncrement = jest.spyOn(counterService, 'increment');

    await interceptor.intercept(host, handler);

    expect(spy).toHaveBeenCalledTimes(0);
    expect(spyStartTimer).toHaveBeenCalledTimes(0);
    expect(spyIncrement).toHaveBeenCalledTimes(0);
    expect(HttpRequestHelper.getAsyncContext(request)).toBeUndefined();

    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(() => {
      return {
        HttpPrometheus: true,
      };
    });
    host.getType = jest.fn().mockImplementation(() => 'http');

    await interceptor.intercept(host, handler);

    expect(spy).toHaveBeenCalledTimes(0);
    expect(spyStartTimer).toHaveBeenCalledTimes(0);
    expect(spyIncrement).toHaveBeenCalledTimes(0);
    expect(HttpRequestHelper.getAsyncContext(request)).toBeUndefined();
  });

  it('response success', async () => {
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

    const spyStartTimer = jest.spyOn(histogramService, 'startTimer');
    const spyIncrement = jest.spyOn(counterService, 'increment');

    (await interceptor.intercept(host, handler)).subscribe();

    expect(HttpRequestHelper.getAsyncContext(request)).toEqual(asyncContext);
    expect(spyStartTimer).toHaveBeenCalledWith(HTTP_INTERNAL_REQUEST_DURATIONS, {
      labels: {
        method: 'GET',
        service: 'TestHttpController',
        pathname: 'api/test',
      },
    });
    expect(spyIncrement).toHaveBeenCalledTimes(0);
  });

  it('response error', async () => {
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

    const spyStartTimer = jest.spyOn(histogramService, 'startTimer');
    const spyIncrement = jest.spyOn(counterService, 'increment');

    (await interceptor.intercept(host, handler)).subscribe({
      next: jest.fn(),
      error: jest.fn(),
    });

    expect(spyHeadersAdapter).toHaveBeenCalledTimes(0);
    expect(spyStartTimer).toHaveBeenCalledWith(HTTP_INTERNAL_REQUEST_DURATIONS, {
      labels: {
        method: 'GET',
        service: 'TestHttpController',
        pathname: 'api/test',
      },
    });
    expect(spyIncrement).toHaveBeenCalledWith(HTTP_INTERNAL_REQUEST_FAILED, {
      labels: {
        method: 'GET',
        service: 'TestHttpController',
        pathname: 'api/test',
        statusCode: '500',
      },
    });
  });
});
