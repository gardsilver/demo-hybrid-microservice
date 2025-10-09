import { KafkaClientExternalError } from './kafka-client.external.error';

describe(KafkaClientExternalError.name, () => {
  it('default', async () => {
    let error = new KafkaClientExternalError(undefined, undefined);

    expect({
      message: error.message,
      statusCode: error.statusCode,
      cause: error.cause,
    }).toEqual({
      message: 'External Kafka Server Error',
      statusCode: 'UnknownError',
    });

    error = new KafkaClientExternalError('Timeout', 'statusCode', { status: 'error' });

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
