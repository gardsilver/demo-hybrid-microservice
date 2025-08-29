import { merge } from 'ts-deepmerge';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { ExecutionContext, CallHandler, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Test } from '@nestjs/testing';
import { IGeneralAsyncContext, IHeaders } from 'src/modules/common';
import {
  HttHeadersHelper,
  HttpHeadersToAsyncContextAdapter,
  IHttpHeadersToAsyncContextAdapter,
} from 'src/modules/http/http-common';
import { requestFactory, responseFactory } from 'tests/express';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { HttpHeadersResponseBuilder } from '../builders/http.headers-response.builder';
import { HttpRequestHelper } from '../helpers/http.request.helper';
import { HttpResponseHelper } from '../helpers/http.response.helper';
import { HttpHeadersResponse } from './http.response-headers';
import { IHttpHeadersResponseBuilder } from '../types/types';
import { HTTP_SERVER_HEADERS_ADAPTER_DI, HTTP_SERVER_HEADERS_RESPONSE_BUILDER_DI } from '../types/tokens';

describe(HttpHeadersResponse.name, () => {
  let reflector: Reflector;

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: CallHandler<any>;
  let headersAdapter: IHttpHeadersToAsyncContextAdapter;
  let headersResponseBuilder: IHttpHeadersResponseBuilder;
  let interceptor: HttpHeadersResponse;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: HTTP_SERVER_HEADERS_ADAPTER_DI,
          useClass: HttpHeadersToAsyncContextAdapter,
        },
        {
          provide: HTTP_SERVER_HEADERS_RESPONSE_BUILDER_DI,
          useClass: HttpHeadersResponseBuilder,
        },
        HttpHeadersResponse,
      ],
    }).compile();

    await module.init();

    reflector = module.get(Reflector);
    headersAdapter = module.get(HTTP_SERVER_HEADERS_ADAPTER_DI);
    headersResponseBuilder = module.get(HTTP_SERVER_HEADERS_RESPONSE_BUILDER_DI);
    interceptor = module.get(HttpHeadersResponse);

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
    const spyHeadersResponseBuilder = jest.spyOn(headersResponseBuilder, 'build');
    const spyAddHeaders = jest.spyOn(HttpResponseHelper, 'addHeaders');

    await interceptor.intercept(host, handler);

    expect(spy).toHaveBeenCalledTimes(0);
    expect(spyHeadersResponseBuilder).toHaveBeenCalledTimes(0);
    expect(HttpRequestHelper.getAsyncContext(request)).toBeUndefined();

    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(() => {
      return {
        HttpHeadersResponse: true,
      };
    });
    host.getType = jest.fn().mockImplementation(() => 'http');

    await interceptor.intercept(host, handler);

    expect(spy).toHaveBeenCalledTimes(0);
    expect(spyHeadersResponseBuilder).toHaveBeenCalledTimes(0);
    expect(spyAddHeaders).toHaveBeenCalledTimes(0);
    expect(HttpRequestHelper.getAsyncContext(request)).toBeUndefined();
    expect(headers).toEqual(srcHeaders);
  });

  it('success', async () => {
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

    const spyHeadersResponseBuilder = jest.spyOn(headersResponseBuilder, 'build').mockImplementation(() => {
      return {
        customHeader: 'value',
      };
    });
    const spyAddHeaders = jest.spyOn(HttpResponseHelper, 'addHeaders');

    (await interceptor.intercept(host, handler)).subscribe();

    expect(HttpRequestHelper.getAsyncContext(request)).toEqual(asyncContext);

    expect(spyHeadersResponseBuilder).toHaveBeenCalledWith({
      asyncContext,
      headers: HttHeadersHelper.normalize(srcHeaders),
    });

    expect(spyAddHeaders).toHaveBeenCalledWith({ customHeader: 'value' }, response);
    expect(headers).not.toEqual(srcHeaders);
  });

  it('error', async () => {
    HttpRequestHelper.setAsyncContext(asyncContext, request);

    const spyHeadersAdapter = jest.spyOn(headersAdapter, 'adapt');
    host.getType = jest.fn().mockImplementation(() => 'http');

    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(() => {
      return {};
    });

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

    const spyHeadersResponseBuilder = jest.spyOn(headersResponseBuilder, 'build').mockImplementation(() => {
      return {
        customHeader: 'value',
      };
    });
    const spyAddHeaders = jest.spyOn(HttpResponseHelper, 'addHeaders');

    (await interceptor.intercept(host, handler)).subscribe({
      next: jest.fn(),
      error: jest.fn(),
    });

    expect(spyHeadersAdapter).toHaveBeenCalledTimes(0);

    expect(spyHeadersResponseBuilder).toHaveBeenCalledWith({
      asyncContext,
      headers: HttHeadersHelper.normalize(srcHeaders),
    });

    expect(spyAddHeaders).toHaveBeenCalledWith({ customHeader: 'value' }, response);
    expect(headers).not.toEqual(srcHeaders);
  });
});
