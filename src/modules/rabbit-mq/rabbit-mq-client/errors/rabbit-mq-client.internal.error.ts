import { LoggerMarkers } from 'src/modules/common';
import { RabbitMqClientError } from './rabbit-mq-client.error';

export class RabbitMqClientInternalError extends RabbitMqClientError {
  constructor(message: string | undefined, statusCode: string | number | undefined, cause?: unknown) {
    super(
      message === undefined ? 'Internal RabbitMq Server Error' : message,
      statusCode,
      LoggerMarkers.INTERNAL,
      cause,
    );
    this.name = 'RabbitMq Client Internal Error';
  }
}
