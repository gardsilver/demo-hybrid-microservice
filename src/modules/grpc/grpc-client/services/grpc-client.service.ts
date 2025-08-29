import { catchError, finalize, firstValueFrom, of, retry, tap, throwError, timeout, identity } from 'rxjs';
import { ClientGrpcProxy } from '@nestjs/microservices';
import { Inject, Injectable } from '@nestjs/common';
import { GeneralAsyncContext, LoggerMarkers } from 'src/modules/common';
import { MILLISECONDS_IN_SECOND, TimeoutError } from 'src/modules/date-timestamp';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerServiceBuilder, ILogFields } from 'src/modules/elk-logger';
import { PrometheusLabels, PrometheusManager } from 'src/modules/prometheus';
import { IGrpcMetadataRequestBuilder, IGrpcRequest, IGrpcRequestOptions } from '../types/types';
import { GrpcHeadersHelper } from '../../grpc-common';
import {
  GRPC_EXTERNAL_REQUEST_DURATIONS,
  GRPC_EXTERNAL_REQUEST_FAILED,
  GRPC_EXTERNAL_REQUEST_RETRY,
} from '../types/metrics';
import {
  GRPC_CLIENT_METADATA_REQUEST_BUILDER_DI,
  GRPC_CLIENT_PROXY_DI,
  GRPC_CLIENT_REQUEST_OPTIONS_DI,
} from '../types/tokens';
import { GrpcClientResponseHandler } from '../filters/grpc-client.response.handler';
import { GrpcClientHelper } from '../helpers/grpc-client.helper';
import { GrpcClientError } from '../errors/grpc-client.error';
import { GrpcClientConfigService } from './grpc-client.config.service';

@Injectable()
export class GrpcClientService {
  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI) private readonly loggerBuilder: IElkLoggerServiceBuilder,
    private readonly prometheusManager: PrometheusManager,
    private readonly config: GrpcClientConfigService,
    @Inject(GRPC_CLIENT_REQUEST_OPTIONS_DI) private readonly requestOptions: IGrpcRequestOptions,
    @Inject(GRPC_CLIENT_METADATA_REQUEST_BUILDER_DI)
    private readonly grpcMetadataBuilder: IGrpcMetadataRequestBuilder,
    @Inject(GRPC_CLIENT_PROXY_DI) private readonly clientProxy: ClientGrpcProxy,
    private readonly responseHandler: GrpcClientResponseHandler,
  ) {}

  private getDefaultRequestOptions(): IGrpcRequestOptions {
    const defaultOptions = this.config.getGrpcRequestOptions();

    return {
      metadataBuilderOptions: {
        ...defaultOptions.metadataBuilderOptions,
        ...this.requestOptions.metadataBuilderOptions,
      },
      requestOptions: {
        ...defaultOptions.requestOptions,
        ...this.requestOptions.requestOptions,
      },
      retryOptions: {
        ...defaultOptions.retryOptions,
        ...this.requestOptions.retryOptions,
      },
    };
  }

  async request<Req, Res>(request: IGrpcRequest<Req>, options?: IGrpcRequestOptions): Promise<Res> {
    const requestOptions = GrpcClientHelper.mergeRequestOptions(this.getDefaultRequestOptions(), options);

    const metadata = this.grpcMetadataBuilder.build(
      {
        asyncContext: GeneralAsyncContext.instance.extend(),
        metadata: request.metadata,
      },
      requestOptions.metadataBuilderOptions,
    );

    const labels: PrometheusLabels = {
      service: request.service,
      method: request.method,
    };

    const fieldsLogs: ILogFields = {
      module: `${labels.service}.${labels.method}`,
      markers: [LoggerMarkers.GRPC],
      payload: {
        request: {
          data: request.data === undefined ? 'undefined' : request.data === null ? undefined : request.data,
          headers: GrpcHeadersHelper.normalize(metadata.getMap()),
        },
      },
    };

    const logger = this.loggerBuilder.build(fieldsLogs);

    logger.info('gRPC request', {
      markers: [LoggerMarkers.REQUEST, LoggerMarkers.EXTERNAL],
    });

    let timerRetry: NodeJS.Timeout;

    let end = this.prometheusManager.histogram().startTimer(GRPC_EXTERNAL_REQUEST_DURATIONS, { labels });

    const args = [];

    if (request.data !== null) {
      args.push(request.data);
    }
    args.push(metadata);

    const resp$ = this.clientProxy
      .getService(request.service)
      [request.method](...args)
      .pipe(
        timeout({
          each: requestOptions.requestOptions.timeout,
          with: () =>
            throwError(
              () =>
                new TimeoutError(
                  `gRPC Request Timeout (${requestOptions.requestOptions.timeout / MILLISECONDS_IN_SECOND} sec)`,
                ),
            ),
        }),
        tap((response) => {
          this.responseHandler.loggingResponse(response, { fieldsLogs });
        }),
        requestOptions.retryOptions.retry === false
          ? identity
          : retry({
              count:
                requestOptions.retryOptions.retryMaxCount === 0 ? undefined : requestOptions.retryOptions.retryMaxCount,
              delay: (exception, retryCount) => {
                const handleError = this.responseHandler.handleError(exception, {
                  fieldsLogs,
                  skipLog: true,
                });

                if (handleError instanceof GrpcClientError) {
                  if (GrpcClientHelper.canRetry(handleError, requestOptions)) {
                    this.prometheusManager.counter().increment(GRPC_EXTERNAL_REQUEST_FAILED, {
                      labels: {
                        ...labels,
                        statusCode: handleError.statusCode?.toString(),
                        type: handleError.loggerMarker,
                      },
                    });
                    end();
                    end = undefined;

                    this.responseHandler.loggingResponse(handleError, { fieldsLogs, retryCount: retryCount - 1 });

                    return new Promise(
                      (resolve) =>
                        (timerRetry = setTimeout(() => {
                          this.prometheusManager.counter().increment(GRPC_EXTERNAL_REQUEST_RETRY, {
                            labels: {
                              ...labels,
                              statusCode: handleError.statusCode?.toString(),
                              type: handleError.loggerMarker,
                            },
                          });
                          end = this.prometheusManager
                            .histogram()
                            .startTimer(GRPC_EXTERNAL_REQUEST_DURATIONS, { labels });

                          logger.warn('gRPC request retry', {
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
        requestOptions.retryOptions.retry === false || requestOptions.retryOptions.timeout === 0
          ? identity
          : timeout({
              each: requestOptions.retryOptions.timeout,
              with: () =>
                throwError(
                  () =>
                    new TimeoutError(
                      `gRPC Retry-Request Timeout (${requestOptions.retryOptions.timeout / MILLISECONDS_IN_SECOND} sec)`,
                    ),
                ),
            }),
        catchError((exception) => {
          const handleError = this.responseHandler.handleError(exception, { fieldsLogs });

          if (handleError instanceof GrpcClientError) {
            this.prometheusManager.counter().increment(GRPC_EXTERNAL_REQUEST_FAILED, {
              labels: {
                ...labels,
                statusCode: handleError.statusCode?.toString(),
                type: handleError.loggerMarker,
              },
            });
            return throwError(() => handleError);
          }

          return of(handleError as Res);
        }),

        finalize(() => {
          clearTimeout(timerRetry);
          if (end !== undefined) {
            end();
          }
        }),
      );

    return await firstValueFrom(resp$);
  }
}
