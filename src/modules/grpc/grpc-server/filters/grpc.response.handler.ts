import { ArgumentsHost, Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { StatusBuilder, status as GrpcStatus, MetadataValue, Metadata } from '@grpc/grpc-js';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  IElkLoggerServiceBuilder,
  ILogFields,
  LogFieldsHelper,
  TraceSpanBuilder,
} from 'src/modules/elk-logger';
import { IGeneralAsyncContext, IHeadersToContextAdapter, IKeyValue, LoggerMarkers } from 'src/modules/common';
import { GrpcHeadersHelper } from 'src/modules//grpc/grpc-common';
import { GrpcMetadataHelper } from '../helpers/grpc.metadata.helper';
import { IGrpcMetadataResponseBuilder } from '../types/types';
import { GRPC_SERVER_HEADERS_ADAPTER_DI, GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI } from '../types/tokens';

const StatusErrorAsCode = {
  'Forbidden resource': GrpcStatus.UNAUTHENTICATED,
};

@Injectable()
export class GrpcResponseHandler {
  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI)
    protected readonly loggerBuilder: IElkLoggerServiceBuilder,
    @Inject(GRPC_SERVER_HEADERS_ADAPTER_DI)
    private readonly headersAdapter: IHeadersToContextAdapter<IGeneralAsyncContext>,
    @Inject(GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI)
    protected readonly grpcMetadataResponseBuilder: IGrpcMetadataResponseBuilder,
  ) {}

  public loggingResponse(rpcCode: GrpcStatus, fieldsLogs?: ILogFields): void {
    const logger = this.loggerBuilder.build({
      module: `${GrpcResponseHandler.name}`,
      ...fieldsLogs,
    });

    switch (rpcCode) {
      case GrpcStatus.OK:
        logger.info('gRPC response success', {
          markers: [LoggerMarkers.RESPONSE, LoggerMarkers.SUCCESS],
        });
        break;
      case GrpcStatus.NOT_FOUND:
        logger.warn('gRPC response success', {
          markers: [LoggerMarkers.RESPONSE, LoggerMarkers.SUCCESS],
        });
        break;
      default:
        logger.error('gRPC response error', {
          markers: [LoggerMarkers.RESPONSE, LoggerMarkers.ERROR],
        });

        break;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public handleError(exception: any, host: ArgumentsHost, fieldsLogs?: ILogFields): RpcException {
    const rpc = host.switchToRpc();
    const request = rpc.getData();
    const metadata = rpc.getContext();
    const headers = GrpcHeadersHelper.normalize(metadata.getMap());

    let asyncContext: IGeneralAsyncContext = GrpcMetadataHelper.getAsyncContext<IGeneralAsyncContext>(metadata);

    if (asyncContext === undefined) {
      asyncContext = this.headersAdapter.adapt(headers);
      GrpcMetadataHelper.setAsyncContext(asyncContext, metadata);
    }

    const ts = TraceSpanBuilder.build(asyncContext);

    const metadataResponse = this.grpcMetadataResponseBuilder.build({
      asyncContext,
      metadata,
    });

    let resolvedError;
    let parentError;
    let rpcCode = GrpcStatus.UNKNOWN;

    let response: IKeyValue = {};

    if (exception instanceof RpcException) {
      resolvedError = exception;

      response = {
        ...response,
        message: exception.message,
      };

      const responseStatus = exception.getError();
      if (typeof responseStatus === 'string') {
        response = {
          ...response,
          data: responseStatus,
        };

        rpcCode = StatusErrorAsCode[responseStatus] ?? GrpcStatus.UNKNOWN;

        resolvedError['error'] = new StatusBuilder()
          .withCode(rpcCode)
          .withDetails(responseStatus)
          .withMetadata(metadataResponse)
          .build();
      } else {
        response = {
          ...response,
          ...responseStatus,
        };

        if ('metadata' in responseStatus && responseStatus['metadata'] instanceof Metadata) {
          for (const [k, v] of Object.entries(responseStatus['metadata'].getMap())) {
            metadataResponse.set(k, v as undefined as MetadataValue);
          }
          delete response['metadata'];
          response['headers'] = GrpcHeadersHelper.normalize(metadataResponse.getMap());
          resolvedError.getError()['metadata'] = metadataResponse;
        }
        if (responseStatus['code'] && typeof responseStatus['code'] === 'number') {
          rpcCode = responseStatus['code'];
        }
      }
    } else {
      parentError = exception;
      rpcCode = GrpcStatus.INTERNAL;
      resolvedError = new RpcException(
        new StatusBuilder()
          .withCode(rpcCode)
          .withDetails('Internal Server Error')
          .withMetadata(metadataResponse)
          .build(),
      );
    }

    this.loggingResponse(
      rpcCode,
      LogFieldsHelper.merge(fieldsLogs, {
        ...ts,
        payload: {
          request: {
            headers,
            data: {
              ...request,
            },
          },
          response: {
            ...response,
            code: rpcCode,
            headers: GrpcHeadersHelper.normalize(metadataResponse.getMap()),
          },
          exception: parentError,
          error: resolvedError,
        },
      }),
    );

    return resolvedError;
  }
}
