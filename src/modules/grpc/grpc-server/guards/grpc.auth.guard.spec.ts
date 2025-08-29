// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require('jsonwebtoken');
import { faker } from '@faker-js/faker';
import { Metadata } from '@grpc/grpc-js';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RpcArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IGeneralAsyncContext } from 'src/modules/common';
import { AccessRoles, AUTH_SERVICE_DI, AuthModule, IAuthService } from 'src/modules/auth';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ElkLoggerModule,
  IElkLoggerService,
  TraceSpanBuilder,
} from 'src/modules/elk-logger';
import { AUTHORIZATION_HEADER_NAME, BEARER_NAME } from 'src/modules/http/http-common';
import { GrpcHeadersToAsyncContextAdapter, IGrpcHeadersToAsyncContextAdapter } from 'src/modules/grpc/grpc-common';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { GrpcAuthGuard } from './grpc.auth.guard';
import { GrpcMetadataResponseBuilder } from '../builders/grpc.metadata-response.builder';
import { GrpcMetadataHelper } from '../helpers/grpc.metadata.helper';
import { GRPC_SERVER_HEADERS_ADAPTER_DI, GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI } from '../types/tokens';

describe(GrpcAuthGuard.name, () => {
  let reflector: Reflector;

  const requestData = {
    data: {
      query: 'Петр',
    },
  };
  let asyncContext: IGeneralAsyncContext;
  let requestMetadata: Metadata;
  let logger: IElkLoggerService;
  let host: ExecutionContext;
  let authService: IAuthService;
  let headersAdapter: IGrpcHeadersToAsyncContextAdapter;
  let guard: GrpcAuthGuard;
  let token;

  beforeEach(async () => {
    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      imports: [ConfigModule, AuthModule.forRoot(), ElkLoggerModule.forRoot()],
      providers: [
        {
          provide: GRPC_SERVER_HEADERS_ADAPTER_DI,
          useClass: GrpcHeadersToAsyncContextAdapter,
        },
        {
          provide: GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI,
          useClass: GrpcMetadataResponseBuilder,
        },
        GrpcAuthGuard,
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
    headersAdapter = module.get(GRPC_SERVER_HEADERS_ADAPTER_DI);
    guard = module.get(GrpcAuthGuard);

    token = authService.getJwtToken({
      roles: [AccessRoles.USER],
    });

    asyncContext = generalAsyncContextFactory.build(
      TraceSpanBuilder.build({
        initialSpanId: faker.string.uuid(),
      }) as unknown as IGeneralAsyncContext,
    );

    const metadataBuilder = module.get(GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI);

    requestMetadata = metadataBuilder.build({ asyncContext });

    host = {
      getClass: () => 'TestGrpcController',
      getHandler: jest.fn(),
      switchToRpc: () =>
        ({
          getData: () => requestData,
          getContext: () => requestMetadata,
        }) as undefined as RpcArgumentsHost,
    } as undefined as ExecutionContext;

    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(reflector).toBeDefined();
    expect(guard).toBeDefined();
  });

  it('ignore', async () => {
    host.getType = jest.fn().mockImplementation(() => 'http');

    expect(await guard.canActivate(host)).toBeTruthy();
    expect(GrpcMetadataHelper.getAsyncContext(requestMetadata)).toBeUndefined();
  });

  it('skip', async () => {
    jest.spyOn(headersAdapter, 'adapt').mockImplementation(() => {
      return asyncContext;
    });
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(() => {
      return {
        GrpcAuthGuard: true,
      };
    });
    host.getType = jest.fn().mockImplementation(() => 'rpc');

    expect(await guard.canActivate(host)).toBeTruthy();

    expect(GrpcMetadataHelper.getAuthInfo(requestMetadata)).toEqual({
      status: 'tokenAbsent',
    });
    expect(GrpcMetadataHelper.getAsyncContext(requestMetadata)).toEqual(asyncContext);
  });

  it('forbidden', async () => {
    jest.spyOn(headersAdapter, 'adapt').mockImplementation(() => {
      return asyncContext;
    });
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(() => {
      return {};
    });
    host.getType = jest.fn().mockImplementation(() => 'rpc');
    requestMetadata.set(AUTHORIZATION_HEADER_NAME, BEARER_NAME + ' token');

    expect(await guard.canActivate(host)).toBeFalsy();

    expect(GrpcMetadataHelper.getAuthInfo(requestMetadata)).toEqual({
      status: 'tokenParseError',
    });

    requestMetadata.set(AUTHORIZATION_HEADER_NAME, BEARER_NAME + ' ' + jwt.sign({}, 'certificate'));
    expect(await guard.canActivate(host)).toBeFalsy();

    expect(GrpcMetadataHelper.getAuthInfo(requestMetadata)).toEqual({
      status: 'verifyFailed',
    });
    expect(GrpcMetadataHelper.getAsyncContext(requestMetadata)).toEqual(asyncContext);
  });

  it('success', async () => {
    const spyHeadersAdapt = jest.spyOn(headersAdapter, 'adapt');

    GrpcMetadataHelper.setAsyncContext(asyncContext, requestMetadata);
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(() => {
      return {};
    });
    host.getType = jest.fn().mockImplementation(() => 'rpc');
    requestMetadata.set(AUTHORIZATION_HEADER_NAME, BEARER_NAME + ' ' + token);

    expect(await guard.canActivate(host)).toBeTruthy();

    expect(GrpcMetadataHelper.getAuthInfo(requestMetadata)).toEqual({
      status: 'success',
      roles: ['user'],
    });
    expect(spyHeadersAdapt).toHaveBeenCalledTimes(0);
  });
});
