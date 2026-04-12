import { LoggerMarkers } from 'src/modules/common';
import { RabbitMqClientError } from './rabbit-mq-client.error';

export class RabbitMqClientTimeoutError extends RabbitMqClientError {
  constructor(message: string | undefined, cause?: unknown) {
    super(message === undefined ? 'Timeout RabbitMq Server Error' : message, 'timeout', LoggerMarkers.EXTERNAL, cause);
    this.name = 'RabbitMq Client Timeout Error';
  }
}
