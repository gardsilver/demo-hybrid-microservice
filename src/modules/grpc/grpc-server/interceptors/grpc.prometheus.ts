import { Observable, catchError, throwError, finalize } from 'rxjs';
import { Metadata, status as GrpcStatus } from '@grpc/grpc-js';
import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RpcException } from '@nestjs/microservices';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import {
  GeneralAsyncContext,
  IGeneralAsyncContext,
  IHeadersToContextAdapter,
  getSkipInterceptors,
} from 'src/modules/common';
import { PrometheusLabels, PrometheusManager } from 'src/modules/prometheus';
import { GrpcHeadersHelper } from 'src/modules/grpc/grpc-common';
import { GRPC_SERVER_HEADERS_ADAPTER_DI } from '../types/tokens';
import { GrpcMetadataHelper } from '../helpers/grpc.metadata.helper';
import { GRPC_INTERNAL_REQUEST_DURATIONS, GRPC_INTERNAL_REQUEST_FAILED } from '../types/metrics';

@Injectable()
export class GrpcPrometheus implements NestInterceptor {
  constructor(
    private readonly prometheusManager: PrometheusManager,
    @Inject(GRPC_SERVER_HEADERS_ADAPTER_DI)
    private readonly headersAdapter: IHeadersToContextAdapter<IGeneralAsyncContext>,
    private readonly reflector: Reflector,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> | Promise<Observable<any>> {
    if (
      context.getType() !== 'rpc' ||
      getSkipInterceptors(context, this.reflector)['All'] ||
      getSkipInterceptors(context, this.reflector)['GrpcPrometheus']
    ) {
      return next.handle();
    }

    const rpc = context.switchToRpc();
    const metadata = rpc.getContext<Metadata>();
    const handler = context.getHandler();
    const headers = GrpcHeadersHelper.normalize(metadata.getMap());
    const pattern = this.reflector.get(PATTERN_METADATA, handler)[0];

    let asyncContext: IGeneralAsyncContext = GrpcMetadataHelper.getAsyncContext<IGeneralAsyncContext>(metadata);

    if (asyncContext === undefined) {
      asyncContext = this.headersAdapter.adapt(headers);
      GrpcMetadataHelper.setAsyncContext(asyncContext, metadata);
    }

    const labels: PrometheusLabels = {
      service: pattern.service,
      method: pattern.rpc,
    };

    const end = GeneralAsyncContext.instance.runWithContext(() => {
      return this.prometheusManager.histogram().startTimer(GRPC_INTERNAL_REQUEST_DURATIONS, { labels });
    }, asyncContext);

    return next.handle().pipe(
      catchError((error) => {
        let statusCode: number = GrpcStatus.UNKNOWN;

        if (error instanceof RpcException) {
          const responseStatus = error.getError();

          if (
            typeof responseStatus === 'object' &&
            'code' in responseStatus &&
            typeof responseStatus['code'] === 'number'
          ) {
            statusCode = responseStatus['code'];
          }
        }

        GeneralAsyncContext.instance.runWithContext(() => {
          return this.prometheusManager.counter().increment(GRPC_INTERNAL_REQUEST_FAILED, {
            labels: {
              ...labels,
              statusCode: statusCode.toString(),
            },
          });
        }, asyncContext);

        return throwError(() => error);
      }),
      finalize(() => {
        GeneralAsyncContext.instance.runWithContext(() => {
          return end();
        }, asyncContext);
      }),
    );
  }
}
