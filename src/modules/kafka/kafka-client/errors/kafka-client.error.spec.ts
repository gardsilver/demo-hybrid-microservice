import { KafkaClientError } from './kafka-client.error';

class CustomKafkaClientError extends KafkaClientError {
  constructor(message: string, statusCode: string | number, cause?: unknown) {
    super(message, statusCode, 'custom', cause);
  }
}

describe(KafkaClientError.name, () => {
  it('default', async () => {
    let error = new CustomKafkaClientError(undefined, undefined);

    expect({
      message: error.message,
      statusCode: error.statusCode,
      cause: error.cause,
    }).toEqual({
      message: 'Kafka Server Unknown Error',
      statusCode: 'UnknownError',
    });

    error = new CustomKafkaClientError('Timeout', 'statusCode', { status: 'error' });

    expect({
      message: error.message,
      statusCode: error.statusCode,
      cause: error.cause,
    }).toEqual({
      message: 'Timeout',
      statusCode: 'statusCode',
      cause: { status: 'error' },
    });
  });
});
