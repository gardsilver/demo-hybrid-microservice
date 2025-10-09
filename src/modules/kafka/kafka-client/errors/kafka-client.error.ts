export interface IKafkaClientError {
  message: string;
  loggerMarker: string;
  statusCode: string | number;
  cause?: unknown;
}

export abstract class KafkaClientError extends Error implements IKafkaClientError {
  protected constructor(
    message: string,
    public readonly statusCode: string | number,
    public readonly loggerMarker: string,
    cause?: unknown,
  ) {
    super(message === undefined ? 'Kafka Server Unknown Error' : message);
    this.name = 'Kafka Client Error';

    if (this.statusCode === undefined) {
      this.statusCode = 'UnknownError';
    }

    if (cause) {
      this.cause = cause;
    }
  }
}
