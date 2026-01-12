import { KafkaJSError, KafkaJSErrorMetadata } from 'kafkajs';
import { faker } from '@faker-js/faker';
import { LoggerMarkers } from 'src/modules/common';
import { KafkaClientError } from '../../errors/kafka-client.error';
import { KafkaClientInternalError } from '../../errors/kafka-client.internal.error';
import { KafkaClientErrorObjectFormatter } from './kafka-client.error.object-formatter';

describe(KafkaClientErrorObjectFormatter.name, () => {
  let baseParams: KafkaJSErrorMetadata;
  let kafkaError: KafkaJSError;
  let error: KafkaClientError;
  let formatter: KafkaClientErrorObjectFormatter;

  beforeEach(async () => {
    formatter = new KafkaClientErrorObjectFormatter();

    baseParams = {
      retriable: true,
      topic: faker.string.alpha(10),
      partitionId: faker.number.int(),
      metadata: {
        partitionErrorCode: faker.number.int(),
        partitionId: faker.number.int(),
        leader: faker.number.int(),
        replicas: [faker.number.int()],
        isr: [faker.number.int()],
        offlineReplicas: [faker.number.int()],
      },
    };

    kafkaError = new KafkaJSError('Server error', baseParams);
    kafkaError.stack = 'Error: message\n    at <anonymous>:1:2\n';

    error = new KafkaClientInternalError('Test Error', 'status', kafkaError);
  });

  it('isInstanceOf', async () => {
    expect(formatter.isInstanceOf(null)).toBeFalsy();
    expect(formatter.isInstanceOf(undefined)).toBeFalsy();
    expect(formatter.isInstanceOf('')).toBeFalsy();
    expect(formatter.isInstanceOf({})).toBeFalsy();
    expect(formatter.isInstanceOf(new Error())).toBeFalsy();
    expect(formatter.isInstanceOf(baseParams)).toBeFalsy();
    expect(formatter.isInstanceOf(kafkaError)).toBeFalsy();
    expect(formatter.isInstanceOf(error)).toBeTruthy();
  });

  it('transform', async () => {
    expect(formatter.transform(error)).toEqual({
      statusCode: 'status',
      loggerMarker: LoggerMarkers.INTERNAL,
    });
  });
});
