import { TimeoutError as TimeoutErrorRxjs } from 'rxjs';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerMarkers } from 'src/modules/common';
import { TimeoutError } from 'src/modules/date-timestamp';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerServiceBuilder, ILogFields, LogLevel } from 'src/modules/elk-logger';
import { RabbitMqError } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { RabbitMqClientError } from '../errors/rabbit-mq-client.error';
import { RabbitMqClientTimeoutError } from '../errors/rabbit-mq-client.timeout.error';
import { RabbitMqClientExternalError } from '../errors/rabbit-mq-client.external.error';
import { RabbitMqClientInternalError } from '../errors/rabbit-mq-client.internal.error';

@Injectable()
export class RabbitMqClientErrorHandler {
  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI)
    protected readonly loggerBuilder: IElkLoggerServiceBuilder,
  ) {}

  public loggingStatus<R>(
    status: RabbitMqClientError | R,
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
      module: `${RabbitMqClientErrorHandler.name}`,
      ...options?.fieldsLogs,
    });

    if (status instanceof RabbitMqClientError) {
      logger.log(
        options?.retryCount !== undefined ? LogLevel.WARN : (options?.logLevel ?? LogLevel.ERROR),
        'RMQ request ' + (options?.retryCount !== undefined ? 'retry' : 'failed'),
        {
          markers:
            options?.retryCount !== undefined
              ? [LoggerMarkers.REQUEST, LoggerMarkers.RETRY, status.loggerMarker]
              : [LoggerMarkers.REQUEST, LoggerMarkers.ERROR, status.loggerMarker],
          payload: {
            retryCount: options?.retryCount,
            error: status,
          },
        },
      );

      return;
    }

    if (options?.retryCount === undefined) {
      logger.log(options?.logLevel ?? LogLevel.INFO, 'RMQ request success', {
        markers: [LoggerMarkers.REQUEST, LoggerMarkers.SUCCESS, LoggerMarkers.EXTERNAL],
        payload: {
          status,
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
  ): RabbitMqClientError {
    let resolvedError: RabbitMqClientError;
    if (exception instanceof TimeoutError || exception instanceof TimeoutErrorRxjs) {
      resolvedError = new RabbitMqClientTimeoutError(exception.message, exception);
    } else if (exception instanceof RabbitMqError) {
      resolvedError = new RabbitMqClientExternalError(exception.message, exception.data.eventType, exception);
    } else if (exception instanceof Error) {
      resolvedError = new RabbitMqClientInternalError(
        exception.message,
        exception['code'] ?? exception['type'] ?? exception.name,
        exception,
      );
    } else if (typeof exception === 'string') {
      resolvedError = new RabbitMqClientInternalError(exception, undefined, undefined);
    } else if (typeof exception === 'object') {
      resolvedError = new RabbitMqClientInternalError(
        'message' in exception && typeof exception['message'] === 'string' ? exception['message'] : undefined,
        undefined,
        exception,
      );
    } else {
      resolvedError = new RabbitMqClientInternalError(undefined, undefined, exception);
    }

    this.loggingStatus(resolvedError, options);

    return resolvedError;
  }
}
