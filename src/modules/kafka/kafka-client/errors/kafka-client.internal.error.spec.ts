import { KafkaClientInternalError } from './kafka-client.internal.error';

describe(KafkaClientInternalError.name, () => {
  it('default', async () => {
    let error = new KafkaClientInternalError(undefined, undefined);

    expect({
      message: error.message,
      statusCode: error.statusCode,
      cause: error.cause,
    }).toEqual({
      message: 'Internal Kafka Server Error',
      statusCode: 'UnknownError',
    });

    error = new KafkaClientInternalError('Timeout', 'statusCode', { status: 'error' });

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
