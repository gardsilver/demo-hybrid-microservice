import { Request, Response } from 'express';
import {
  ArgumentsHost,
  HttpStatus,
  HttpException,
  InternalServerErrorException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  IElkLoggerServiceBuilder,
  LogLevel,
  ILogFields,
  LogFieldsHelper,
  TraceSpanBuilder,
} from 'src/modules/elk-logger';
import { IGeneralAsyncContext, LoggerMarkers } from 'src/modules/common';
import { IHttpHeadersToAsyncContextAdapter } from 'src/modules/http/http-common';
import { HttpRequestHelper } from '../helpers/http.request.helper';
import { HttpLoggerHelper } from '../helpers/http.logger.helper';
import { HTTP_SERVER_HEADERS_ADAPTER_DI } from '../types/tokens';

@Injectable()
export class HttpResponseHandler {
  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI)
    protected readonly loggerBuilder: IElkLoggerServiceBuilder,
    @Inject(HTTP_SERVER_HEADERS_ADAPTER_DI)
    private readonly headersAdapter: IHttpHeadersToAsyncContextAdapter,
  ) {}

  public loggingResponse(httpStatus: HttpStatus, fieldsLogs?: ILogFields): void {
    const logger = this.loggerBuilder.build({
      module: `${HttpResponseHandler.name}`,
      ...fieldsLogs,
    });
    const logLevel = HttpLoggerHelper.httpStatusToLogLevel(httpStatus) as unknown;

    if (logLevel === undefined) {
      logger.warn('Response unknown', {
        markers: [LoggerMarkers.RESPONSE, LoggerMarkers.UNKNOWN],
      });
    } else {
      switch (logLevel) {
        case LogLevel.DEBUG:
        case LogLevel.TRACE:
        case LogLevel.WARN:
          logger.warn('Response bad', {
            markers: [LoggerMarkers.RESPONSE, LoggerMarkers.BAD],
          });
          break;
        case LogLevel.INFO:
          logger.info('Response success', {
            markers: [LoggerMarkers.RESPONSE, LoggerMarkers.SUCCESS],
          });
          break;
        case LogLevel.ERROR:
          logger.error('Response error', { markers: [LoggerMarkers.RESPONSE, LoggerMarkers.ERROR] });
          break;
        case LogLevel.FATAL:
          logger.fatal('Response failed', { markers: [LoggerMarkers.RESPONSE, LoggerMarkers.FAILED] });
          break;
      }
    }
  }

  /**
   * @TODO Здесь можно добавлять преобразование различных ошибок к HttpException
   *  Например реализовать маппинг возникших ошибок на rpcClient (rpcCode к HttpStatus)
   */
  public handleError(context: ArgumentsHost, exception, fieldsLogs?: ILogFields): HttpException {
    let resolvedError;
    let responseData, httpStatus;

    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const requestAsLog = HttpLoggerHelper.requestAsLogFormat(request);

    let asyncContext: IGeneralAsyncContext = HttpRequestHelper.getAsyncContext<IGeneralAsyncContext>(request);

    if (asyncContext === undefined) {
      asyncContext = this.headersAdapter.adapt(requestAsLog.headers);
      HttpRequestHelper.setAsyncContext(asyncContext, request);
    }

    const ts = TraceSpanBuilder.build(asyncContext);

    const response = ctx.getResponse<Response>();
    let parentError;

    if (exception instanceof HttpException) {
      resolvedError = exception;
      httpStatus = exception.getStatus();
      responseData = exception.getResponse();
    } else {
      responseData = 'Internal Server Error';
      resolvedError = new InternalServerErrorException(responseData, { description: exception.message });
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

      parentError = exception;
    }

    const responseAsLog = HttpLoggerHelper.responseAsLogFormat(response, responseData);

    this.loggingResponse(
      httpStatus,
      LogFieldsHelper.merge(fieldsLogs, {
        ...ts,
        payload: {
          request: requestAsLog,
          response: {
            ...responseAsLog,
            statusCode: httpStatus,
          },
          exception: parentError,
          error: resolvedError,
        },
      }),
    );

    return resolvedError;
  }
}
