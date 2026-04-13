import { LoggerMarkers } from 'src/modules/common';
import { RabbitMqClientError } from './rabbit-mq-client.error';

export class RabbitMqClientExternalError extends RabbitMqClientError {
  constructor(message: string | undefined, statusCode: string | number | undefined, cause?: unknown) {
    super(
      message === undefined ? 'External RabbitMq Server Error' : message,
      statusCode,
      LoggerMarkers.EXTERNAL,
      cause,
    );
    this.name = 'RabbitMq Client External Error';
  }
}
