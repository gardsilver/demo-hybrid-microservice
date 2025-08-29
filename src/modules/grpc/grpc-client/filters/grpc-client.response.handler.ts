import { TimeoutError as TimeoutErrorRxjs } from 'rxjs';
import { status as GrpcStatus, ServiceError } from '@grpc/grpc-js';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerMarkers } from 'src/modules/common';
import { TimeoutError } from 'src/modules/date-timestamp';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerServiceBuilder, ILogFields, LogLevel } from 'src/modules/elk-logger';
import { GrpcClientError, IGrpcClientError, isGrpcServiceError } from '../errors/grpc-client.error';
import { GrpcClientTimeoutError } from '../errors/grpc-client.timeout.error';
import { GrpcClientExternalException } from '../errors/grpc-client.external.error';
import { GrpcClientInternalException } from '../errors/grpc-client.internal.error';

@Injectable()
export class GrpcClientResponseHandler {
  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI)
    protected readonly loggerBuilder: IElkLoggerServiceBuilder,
  ) {}

  public loggingResponse<R>(
    response: IGrpcClientError | R,
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
      module: `${GrpcClientResponseHandler.name}`,
      ...options?.fieldsLogs,
    });

    if (response instanceof GrpcClientError) {
      logger.log(
        options?.retryCount !== undefined ? LogLevel.WARN : (options?.logLevel ?? LogLevel.ERROR),
        'gRPC response ' + (options?.retryCount !== undefined ? 'retry' : 'failed'),
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
      logger.log(options?.logLevel ?? LogLevel.INFO, 'gRPC response success', {
        markers: [LoggerMarkers.RESPONSE, LoggerMarkers.SUCCESS, LoggerMarkers.EXTERNAL],
        payload: {
          response,
        },
      });
    }
  }

  public handleError(
    exception: unknown,
    options?: {
      fieldsLogs?: ILogFields;
      skipLog?: boolean;
    },
  ): IGrpcClientError | null {
    let logLevel: LogLevel;
    let resolvedError: IGrpcClientError | null;

    if (exception instanceof TimeoutError || exception instanceof TimeoutErrorRxjs) {
      resolvedError = new GrpcClientTimeoutError(exception.message, 'timeout', exception);
    } else if (isGrpcServiceError(exception)) {
      if (
        [
          GrpcStatus.INVALID_ARGUMENT,
          GrpcStatus.DEADLINE_EXCEEDED,
          GrpcStatus.PERMISSION_DENIED,
          GrpcStatus.UNAUTHENTICATED,
        ].includes(exception.code)
      ) {
        resolvedError = new GrpcClientInternalException(exception.message, exception.code, exception);
      } else if (exception.code === GrpcStatus.NOT_FOUND) {
        resolvedError = null;
        logLevel = LogLevel.WARN;
      } else {
        resolvedError = new GrpcClientExternalException(exception.message, exception.code, exception);
      }
    } else if (typeof exception === 'string') {
      resolvedError = new GrpcClientExternalException(exception, undefined, undefined);
    } else if (typeof exception === 'object') {
      resolvedError = new GrpcClientExternalException(
        'message' in exception && typeof exception['message'] === 'string' ? exception['message'] : undefined,
        undefined,
        exception,
      );
    } else {
      resolvedError = new GrpcClientExternalException(undefined, undefined, exception);
    }

    this.loggingResponse(
      resolvedError === null
        ? new GrpcClientExternalException(
            (exception as ServiceError).message,
            (exception as ServiceError).code,
            exception,
          )
        : resolvedError,
      {
        ...options,
        logLevel,
      },
    );

    return resolvedError;
  }
}
