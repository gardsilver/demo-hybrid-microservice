// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require('jsonwebtoken');
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Test } from '@nestjs/testing';
import { IGeneralAsyncContext, IHeaders } from 'src/modules/common';
import { AccessRoles, AUTH_SERVICE_DI, AuthModule, IAuthService } from 'src/modules/auth';
import { ELK_LOGGER_SERVICE_BUILDER_DI, ElkLoggerModule, IElkLoggerService } from 'src/modules/elk-logger';
import {
  AUTHORIZATION_HEADER_NAME,
  BEARER_NAME,
  HttHeadersHelper,
  HttpHeadersToAsyncContextAdapter,
  IHttpHeadersToAsyncContextAdapter,
} from 'src/modules/http/http-common';
import { MockConfigService } from 'tests/nestjs';
import { requestFactory } from 'tests/express-js';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { HttpAuthGuard } from './http.auth.guard';
import { HttpRequestHelper } from '../helpers/http.request.helper';
import { HTTP_SERVER_HEADERS_ADAPTER_DI } from '../types/tokens';

describe(HttpAuthGuard.name, () => {
  let reflector: Reflector;

  const requestData = {
    data: {
      query: 'Петр',
    },
  };
  let asyncContext: IGeneralAsyncContext;
  let request: Request;
  let headers: IHeaders;
  let logger: IElkLoggerService;
  let host: ExecutionContext;
  let authService: IAuthService;
  let headersAdapter: IHttpHeadersToAsyncContextAdapter;
  let guard: HttpAuthGuard;
  let token;

  beforeEach(async () => {
    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      imports: [ConfigModule, AuthModule.forRoot(), ElkLoggerModule.forRoot()],
      providers: [
        {
          provide: HTTP_SERVER_HEADERS_ADAPTER_DI,
          useClass: HttpHeadersToAsyncContextAdapter,
        },
        HttpAuthGuard,
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
    authService = module.get(AUTH_SERVICE_DI);
    headersAdapter = module.get(HTTP_SERVER_HEADERS_ADAPTER_DI);
    guard = module.get(HttpAuthGuard);

    token = authService.getJwtToken({
      roles: [AccessRoles.USER],
    });

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

    host = {
      getClass: () => 'TestHttpController',
      getHandler: jest.fn(),
      switchToHttp: () =>
        ({
          getRequest: () => request,
          getResponse: jest.fn(),
          getNext: jest.fn(),
        }) as undefined as HttpArgumentsHost,
    } as undefined as ExecutionContext;

    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(reflector).toBeDefined();
    expect(guard).toBeDefined();
  });

  it('ignore', async () => {
    host.getType = jest.fn().mockImplementation(() => 'rpc');

    expect(await guard.canActivate(host)).toBeTruthy();
    expect(HttpRequestHelper.getAsyncContext(request)).toBeUndefined();
  });

  it('skip', async () => {
    jest.spyOn(headersAdapter, 'adapt').mockImplementation(() => {
      return asyncContext;
    });
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(() => {
      return {
        HttpAuthGuard: true,
      };
    });
    host.getType = jest.fn().mockImplementation(() => 'http');

    expect(await guard.canActivate(host)).toBeTruthy();

    expect(HttpRequestHelper.getAuthInfo(request)).toEqual({
      status: 'tokenAbsent',
    });
    expect(HttpRequestHelper.getAsyncContext(request)).toEqual(asyncContext);
  });

  it('forbidden', async () => {
    jest.spyOn(headersAdapter, 'adapt').mockImplementation(() => {
      return asyncContext;
    });

    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(() => {
      return {};
    });
    host.getType = jest.fn().mockImplementation(() => 'http');
    headers[AUTHORIZATION_HEADER_NAME] = `${BEARER_NAME} token`;

    expect(await guard.canActivate(host)).toBeFalsy();

    expect(HttpRequestHelper.getAuthInfo(request)).toEqual({
      status: 'tokenParseError',
    });

    headers[AUTHORIZATION_HEADER_NAME] = BEARER_NAME + ' ' + jwt.sign({}, 'certificate');

    expect(await guard.canActivate(host)).toBeFalsy();

    expect(HttpRequestHelper.getAuthInfo(request)).toEqual({
      status: 'verifyFailed',
    });
    expect(HttpRequestHelper.getAsyncContext(request)).toEqual(asyncContext);
  });

  it('success', async () => {
    const spyHeadersAdapt = jest.spyOn(headersAdapter, 'adapt');

    HttpRequestHelper.setAsyncContext(asyncContext, request);
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(() => {
      return {};
    });

    host.getType = jest.fn().mockImplementation(() => 'http');
    headers[AUTHORIZATION_HEADER_NAME] = BEARER_NAME + ' ' + token;

    expect(await guard.canActivate(host)).toBeTruthy();

    expect(HttpRequestHelper.getAuthInfo(request)).toEqual({
      status: 'success',
      roles: ['user'],
    });
    expect(spyHeadersAdapt).toHaveBeenCalledTimes(0);
  });
});
