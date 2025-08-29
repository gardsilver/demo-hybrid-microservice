import { Metadata, StatusBuilder, status as GrpcStatus } from '@grpc/grpc-js';
import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { ArgumentsHost } from '@nestjs/common';
import { RpcArgumentsHost } from '@nestjs/common/interfaces';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
  ILogFields,
  TraceSpanBuilder,
  TraceSpanHelper,
} from 'src/modules/elk-logger';
import { IGeneralAsyncContext, LoggerMarkers } from 'src/modules/common';
import {
  GrpcHeadersHelper,
  GrpcHeadersToAsyncContextAdapter,
  IGrpcHeadersToAsyncContextAdapter,
} from 'src/modules/grpc/grpc-common';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { GrpcResponseHandler } from './grpc.response.handler';
import { GrpcMetadataResponseBuilder } from '../builders/grpc.metadata-response.builder';
import { GrpcMetadataHelper } from '../helpers/grpc.metadata.helper';
import { GRPC_SERVER_HEADERS_ADAPTER_DI, GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI } from '../types/tokens';
import { IGrpcMetadataResponseBuilder } from '../types/types';

describe(GrpcResponseHandler.name, () => {
  const mockUuid = faker.string.uuid();

  const requestData = {
    data: {
      query: 'Петр',
    },
  };
  let asyncContext: IGeneralAsyncContext;
  let requestMetadata: Metadata;

  let host: ArgumentsHost;

  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;

  let headersAdapter: IGrpcHeadersToAsyncContextAdapter;
  let metadataBuilder: IGrpcMetadataResponseBuilder;
  let handler: GrpcResponseHandler;

  beforeEach(async () => {
    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: ELK_LOGGER_SERVICE_BUILDER_DI,
          useValue: {
            build: () => logger,
          },
        },
        {
          provide: GRPC_SERVER_HEADERS_ADAPTER_DI,
          useClass: GrpcHeadersToAsyncContextAdapter,
        },
        {
          provide: GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI,
          useClass: GrpcMetadataResponseBuilder,
        },
        GrpcResponseHandler,
      ],
    }).compile();

    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);

    headersAdapter = module.get(GRPC_SERVER_HEADERS_ADAPTER_DI);
    metadataBuilder = module.get(GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI);
    handler = module.get(GrpcResponseHandler);

    asyncContext = generalAsyncContextFactory.build(
      TraceSpanBuilder.build({
        initialSpanId: faker.string.uuid(),
      }) as unknown as IGeneralAsyncContext,
    );

    requestMetadata = metadataBuilder.build({ asyncContext });

    host = {
      switchToRpc: () =>
        ({
          getData: () => requestData,
          getContext: () => requestMetadata,
        }) as undefined as RpcArgumentsHost,
    } as undefined as ArgumentsHost;

    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(handler).toBeDefined();
  });

  describe('handleError', () => {
    let spyLoggingResponse;

    beforeEach(async () => {
      spyLoggingResponse = jest.spyOn(handler, 'loggingResponse');
    });

    it('Unknown error', async () => {
      jest.spyOn(TraceSpanHelper, 'generateRandomValue').mockImplementation(() => mockUuid);
      jest.spyOn(headersAdapter, 'adapt').mockImplementation(() => asyncContext);

      const error = new Error('test error');

      const fieldsLogs = {
        index: 'Test Application',
        module: 'TestController',
      } as ILogFields;

      const result = handler.handleError(error, host, fieldsLogs);

      expect(GrpcMetadataHelper.getAsyncContext(requestMetadata)).toEqual(asyncContext);

      expect(result instanceof RpcException).toBeTruthy();
      expect(result.getError()).toEqual({
        code: GrpcStatus.INTERNAL,
        details: 'Internal Server Error',
        metadata: requestMetadata.clone(),
      });

      expect(spyLoggingResponse).toHaveBeenCalledWith(GrpcStatus.INTERNAL, {
        ...fieldsLogs,
        traceId: asyncContext.traceId,
        spanId: asyncContext.spanId,
        parentSpanId: asyncContext.spanId,
        initialSpanId: asyncContext.initialSpanId,
        businessData: {},
        markers: [],
        payload: {
          request: {
            headers: GrpcHeadersHelper.normalize(requestMetadata.getMap()),
            data: {
              ...requestData,
            },
          },
          response: {
            code: GrpcStatus.INTERNAL,
            headers: GrpcHeadersHelper.normalize(requestMetadata.getMap()),
          },
          error: result,
          exception: error,
        },
      });
    });

    it('Empty RpcException', async () => {
      jest.spyOn(TraceSpanHelper, 'generateRandomValue').mockImplementation(() => mockUuid);
      const spyAdapter = jest.spyOn(headersAdapter, 'adapt');

      GrpcMetadataHelper.setAsyncContext(asyncContext, requestMetadata);

      const error = new RpcException('Test RpcException');

      const fieldsLogs = {
        index: 'Test Application',
        module: 'TestController',
      } as ILogFields;

      const result = handler.handleError(error, host, fieldsLogs);

      expect(spyAdapter).toHaveBeenCalledTimes(0);

      expect(result).toEqual(error);
      expect(result.getError()).toEqual({
        code: 2,
        details: 'Test RpcException',
        metadata: requestMetadata.clone(),
      });

      expect(spyLoggingResponse).toHaveBeenCalledWith(GrpcStatus.UNKNOWN, {
        ...fieldsLogs,
        traceId: asyncContext.traceId,
        spanId: asyncContext.spanId,
        parentSpanId: asyncContext.spanId,
        initialSpanId: asyncContext.initialSpanId,
        businessData: {},
        markers: [],
        payload: {
          request: {
            headers: GrpcHeadersHelper.normalize(requestMetadata.getMap()),
            data: {
              ...requestData,
            },
          },
          response: {
            code: GrpcStatus.UNKNOWN,
            message: 'Test RpcException',
            data: 'Test RpcException',
            headers: GrpcHeadersHelper.normalize(requestMetadata.getMap()),
          },
          error: result,
        },
      });
    });

    it('RpcException', async () => {
      jest.spyOn(TraceSpanHelper, 'generateRandomValue').mockImplementation(() => mockUuid);
      const spyAdapter = jest.spyOn(headersAdapter, 'adapt');

      GrpcMetadataHelper.setAsyncContext(asyncContext, requestMetadata);

      const error = new RpcException(
        new StatusBuilder()
          .withCode(GrpcStatus.NOT_FOUND)
          .withDetails('Not found')
          .withMetadata(requestMetadata.clone())
          .build(),
      );

      const fieldsLogs = {
        index: 'Test Application',
        module: 'TestController',
      } as ILogFields;

      const result = handler.handleError(error, host, fieldsLogs);

      expect(spyAdapter).toHaveBeenCalledTimes(0);

      expect(result).toEqual(error);
      expect(result.getError()).toEqual({
        code: GrpcStatus.NOT_FOUND,
        details: 'Not found',
        metadata: requestMetadata.clone(),
      });

      expect(spyLoggingResponse).toHaveBeenCalledWith(GrpcStatus.NOT_FOUND, {
        ...fieldsLogs,
        traceId: asyncContext.traceId,
        spanId: asyncContext.spanId,
        parentSpanId: asyncContext.spanId,
        initialSpanId: asyncContext.initialSpanId,
        businessData: {},
        markers: [],
        payload: {
          request: {
            headers: GrpcHeadersHelper.normalize(requestMetadata.getMap()),
            data: {
              ...requestData,
            },
          },
          response: {
            code: GrpcStatus.NOT_FOUND,
            message: 'Rpc Exception',
            details: 'Not found',
            headers: GrpcHeadersHelper.normalize(requestMetadata.getMap()),
          },
          error: result,
        },
      });
    });

    it('RpcException with any', async () => {
      jest.spyOn(TraceSpanHelper, 'generateRandomValue').mockImplementation(() => mockUuid);
      const spyAdapter = jest.spyOn(headersAdapter, 'adapt');

      GrpcMetadataHelper.setAsyncContext(asyncContext, requestMetadata);

      const error = new RpcException({
        status: 'Error',
      });

      const fieldsLogs = {
        index: 'Test Application',
        module: 'TestController',
      } as ILogFields;

      const result = handler.handleError(error, host, fieldsLogs);

      expect(spyAdapter).toHaveBeenCalledTimes(0);

      expect(result).toEqual(error);
      expect(result.getError()).toEqual({
        status: 'Error',
      });

      expect(spyLoggingResponse).toHaveBeenCalledWith(GrpcStatus.UNKNOWN, {
        ...fieldsLogs,
        traceId: asyncContext.traceId,
        spanId: asyncContext.spanId,
        parentSpanId: asyncContext.spanId,
        initialSpanId: asyncContext.initialSpanId,
        businessData: {},
        markers: [],
        payload: {
          request: {
            headers: GrpcHeadersHelper.normalize(requestMetadata.getMap()),
            data: {
              ...requestData,
            },
          },
          response: {
            code: GrpcStatus.UNKNOWN,
            message: 'Rpc Exception',
            status: 'Error',
            headers: GrpcHeadersHelper.normalize(requestMetadata.getMap()),
          },
          error: result,
        },
      });
    });
  });

  describe('loggingResponse', () => {
    let spyLoggerBuilder;
    let spyLogger;

    beforeEach(async () => {
      spyLoggerBuilder = jest.spyOn(loggerBuilder, 'build');
    });

    it('success', async () => {
      spyLogger = jest.spyOn(logger, 'info');

      const fieldsLogs = {
        index: 'Test Application',
        module: 'TestController',
      } as ILogFields;

      handler.loggingResponse(GrpcStatus.OK, fieldsLogs);

      expect(spyLoggerBuilder).toHaveBeenCalledWith(fieldsLogs);
      expect(spyLogger).toHaveBeenCalledWith('gRPC response success', {
        markers: [LoggerMarkers.RESPONSE, LoggerMarkers.SUCCESS],
      });
    });

    it('success as warn', async () => {
      spyLogger = jest.spyOn(logger, 'warn');

      const fieldsLogs = {
        index: 'Test Application',
        module: 'TestController',
      } as ILogFields;

      handler.loggingResponse(GrpcStatus.NOT_FOUND, fieldsLogs);

      expect(spyLoggerBuilder).toHaveBeenCalledWith(fieldsLogs);
      expect(spyLogger).toHaveBeenCalledWith('gRPC response success', {
        markers: [LoggerMarkers.RESPONSE, LoggerMarkers.SUCCESS],
      });
    });

    it('error', async () => {
      spyLogger = jest.spyOn(logger, 'error');

      const fieldsLogs = {
        index: 'Test Application',
        module: 'TestController',
      } as ILogFields;

      handler.loggingResponse(GrpcStatus.INTERNAL, fieldsLogs);

      expect(spyLoggerBuilder).toHaveBeenCalledWith(fieldsLogs);
      expect(spyLogger).toHaveBeenCalledWith('gRPC response error', {
        markers: [LoggerMarkers.RESPONSE, LoggerMarkers.ERROR],
      });
    });
  });
});
