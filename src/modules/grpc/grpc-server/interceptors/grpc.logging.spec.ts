import { Observable } from 'rxjs';
import { faker } from '@faker-js/faker';
import { Metadata, status as GrpcStatus } from '@grpc/grpc-js';
import { ExecutionContext } from '@nestjs/common';
import { CallHandler, RpcArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { IGeneralAsyncContext, IHeaders, LoggerMarkers } from 'src/modules/common';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ElkLoggerModule,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
  TraceSpanBuilder,
} from 'src/modules/elk-logger';
import { GrpcHeadersToAsyncContextAdapter, IGrpcHeadersToAsyncContextAdapter } from 'src/modules/grpc/grpc-common';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { grpcHeadersFactory, grpcMetadataFactory } from 'tests/modules/grpc/grpc-common';
import { GrpcLogging } from './grpc.logging';
import { GrpcMetadataHelper } from '../helpers/grpc.metadata.helper';
import { GRPC_SERVER_HEADERS_ADAPTER_DI, GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI } from '../types/tokens';
import { GrpcResponseHandler } from '../filters/grpc.response.handler';
import { GrpcMetadataResponseBuilder } from '../builders/grpc.metadata-response.builder';

describe(GrpcLogging.name, () => {
  let reflector: Reflector;

  const requestData = {
    data: {
      query: 'Петр',
    },
  };
  let asyncContext: IGeneralAsyncContext;
  let headers: IHeaders;
  let requestMetadata: Metadata;
  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let host: ExecutionContext;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: CallHandler<any>;

  let headersAdapter: IGrpcHeadersToAsyncContextAdapter;
  let responseHandler: GrpcResponseHandler;
  let interceptor: GrpcLogging;

  beforeEach(async () => {
    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      imports: [ConfigModule, ElkLoggerModule.forRoot()],
      providers: [
        {
          provide: GRPC_SERVER_HEADERS_ADAPTER_DI,
          useClass: GrpcHeadersToAsyncContextAdapter,
        },
        {
          provide: GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI,
          useClass: GrpcMetadataResponseBuilder,
        },
        GrpcResponseHandler,
        GrpcLogging,
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

    headersAdapter = module.get(GRPC_SERVER_HEADERS_ADAPTER_DI);
    responseHandler = module.get(GrpcResponseHandler);
    interceptor = module.get(GrpcLogging);

    asyncContext = generalAsyncContextFactory.build(
      TraceSpanBuilder.build({
        initialSpanId: faker.string.uuid(),
      }) as unknown as IGeneralAsyncContext,
    );

    headers = grpcHeadersFactory.build(
      {},
      {
        transient: {
          ...asyncContext,
        },
      },
    );

    requestMetadata = grpcMetadataFactory.build(headers);

    host = {
      getClass: () => ({ name: 'TestGrpcController' }),
      getHandler: jest.fn(),
      switchToRpc: () =>
        ({
          getData: () => requestData,
          getContext: () => requestMetadata,
        }) as undefined as RpcArgumentsHost,
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
    host.getType = jest.fn().mockImplementation(() => 'http');

    const spy = jest.spyOn(host, 'switchToRpc');
    await interceptor.intercept(host, handler);

    expect(spy).toHaveBeenCalledTimes(0);

    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(() => {
      return {
        GrpcLogging: true,
      };
    });
    host.getType = jest.fn().mockImplementation(() => 'rpc');

    await interceptor.intercept(host, handler);

    expect(spy).toHaveBeenCalledTimes(0);
  });

  it('logging success', async () => {
    host.getType = jest.fn().mockImplementation(() => 'rpc');

    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(() => {
      return {};
    });

    jest.spyOn(reflector, 'get').mockImplementation(() => {
      return [
        {
          service: 'TestService',
          rpc: 'Main',
        },
      ];
    });

    jest.spyOn(headersAdapter, 'adapt').mockImplementation(() => asyncContext);

    handler.handle = jest.fn().mockImplementation(() => {
      return new Observable((subscriber) => {
        subscriber.next({ status: 'ok' });
      });
    });

    const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
    const spyLoggerInfo = jest.spyOn(logger, 'info');
    const spyLoggingResponse = jest.spyOn(responseHandler, 'loggingResponse');
    const spyHandleError = jest.spyOn(responseHandler, 'handleError');

    (await interceptor.intercept(host, handler)).subscribe();

    expect(GrpcMetadataHelper.getAsyncContext(requestMetadata)).toEqual(asyncContext);

    expect(spyLoggerBuilder).toHaveBeenCalledWith({
      module: 'TestGrpcController',
      markers: [LoggerMarkers.INTERNAL],
      traceId: asyncContext.traceId,
      spanId: asyncContext.spanId,
      parentSpanId: asyncContext.spanId,
      initialSpanId: asyncContext.initialSpanId,
      payload: {
        request: {
          service: 'TestService',
          method: 'Main',
          headers: requestMetadata.getMap(),
          data: {
            ...requestData,
          },
        },
      },
    });

    expect(spyLoggerInfo).toHaveBeenCalledWith('gRPC request', { markers: [LoggerMarkers.REQUEST] });

    expect(spyHandleError).toHaveBeenCalledTimes(0);
    expect(spyLoggingResponse).toHaveBeenCalledWith(GrpcStatus.OK, {
      module: 'TestGrpcController',
      markers: [LoggerMarkers.INTERNAL],
      traceId: asyncContext.traceId,
      spanId: asyncContext.spanId,
      parentSpanId: asyncContext.spanId,
      initialSpanId: asyncContext.initialSpanId,
      payload: {
        request: {
          service: 'TestService',
          method: 'Main',
          headers: requestMetadata.getMap(),
          data: {
            ...requestData,
          },
        },
        response: { data: { status: 'ok' } },
      },
    });
  });

  it('logging filed', async () => {
    const spyAdapter = jest.spyOn(headersAdapter, 'adapt');

    GrpcMetadataHelper.setAsyncContext(asyncContext, requestMetadata);

    host.getType = jest.fn().mockImplementation(() => 'rpc');

    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(() => {
      return {};
    });

    jest.spyOn(reflector, 'get').mockImplementation(() => {
      return [
        {
          service: 'TestService',
          rpc: 'Main',
        },
      ];
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

    const spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
    const spyHandleError = jest.spyOn(responseHandler, 'handleError');

    (await interceptor.intercept(host, handler)).subscribe({
      next: jest.fn(),
      error: jest.fn(),
    });

    expect(spyAdapter).toHaveBeenCalledTimes(0);

    expect(spyLoggerBuilder).toHaveBeenCalledWith({
      module: 'TestGrpcController',
      markers: [LoggerMarkers.INTERNAL],
      traceId: asyncContext.traceId,
      spanId: asyncContext.spanId,
      parentSpanId: asyncContext.spanId,
      initialSpanId: asyncContext.initialSpanId,
      payload: {
        request: {
          service: 'TestService',
          method: 'Main',
          headers: requestMetadata.getMap(),
          data: {
            ...requestData,
          },
        },
      },
    });

    expect(spyHandleError).toHaveBeenCalledWith(error, host, {
      module: 'TestGrpcController',
      markers: [LoggerMarkers.INTERNAL],
      traceId: asyncContext.traceId,
      spanId: asyncContext.spanId,
      parentSpanId: asyncContext.spanId,
      initialSpanId: asyncContext.initialSpanId,
      payload: {
        request: {
          service: 'TestService',
          method: 'Main',
          headers: requestMetadata.getMap(),
          data: {
            ...requestData,
          },
        },
      },
    });
  });
});
