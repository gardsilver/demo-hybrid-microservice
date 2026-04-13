import { LoggerMarkers } from 'src/modules/common';
import { KafkaClientError } from './kafka-client.error';

export class KafkaClientExternalError extends KafkaClientError {
  constructor(message: string | undefined, statusCode: string | number | undefined, cause?: unknown) {
    super(message === undefined ? 'External Kafka Server Error' : message, statusCode, LoggerMarkers.EXTERNAL, cause);
    this.name = 'Kafka Client External Error';
  }
}
