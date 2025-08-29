import { Request, Response } from 'express';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IGeneralAsyncContext, getSkipInterceptors } from 'src/modules/common';
import { HttHeadersHelper, IHttpHeadersToAsyncContextAdapter } from 'src/modules/http/http-common';
import { HttpRequestHelper } from '../helpers/http.request.helper';
import { HttpResponseHelper } from '../helpers/http.response.helper';
import { HTTP_SERVER_HEADERS_ADAPTER_DI, HTTP_SERVER_HEADERS_RESPONSE_BUILDER_DI } from '../types/tokens';
import { IHttpHeadersResponseBuilder } from '../types/types';

@Injectable()
export class HttpHeadersResponse implements NestInterceptor {
  constructor(
    @Inject(HTTP_SERVER_HEADERS_ADAPTER_DI)
    private readonly headersAdapter: IHttpHeadersToAsyncContextAdapter,
    @Inject(HTTP_SERVER_HEADERS_RESPONSE_BUILDER_DI)
    private readonly headersResponseBuilder: IHttpHeadersResponseBuilder,
    private readonly reflector: Reflector,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> | Promise<Observable<any>> {
    if (
      context.getType() !== 'http' ||
      getSkipInterceptors(context, this.reflector)['All'] ||
      getSkipInterceptors(context, this.reflector)['HttpHeadersResponse']
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

    return next.handle().pipe(
      tap(() => {
        const response = ctx.getResponse<Response>();

        const tgtHeaders = this.headersResponseBuilder.build({
          asyncContext,
          headers,
        });

        HttpResponseHelper.addHeaders(tgtHeaders, response);
      }),
      catchError((error) => {
        const response = ctx.getResponse<Response>();

        const tgtHeaders = this.headersResponseBuilder.build({
          asyncContext,
          headers,
        });

        HttpResponseHelper.addHeaders(tgtHeaders, response);

        return throwError(() => error);
      }),
    );
  }
}
