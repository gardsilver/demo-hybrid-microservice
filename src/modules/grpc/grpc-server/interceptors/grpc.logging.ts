import { Observable, tap, catchError, throwError } from 'rxjs';
import { Metadata, status as GrpcStatus } from '@grpc/grpc-js';
import { CallHandler, ExecutionContext, Inject, NestInterceptor } from '@nestjs/common';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { Reflector } from '@nestjs/core';
import { getSkipInterceptors, IGeneralAsyncContext, IHeadersToContextAdapter, LoggerMarkers } from 'src/modules/common';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  IElkLoggerServiceBuilder,
  ILogFields,
  TraceSpanBuilder,
} from 'src/modules/elk-logger';
import { GrpcHeadersHelper } from 'src/modules//grpc/grpc-common';
import { GrpcMetadataHelper } from '../helpers/grpc.metadata.helper';
import { GRPC_SERVER_HEADERS_ADAPTER_DI } from '../types/tokens';
import { GrpcResponseHandler } from '../filters/grpc.response.handler';

export class GrpcLogging implements NestInterceptor {
  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI)
    private readonly loggerBuilder: IElkLoggerServiceBuilder,
    @Inject(GRPC_SERVER_HEADERS_ADAPTER_DI)
    private readonly headersAdapter: IHeadersToContextAdapter<IGeneralAsyncContext>,
    private readonly responseHandler: GrpcResponseHandler,
    private readonly reflector: Reflector,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
    if (
      context.getType() !== 'rpc' ||
      getSkipInterceptors(context, this.reflector)['All'] ||
      getSkipInterceptors(context, this.reflector)['GrpcLogging']
    ) {
      return next.handle();
    }
    const rpc = context.switchToRpc();
    const request = rpc.getData();
    const metadata = rpc.getContext<Metadata>();
    const handler = context.getHandler();
    const handlerType = context.getClass();
    const headers = GrpcHeadersHelper.normalize(metadata.getMap());
    const pattern = this.reflector.get(PATTERN_METADATA, handler)[0];

    let asyncContext: IGeneralAsyncContext = GrpcMetadataHelper.getAsyncContext<IGeneralAsyncContext>(metadata);

    if (asyncContext === undefined) {
      asyncContext = this.headersAdapter.adapt(headers);
      GrpcMetadataHelper.setAsyncContext(asyncContext, metadata);
    }

    const ts = TraceSpanBuilder.build(asyncContext);

    const fields: ILogFields = {
      module: handlerType.name,
      markers: [LoggerMarkers.INTERNAL],
      ...ts,
      payload: {
        request: {
          service: pattern.service,
          method: pattern.rpc,
          headers,
          data: {
            ...request,
          },
        },
      },
    };

    const logger = this.loggerBuilder.build(fields);

    logger.info('gRPC request', { markers: [LoggerMarkers.REQUEST] });

    return next.handle().pipe(
      tap((data) => {
        this.responseHandler.loggingResponse(GrpcStatus.OK, {
          ...fields,
          payload: {
            ...fields.payload,
            response: { data },
          },
        });
      }),
      catchError((error) => {
        return throwError(() => this.responseHandler.handleError(error, context, fields));
      }),
    );
  }
}
