import { KafkaClientTimeoutError } from './kafka-client.timeout.error';

describe(KafkaClientTimeoutError.name, () => {
  it('default', async () => {
    let error = new KafkaClientTimeoutError(undefined, undefined);

    expect({
      message: error.message,
      statusCode: error.statusCode,
      cause: error.cause,
    }).toEqual({
      message: 'Kafka Server Timeout Error',
      statusCode: 'timeout',
    });

    error = new KafkaClientTimeoutError('Timeout', { status: 'error' });

    expect({
      message: error.message,
      statusCode: error.statusCode,
      cause: error.cause,
    }).toEqual({
      message: 'Timeout',
      statusCode: 'timeout',
      cause: { status: 'error' },
    });
  });
});
