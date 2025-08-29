import { tap, catchError, throwError, finalize, firstValueFrom, of, retry, timeout, identity } from 'rxjs';
import { AxiosResponse } from 'axios';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { GeneralAsyncContext, LoggerMarkers } from 'src/modules/common';
import { MILLISECONDS_IN_SECOND, TimeoutError } from 'src/modules/date-timestamp';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerServiceBuilder, ILogFields } from 'src/modules/elk-logger';
import { PrometheusManager } from 'src/modules/prometheus';
import { HttHeadersHelper } from 'src/modules/http/http-common';
import { IHttpHeadersRequestBuilder, IHttpRequest, IHttpRequestOptions } from '../types/types';
import { HTTP_CLIENT_HEADERS_REQUEST_BUILDER_DI, HTTP_CLIENT_REQUEST_OPTIONS_DI } from '../types/tokens';
import {
  HTTP_EXTERNAL_REQUEST_DURATIONS,
  HTTP_EXTERNAL_REQUEST_FAILED,
  HTTP_EXTERNAL_REQUEST_RETRY,
} from '../types/metrics';
import { HttpClientResponseHandler } from '../filters/http-client.response.handler';
import { HttpClientError } from '../errors/http-client.error';
import { HttpClientHelper } from '../helpers/http-client.helper';
import { HttpClientConfigService } from './http-client.config.service';

@Injectable()
export class HttpClientService {
  constructor(
    private readonly config: HttpClientConfigService,
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI) private readonly loggerBuilder: IElkLoggerServiceBuilder,
    private readonly prometheusManager: PrometheusManager,
    @Inject(HTTP_CLIENT_REQUEST_OPTIONS_DI) private readonly requestOptions: IHttpRequestOptions,
    @Inject(HTTP_CLIENT_HEADERS_REQUEST_BUILDER_DI)
    private readonly headersBuilder: IHttpHeadersRequestBuilder,
    private readonly httpService: HttpService,
    private readonly responseHandler: HttpClientResponseHandler,
  ) {}

  private getDefaultRequestOptions(): IHttpRequestOptions {
    const defaultOptions = this.config.getHttpRequestOptions();

    return {
      headersBuilderOptions: {
        ...defaultOptions.headersBuilderOptions,
        ...this.requestOptions.headersBuilderOptions,
      },
      retryOptions: {
        ...defaultOptions.retryOptions,
        ...this.requestOptions.retryOptions,
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async request<Req = any, Res = any>(request: IHttpRequest<Req>, options?: IHttpRequestOptions): Promise<Res> {
    const requestOptions = HttpClientHelper.mergeRequestOptions(this.getDefaultRequestOptions(), options);

    const axiosRequest = HttpClientHelper.buildAxiosRequest(
      request,
      this.headersBuilder.build(
        {
          asyncContext: GeneralAsyncContext.instance.extend(),
          headers: request.headers,
        },
        requestOptions.headersBuilderOptions,
      ),
    );

    const labels = HttpClientHelper.buildPrometheusLabels(
      this.httpService.axiosRef.getUri({
        baseURL: axiosRequest.baseURL,
        url: axiosRequest.url,
      }),
      request,
    );

    const fieldsLogs: ILogFields = {
      module: `${labels.hostname}${labels.pathname}`,
      markers: [LoggerMarkers.HTTP],
      payload: {
        request: {
          method: request.method.toLocaleUpperCase(),
          params: request.params,
          data: request.data,
          headers: HttHeadersHelper.normalize({ ...axiosRequest.headers }),
        },
      },
    };

    const logger = this.loggerBuilder.build(fieldsLogs);

    logger.info('HTTP request', {
      markers: [LoggerMarkers.REQUEST, LoggerMarkers.EXTERNAL],
    });

    let timerRetry: NodeJS.Timeout;

    let end = this.prometheusManager.histogram().startTimer(HTTP_EXTERNAL_REQUEST_DURATIONS, { labels });

    const resp$ = this.httpService.request<Res>(axiosRequest).pipe(
      tap((response) => {
        this.responseHandler.loggingResponse(response, { fieldsLogs });
      }),
      requestOptions.retryOptions?.retry === false
        ? identity
        : retry({
            count:
              requestOptions.retryOptions.retryMaxCount === 0 ? undefined : requestOptions.retryOptions.retryMaxCount,
            delay: (exception, retryCount) => {
              const handleError = this.responseHandler.handleError(exception, {
                fieldsLogs,
                skipLog: true,
              });

              if (handleError instanceof HttpClientError) {
                if (HttpClientHelper.canRetry(handleError, requestOptions)) {
                  this.prometheusManager.counter().increment(HTTP_EXTERNAL_REQUEST_FAILED, {
                    labels: {
                      ...labels,
                      statusCode: handleError.statusCode.toString(),
                      type: handleError.loggerMarker,
                    },
                  });
                  end();
                  end = undefined;

                  this.responseHandler.loggingResponse(handleError, { fieldsLogs, retryCount: retryCount - 1 });

                  return new Promise(
                    (resolve) =>
                      (timerRetry = setTimeout(() => {
                        this.prometheusManager.counter().increment(HTTP_EXTERNAL_REQUEST_RETRY, {
                          labels: {
                            ...labels,
                            statusCode: handleError.statusCode.toString(),
                            type: handleError.loggerMarker,
                          },
                        });
                        end = this.prometheusManager
                          .histogram()
                          .startTimer(HTTP_EXTERNAL_REQUEST_DURATIONS, { labels });

                        logger.warn('HTTP request retry', {
                          markers: [LoggerMarkers.REQUEST, LoggerMarkers.RETRY, handleError.loggerMarker],
                          payload: {
                            retryCount: retryCount,
                          },
                        });

                        resolve(true);
                      }, requestOptions.retryOptions.delay)),
                  );
                }

                return throwError(() => exception);
              }

              return throwError(() => exception);
            },
          }),
      requestOptions?.retryOptions?.retry === false || requestOptions.retryOptions.timeout === 0
        ? identity
        : timeout({
            each: requestOptions.retryOptions.timeout,
            with: () =>
              throwError(
                () =>
                  new TimeoutError(
                    `HTTP Retry-Request Timeout (${requestOptions.retryOptions.timeout / MILLISECONDS_IN_SECOND} sec)`,
                  ),
              ),
          }),
      catchError((exception) => {
        const handleError = this.responseHandler.handleError(exception, { fieldsLogs });

        if (handleError instanceof HttpClientError) {
          this.prometheusManager.counter().increment(HTTP_EXTERNAL_REQUEST_FAILED, {
            labels: {
              ...labels,
              statusCode: handleError.statusCode.toString(),
              type: handleError.loggerMarker,
            },
          });
          return throwError(() => handleError);
        }

        return of(handleError as AxiosResponse);
      }),
      finalize(() => {
        clearTimeout(timerRetry);
        if (end !== undefined) {
          end();
        }
      }),
    );

    return (await firstValueFrom(resp$)).data;
  }
}
