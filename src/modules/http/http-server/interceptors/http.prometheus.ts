import { Request } from 'express';
import { Observable, catchError, throwError, finalize } from 'rxjs';
import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GeneralAsyncContext, IGeneralAsyncContext, getSkipInterceptors } from 'src/modules/common';
import { PrometheusLabels, PrometheusManager } from 'src/modules/prometheus';
import { HttHeadersHelper, IHttpHeadersToAsyncContextAdapter } from 'src/modules/http/http-common';
import { HttpRequestHelper } from '../helpers/http.request.helper';
import { HTTP_SERVER_HEADERS_ADAPTER_DI } from '../types/tokens';
import { HTTP_INTERNAL_REQUEST_DURATIONS, HTTP_INTERNAL_REQUEST_FAILED } from '../types/metrics';

@Injectable()
export class HttpPrometheus implements NestInterceptor {
  constructor(
    private readonly prometheusManager: PrometheusManager,
    @Inject(HTTP_SERVER_HEADERS_ADAPTER_DI)
    private readonly headersAdapter: IHttpHeadersToAsyncContextAdapter,
    private readonly reflector: Reflector,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> | Promise<Observable<any>> {
    if (
      context.getType() !== 'http' ||
      getSkipInterceptors(context, this.reflector)['All'] ||
      getSkipInterceptors(context, this.reflector)['HttpPrometheus']
    ) {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const headers = HttHeadersHelper.normalize(request.headers);

    let asyncContext: IGeneralAsyncContext = HttpRequestHelper.getAsyncContext<IGeneralAsyncContext>(request);

    if (asyncContext === undefined) {
      asyncContext = this.headersAdapter.adapt(headers);
      HttpRequestHelper.setAsyncContext(asyncContext, request);
    }

    const labels: PrometheusLabels = {
      method: request.method.toUpperCase(),
      service: context.getClass().name,
      pathname: request.path,
    };

    const end = GeneralAsyncContext.instance.runWithContext(() => {
      return this.prometheusManager.histogram().startTimer(HTTP_INTERNAL_REQUEST_DURATIONS, { labels });
    }, asyncContext);

    return next.handle().pipe(
      catchError((error) => {
        let statusCode: number;
        if (error instanceof HttpException) {
          statusCode = error.getStatus();
        } else {
          statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        }

        GeneralAsyncContext.instance.runWithContext(() => {
          return this.prometheusManager.counter().increment(HTTP_INTERNAL_REQUEST_FAILED, {
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
