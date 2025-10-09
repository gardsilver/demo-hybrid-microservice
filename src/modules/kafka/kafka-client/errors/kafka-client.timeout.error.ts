import { LoggerMarkers } from 'src/modules/common';
import { KafkaClientError } from './kafka-client.error';

export class KafkaClientTimeoutError extends KafkaClientError {
  constructor(message: string, cause?: unknown) {
    super(message === undefined ? 'Kafka Server Timeout Error' : message, 'timeout', LoggerMarkers.EXTERNAL, cause);
    this.name = 'Kafka Client TimeoutError';
  }
}
