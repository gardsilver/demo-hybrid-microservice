import { TimeoutError as TimeoutErrorRxjs } from 'rxjs';
import { AxiosError, AxiosResponse, HttpStatusCode, isAxiosError } from 'axios';
import { Inject, Injectable } from '@nestjs/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerServiceBuilder, ILogFields, LogLevel } from 'src/modules/elk-logger';
import { IKeyValue, LoggerMarkers } from 'src/modules/common';
import { TimeoutError } from 'src/modules/date-timestamp';
import { HttHeadersHelper } from 'src/modules/http/http-common';
import { HttpClientError, IHttpClientError } from '../errors/http-client.error';
import { HttpClientInternalError } from '../errors/http-client.internal.error';
import { HttpClientTimeoutError } from '../errors/http-client.timeout.error';
import { HttpClientExternalError } from '../errors/http-client.external.error';

@Injectable()
export class HttpClientResponseHandler {
  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI)
    protected readonly loggerBuilder: IElkLoggerServiceBuilder,
  ) {}

  public loggingResponse<T, D>(
    response: IHttpClientError<T, D> | AxiosResponse<T, D>,
    options?: {
      logLevel?: LogLevel;
      fieldsLogs?: ILogFields;
      skipLog?: boolean;
      retryCount?: number;
    },
  ): void {
    if (options?.skipLog) {
      return;
    }

    const logger = this.loggerBuilder.build({
      module: `${HttpClientResponseHandler.name}`,
      ...options?.fieldsLogs,
    });

    if (response instanceof HttpClientError) {
      logger.log(
        options?.retryCount !== undefined ? LogLevel.WARN : (options?.logLevel ?? LogLevel.ERROR),
        'HTTP response ' + (options?.retryCount !== undefined ? 'retry' : 'failed'),
        {
          markers:
            options?.retryCount !== undefined
              ? [LoggerMarkers.RESPONSE, LoggerMarkers.RETRY, response.loggerMarker]
              : [LoggerMarkers.RESPONSE, LoggerMarkers.ERROR, response.loggerMarker],
          payload: {
            retryCount: options?.retryCount,
            error: response,
          },
        },
      );

      return;
    }

    if (options?.retryCount === undefined) {
      logger.log(options?.logLevel ?? LogLevel.INFO, 'HTTP response success', {
        markers: [LoggerMarkers.RESPONSE, LoggerMarkers.SUCCESS, LoggerMarkers.EXTERNAL],
        payload: {
          response: this.axiosResponseToLogFormat(response as undefined as AxiosResponse<T, D>),
        },
      });
    }
  }

  public handleError<T, D>(
    exception: unknown,
    options?: {
      fieldsLogs?: ILogFields;
      skipLog?: boolean;
    },
  ): IHttpClientError<T, D> | AxiosResponse<T, D> {
    let logLevel: LogLevel;
    let response: AxiosResponse;
    let statusCode: number | string;
    let resolvedError: IHttpClientError<T, D> | AxiosResponse<T, D>;

    if (isAxiosError(exception)) {
      response = exception.response;
      if (response) {
        statusCode = response.status;
        if ([HttpStatusCode.NotFound, HttpStatusCode.NoContent].includes(exception.status)) {
          resolvedError = Object.assign({}, response, { data: null }) as AxiosResponse;
          logLevel = LogLevel.WARN;
        } else {
          resolvedError = new HttpClientExternalError(exception.message, statusCode, exception, response);
        }
      } else {
        statusCode = exception.code;

        if ([AxiosError.ECONNABORTED, AxiosError.ETIMEDOUT].includes(exception.code)) {
          resolvedError = new HttpClientTimeoutError(exception.message, exception.code, exception);
        } else {
          if (
            [
              AxiosError.ERR_FR_TOO_MANY_REDIRECTS,
              AxiosError.ERR_BAD_REQUEST,
              AxiosError.ERR_BAD_RESPONSE,
              AxiosError.ERR_NETWORK,
              AxiosError.ERR_CANCELED,
            ].includes(exception.code)
          ) {
            resolvedError = new HttpClientExternalError(exception.message, statusCode, exception, response);
          } else {
            resolvedError = new HttpClientInternalError(exception.message, statusCode, exception, response);
          }
        }
      }
    } else {
      if (exception instanceof TimeoutError || exception instanceof TimeoutErrorRxjs) {
        resolvedError = new HttpClientTimeoutError(exception.message, undefined, exception);
      } else if (exception instanceof Error) {
        resolvedError = new HttpClientInternalError(exception.message, undefined, exception);
      } else if (typeof exception === 'string') {
        resolvedError = new HttpClientInternalError(exception, undefined, undefined);
      } else {
        resolvedError = new HttpClientInternalError(undefined, undefined, exception);
      }
    }

    this.loggingResponse(resolvedError instanceof HttpClientError ? resolvedError : response, { ...options, logLevel });

    return resolvedError;
  }

  private axiosResponseToLogFormat<T, D>(response: AxiosResponse<T, D>): IKeyValue {
    return {
      code: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers ? HttHeadersHelper.normalize(response.headers) : undefined,
    };
  }
}
