import { Observable } from 'rxjs';
import { faker } from '@faker-js/faker';
import { Metadata, status as GrpcStatus, StatusBuilder } from '@grpc/grpc-js';
import { ExecutionContext } from '@nestjs/common';
import { CallHandler, RpcArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { IGeneralAsyncContext, IHeaders } from 'src/modules/common';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ElkLoggerModule,
  IElkLoggerService,
  TraceSpanBuilder,
} from 'src/modules/elk-logger';
import {
  ICounterService,
  IHistogramService,
  PROMETHEUS_COUNTER_SERVICE_DI,
  PROMETHEUS_HISTOGRAM_SERVICE_DI,
  PrometheusModule,
} from 'src/modules/prometheus';
import { GrpcHeadersToAsyncContextAdapter, IGrpcHeadersToAsyncContextAdapter } from 'src/modules/grpc/grpc-common';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { grpcHeadersFactory, grpcMetadataFactory } from 'tests/modules/grpc/grpc-common';
import { GrpcMetadataHelper } from '../helpers/grpc.metadata.helper';
import { GRPC_SERVER_HEADERS_ADAPTER_DI } from '../types/tokens';
import { GRPC_INTERNAL_REQUEST_DURATIONS, GRPC_INTERNAL_REQUEST_FAILED } from '../types/metrics';
import { GrpcPrometheus } from './grpc.prometheus';

describe(GrpcPrometheus.name, () => {
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
  let host: ExecutionContext;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: CallHandler<any>;

  let headersAdapter: IGrpcHeadersToAsyncContextAdapter;
  let histogramService: IHistogramService;
  let counterService: ICounterService;
  let interceptor: GrpcPrometheus;

  beforeEach(async () => {
    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      imports: [ConfigModule, ElkLoggerModule.forRoot(), PrometheusModule],
      providers: [
        {
          provide: GRPC_SERVER_HEADERS_ADAPTER_DI,
          useClass: GrpcHeadersToAsyncContextAdapter,
        },
        GrpcPrometheus,
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
    headersAdapter = module.get(GRPC_SERVER_HEADERS_ADAPTER_DI);
    histogramService = module.get(PROMETHEUS_HISTOGRAM_SERVICE_DI);
    counterService = module.get(PROMETHEUS_COUNTER_SERVICE_DI);
    interceptor = module.get(GrpcPrometheus);

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
        GrpcPrometheus: true,
      };
    });
    host.getType = jest.fn().mockImplementation(() => 'rpc');

    await interceptor.intercept(host, handler);

    expect(spy).toHaveBeenCalledTimes(0);
  });

  it('response success', async () => {
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

    const spyStartTimer = jest.spyOn(histogramService, 'startTimer');
    const spyIncrement = jest.spyOn(counterService, 'increment');

    (await interceptor.intercept(host, handler)).subscribe();

    expect(GrpcMetadataHelper.getAsyncContext(requestMetadata)).toEqual(asyncContext);
    expect(spyStartTimer).toHaveBeenCalledWith(GRPC_INTERNAL_REQUEST_DURATIONS, {
      labels: {
        service: 'TestService',
        method: 'Main',
      },
    });
    expect(spyIncrement).toHaveBeenCalledTimes(0);
  });

  it('response filed with Unknown Error', async () => {
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

    const spyStartTimer = jest.spyOn(histogramService, 'startTimer');
    const spyIncrement = jest.spyOn(counterService, 'increment');

    (await interceptor.intercept(host, handler)).subscribe({
      next: jest.fn(),
      error: jest.fn(),
    });

    expect(spyAdapter).toHaveBeenCalledTimes(0);

    expect(spyStartTimer).toHaveBeenCalledWith(GRPC_INTERNAL_REQUEST_DURATIONS, {
      labels: {
        service: 'TestService',
        method: 'Main',
      },
    });
    expect(spyIncrement).toHaveBeenCalledWith(GRPC_INTERNAL_REQUEST_FAILED, {
      labels: {
        service: 'TestService',
        method: 'Main',
        statusCode: GrpcStatus.UNKNOWN.toString(),
      },
    });
  });

  it('response filed with RpcException', async () => {
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

    const error = new RpcException(new StatusBuilder().withCode(GrpcStatus.NOT_FOUND).withDetails('Not Found').build());

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

    expect(spyAdapter).toHaveBeenCalledTimes(0);

    expect(spyStartTimer).toHaveBeenCalledWith(GRPC_INTERNAL_REQUEST_DURATIONS, {
      labels: {
        service: 'TestService',
        method: 'Main',
      },
    });
    expect(spyIncrement).toHaveBeenCalledWith(GRPC_INTERNAL_REQUEST_FAILED, {
      labels: {
        service: 'TestService',
        method: 'Main',
        statusCode: GrpcStatus.NOT_FOUND.toString(),
      },
    });
  });
});
