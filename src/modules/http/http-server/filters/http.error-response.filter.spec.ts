import { merge } from 'ts-deepmerge';
import { Request, Response } from 'express';
import { Test } from '@nestjs/testing';
import { BadRequestException, ExecutionContext, HttpStatus } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IGeneralAsyncContext, IHeaders } from 'src/modules/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, ElkLoggerModule, IElkLoggerService } from 'src/modules/elk-logger';
import {
  HttHeadersHelper,
  HttpHeadersToAsyncContextAdapter,
  IHttpHeadersToAsyncContextAdapter,
} from 'src/modules/http/http-common';
import { MockConfigService } from 'tests/nestjs';
import { requestFactory, responseFactory } from 'tests/express-js';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { HttpErrorResponseFilter } from './http.error-response.filter';
import { HttpHeadersResponseBuilder } from '../builders/http.headers-response.builder';
import { HttpRequestHelper } from '../helpers/http.request.helper';
import { HttpResponseHandler } from './http.response.handler';
import { HTTP_SERVER_HEADERS_ADAPTER_DI, HTTP_SERVER_HEADERS_RESPONSE_BUILDER_DI } from '../types/tokens';
import { IHttpHeadersResponseBuilder } from '../types/types';

describe(HttpErrorResponseFilter.name, () => {
  const requestData = {
    data: {
      query: 'Петр',
    },
  };
  let asyncContext: IGeneralAsyncContext;
  let srcHeaders: IHeaders;
  let headers: IHeaders;
  let request: Request;
  let response: Response;
  let host: ExecutionContext;

  let logger: IElkLoggerService;
  let headersResponseBuilder: IHttpHeadersResponseBuilder;
  let headersAdapter: IHttpHeadersToAsyncContextAdapter;
  let filter: HttpErrorResponseFilter;

  beforeEach(async () => {
    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      imports: [ConfigModule, ElkLoggerModule.forRoot()],
      providers: [
        {
          provide: HTTP_SERVER_HEADERS_ADAPTER_DI,
          useClass: HttpHeadersToAsyncContextAdapter,
        },
        {
          provide: HTTP_SERVER_HEADERS_RESPONSE_BUILDER_DI,
          useClass: HttpHeadersResponseBuilder,
        },
        HttpResponseHandler,
        HttpErrorResponseFilter,
      ],
    })
      .overrideProvider(ConfigService)
      .useValue(new MockConfigService())
      .overrideProvider(ELK_LOGGER_SERVICE_BUILDER_DI)
      .useValue({
        build: () => logger,
      })
      .compile();

    headersResponseBuilder = module.get(HTTP_SERVER_HEADERS_RESPONSE_BUILDER_DI);
    headersAdapter = module.get(HTTP_SERVER_HEADERS_ADAPTER_DI);
    filter = module.get(HttpErrorResponseFilter);

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
    srcHeaders = merge({}, headers);

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
      getType: () => 'http',
      getClass: () => 'TestHttpController',
      getHandler: jest.fn(),
      switchToHttp: () =>
        ({
          getRequest: () => request,
          getResponse: () => response,
          getNext: jest.fn(),
        }) as undefined as HttpArgumentsHost,
    } as undefined as ExecutionContext;

    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(filter).toBeDefined();
  });

  it('default', async () => {
    const error = new Error('Test error');

    jest.spyOn(headersAdapter, 'adapt').mockImplementation(() => {
      return asyncContext;
    });
    jest.spyOn(headersResponseBuilder, 'build').mockImplementation(() => {
      return {
        custom: 'value',
      };
    });

    const spySend = jest.spyOn(response, 'send');

    filter.catch(error, host);

    expect(headers).toEqual({
      ...srcHeaders,
      custom: 'value',
    });
    expect(HttpRequestHelper.getAsyncContext<IGeneralAsyncContext>(request)).toEqual(asyncContext);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((response as undefined as any)?.getStatus()).toEqual(500);
    expect(spySend).toHaveBeenCalledWith({ error: 'Test error', message: 'Internal Server Error', statusCode: 500 });
  });

  it('HttpException', async () => {
    const error = new BadRequestException('Test error');
    HttpRequestHelper.setAsyncContext(asyncContext, request);

    const spyAdapt = jest.spyOn(headersAdapter, 'adapt');
    jest.spyOn(headersResponseBuilder, 'build').mockImplementation(() => {
      return {
        custom: 'value',
      };
    });

    const spySend = jest.spyOn(response, 'send');

    filter.catch(error, host);

    expect(headers).toEqual({
      ...srcHeaders,
      custom: 'value',
    });
    expect(spyAdapt).toHaveBeenCalledTimes(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((response as undefined as any)?.getStatus()).toEqual(400);
    expect(spySend).toHaveBeenCalledWith({ error: 'Bad Request', message: 'Test error', statusCode: 400 });
  });
});
