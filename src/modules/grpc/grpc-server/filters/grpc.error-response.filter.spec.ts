import { faker } from '@faker-js/faker';
import { Metadata } from '@grpc/grpc-js';
import { Test } from '@nestjs/testing';
import { ArgumentsHost } from '@nestjs/common';
import { RpcArgumentsHost } from '@nestjs/common/interfaces';
import { BaseRpcExceptionFilter, RpcException } from '@nestjs/microservices';
import { IGeneralAsyncContext, LoggerMarkers } from 'src/modules/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerService, TraceSpanBuilder } from 'src/modules/elk-logger';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { GrpcErrorResponseFilter } from './grpc.error-response.filter';
import { GrpcMetadataResponseBuilder } from '../builders/grpc.metadata-response.builder';
import { GRPC_SERVER_HEADERS_ADAPTER_DI, GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI } from '../types/tokens';
import { GrpcHeadersToAsyncContextAdapter } from '../../grpc-common';
import { GrpcResponseHandler } from './grpc.response.handler';
import { IGrpcMetadataResponseBuilder } from '../types/types';

describe(GrpcErrorResponseFilter.name, () => {
  const requestData = {
    data: {
      query: 'Петр',
    },
  };
  let asyncContext: IGeneralAsyncContext;
  let requestMetadata: Metadata;

  let logger: IElkLoggerService;

  let host: ArgumentsHost;
  let metadataBuilder: IGrpcMetadataResponseBuilder;
  let handler: GrpcResponseHandler;
  let filter: GrpcErrorResponseFilter;

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
        GrpcErrorResponseFilter,
      ],
    }).compile();

    metadataBuilder = module.get(GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI);
    handler = module.get(GrpcResponseHandler);
    filter = module.get(GrpcErrorResponseFilter);

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
  });

  it('init', async () => {
    expect(filter).toBeDefined();
  });

  it('ignore', async () => {
    const error = new Error('test error');

    host.getType = jest.fn().mockImplementation(() => 'http');

    const spyHandleError = jest.spyOn(handler, 'handleError');
    const spyBaseCatch = jest.spyOn(BaseRpcExceptionFilter.prototype, 'catch');

    filter.catch(error, host);

    expect(spyHandleError).toHaveBeenCalledTimes(0);
    expect(spyBaseCatch).toHaveBeenCalledTimes(0);
  });

  it('handleError', async () => {
    const error = new Error('test error');
    const handleError = new RpcException('Test error');

    host.getType = jest.fn().mockImplementation(() => 'rpc');

    const spyHandleError = jest.spyOn(handler, 'handleError').mockImplementation(() => handleError);
    const spyBaseCatch = jest.spyOn(BaseRpcExceptionFilter.prototype, 'catch');

    filter.catch(error, host);

    expect(spyHandleError).toHaveBeenCalledWith(error, host, {
      markers: [LoggerMarkers.INTERNAL],
      module: 'GrpcErrorResponseFilter.catch',
    });
    expect(spyBaseCatch).toHaveBeenCalledWith(handleError, host);
  });
});
