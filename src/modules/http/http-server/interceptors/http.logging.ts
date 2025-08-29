import { Request, Response } from 'express';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ILogFields,
  IElkLoggerServiceBuilder,
  ELK_LOGGER_SERVICE_BUILDER_DI,
  TraceSpanBuilder,
} from 'src/modules/elk-logger';
import { IGeneralAsyncContext, LoggerMarkers, getSkipInterceptors } from 'src/modules/common';
import { HttHeadersHelper, IHttpHeadersToAsyncContextAdapter } from 'src/modules/http/http-common';
import { HttpRequestHelper } from '../helpers/http.request.helper';
import { HttpLoggerHelper } from '../helpers/http.logger.helper';
import { HttpResponseHandler } from '../filters/http.response.handler';
import { HTTP_SERVER_HEADERS_ADAPTER_DI } from '../types/tokens';

@Injectable()
export class HttpLogging implements NestInterceptor {
  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI)
    private readonly loggerBuilder: IElkLoggerServiceBuilder,
    @Inject(HTTP_SERVER_HEADERS_ADAPTER_DI)
    private readonly headersAdapter: IHttpHeadersToAsyncContextAdapter,
    private readonly responseHandler: HttpResponseHandler,
    private readonly reflector: Reflector,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> | Promise<Observable<any>> {
    if (
      context.getType() !== 'http' ||
      getSkipInterceptors(context, this.reflector)['All'] ||
      getSkipInterceptors(context, this.reflector)['HttpLogging']
    ) {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const headers = HttHeadersHelper.normalize(request.headers);
    const requestAsLog = HttpLoggerHelper.requestAsLogFormat(request);

    let asyncContext: IGeneralAsyncContext = HttpRequestHelper.getAsyncContext<IGeneralAsyncContext>(request);

    if (asyncContext === undefined) {
      asyncContext = this.headersAdapter.adapt(headers);
      HttpRequestHelper.setAsyncContext(asyncContext, request);
    }

    const ts = TraceSpanBuilder.build(asyncContext);

    const fields: ILogFields = {
      module: `${HttpLogging.name}.intercept`,
      markers: [LoggerMarkers.INTERNAL],
      ...ts,
      payload: {
        request: requestAsLog,
      },
    };

    const logger = this.loggerBuilder.build(fields);

    logger.info('Request', {
      markers: [LoggerMarkers.REQUEST],
    });

    return next.handle().pipe(
      tap((data) => {
        const response = ctx.getResponse<Response>();
        const responseAsLog = HttpLoggerHelper.responseAsLogFormat(response, data);

        const fieldsLogs: ILogFields = {
          ...fields,
          payload: {
            ...fields.payload,
            response: { ...responseAsLog },
          },
        };

        this.responseHandler.loggingResponse(responseAsLog.statusCode, fieldsLogs);
      }),
      catchError((error) => {
        return throwError(() => this.responseHandler.handleError(context, error, fields));
      }),
    );
  }
}
