import { LoggerMarkers } from 'src/modules/common';
import { KafkaClientError } from './kafka-client.error';

export class KafkaClientInternalError extends KafkaClientError {
  constructor(message: string | undefined, statusCode: string | number | undefined, cause?: unknown) {
    super(message === undefined ? 'Internal Kafka Server Error' : message, statusCode, LoggerMarkers.INTERNAL, cause);
    this.name = 'Kafka Client Internal Error';
  }
}
