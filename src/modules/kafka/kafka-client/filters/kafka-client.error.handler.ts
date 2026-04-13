import { TimeoutError as TimeoutErrorRxjs } from 'rxjs';
import {
  KafkaJSNonRetriableError,
  KafkaJSLockTimeout,
  KafkaJSRequestTimeoutError,
  KafkaJSNumberOfRetriesExceeded,
  KafkaJSTimeout,
  KafkaJSError,
  KafkaJSConnectionError,
} from 'kafkajs';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerMarkers } from 'src/modules/common';
import { TimeoutError } from 'src/modules/date-timestamp';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerServiceBuilder, ILogFields, LogLevel } from 'src/modules/elk-logger';
import { isKafkaJsError } from 'src/modules/kafka/kafka-common';
import { IKafkaClientError, KafkaClientError } from '../errors/kafka-client.error';
import { KafkaClientTimeoutError } from '../errors/kafka-client.timeout.error';
import { KafkaClientExternalError } from '../errors/kafka-client.external.error';
import { KafkaClientInternalError } from '../errors/kafka-client.internal.error';

@Injectable()
export class KafkaClientErrorHandler {
  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI)
    protected readonly loggerBuilder: IElkLoggerServiceBuilder,
  ) {}

  public loggingStatus<R>(
    status: IKafkaClientError | R,
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
      module: `${KafkaClientErrorHandler.name}`,
      ...options?.fieldsLogs,
    });

    if (status instanceof KafkaClientError) {
      logger.log(
        options?.retryCount !== undefined ? LogLevel.WARN : (options?.logLevel ?? LogLevel.ERROR),
        'Kafka request ' + (options?.retryCount !== undefined ? 'retry' : 'failed'),
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
      logger.log(options?.logLevel ?? LogLevel.INFO, 'Kafka request success', {
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
  ): IKafkaClientError {
    const cause = this.getCause(exception);
    let resolvedError: IKafkaClientError;

    if (
      cause instanceof TimeoutError ||
      cause instanceof TimeoutErrorRxjs ||
      cause instanceof KafkaJSLockTimeout ||
      cause instanceof KafkaJSRequestTimeoutError ||
      cause instanceof KafkaJSNumberOfRetriesExceeded ||
      (cause instanceof KafkaJSConnectionError && cause.message === 'Connection timeout') ||
      cause instanceof KafkaJSTimeout
    ) {
      resolvedError = new KafkaClientTimeoutError(cause.message, exception);
    } else if (isKafkaJsError(cause)) {
      /** @see
       *   - https://github.com/tulios/kafkajs/blob/master/src/protocol/error.js
       *   - https://github.com/tulios/kafkajs/blob/master/src/errors.js
       */
      if (
        cause instanceof KafkaJSNonRetriableError ||
        [
          'KafkaJSInvariantViolation',
          'KafkaJSInvalidVarIntError',
          'KafkaJSInvalidLongError',
          'KafkaJSBrokerNotFound',
          'KafkaJSSASLAuthenticationError',
          'KafkaJSOffsetOutOfRange',
          'KafkaJSMemberIdRequired',
          'KafkaJSServerDoesNotSupportApiKey',
          'KafkaJSUnsupportedMagicByteInMessageSet',
        ].includes(cause.name) ||
        ('type' in cause && ['INVALID_RECORD'].includes((cause as unknown as { type: string })['type']))
      ) {
        resolvedError = new KafkaClientInternalError(
          cause.message,
          (cause as unknown as Record<string, string | undefined>)['code'] ??
            (cause as unknown as Record<string, string | undefined>)['type'] ??
            cause.name,
          exception,
        );
      } else {
        resolvedError = new KafkaClientExternalError(
          cause.message,
          (cause as unknown as Record<string, string | undefined>)['code'] ??
            (cause as unknown as Record<string, string | undefined>)['type'] ??
            cause.name,
          exception,
        );
      }
    } else if (cause instanceof Error) {
      resolvedError = new KafkaClientInternalError(
        cause.message,
        (cause as unknown as Record<string, string | undefined>)['code'] ??
          (cause as unknown as Record<string, string | undefined>)['type'] ??
          cause.name,
        exception,
      );
    } else if (typeof exception === 'string') {
      resolvedError = new KafkaClientInternalError(exception, undefined, undefined);
    } else if (typeof exception === 'object' && exception !== null) {
      resolvedError = new KafkaClientInternalError(
        'message' in exception && typeof exception['message'] === 'string' ? exception['message'] : undefined,
        undefined,
        exception,
      );
    } else {
      resolvedError = new KafkaClientInternalError(undefined, undefined, exception);
    }

    this.loggingStatus(resolvedError, options);

    return resolvedError;
  }

  getCause(exception: unknown, parent?: KafkaJSError): KafkaJSError | unknown {
    if (exception instanceof KafkaJSError) {
      if (exception.cause) {
        return this.getCause(exception.cause, exception);
      }

      return exception;
    }

    return parent ?? exception;
  }
}
