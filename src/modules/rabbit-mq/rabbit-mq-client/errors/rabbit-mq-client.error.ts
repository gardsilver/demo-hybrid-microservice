export abstract class RabbitMqClientError extends Error {
  protected constructor(
    message: string | undefined,
    public readonly statusCode: string | number | undefined,
    public readonly loggerMarker: string,
    cause?: unknown,
  ) {
    super(message === undefined ? 'RabbitMq Server Unknown Error' : message);

    this.name = 'RabbitMq Client Error';

    if (this.statusCode === undefined) {
      this.statusCode = 'UnknownError';
    }

    if (cause) {
      this.cause = cause;
    }
  }
}
