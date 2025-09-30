import { faker } from '@faker-js/faker';
import {
  KafkaJSError,
  KafkaJSProtocolError,
  KafkaJSConnectionError,
  KafkaJSRequestTimeoutError,
  KafkaJSNumberOfRetriesExceeded,
  KafkaJSOffsetOutOfRange,
  KafkaJSTopicMetadataNotLoaded,
  KafkaJSStaleTopicMetadataAssignment,
  KafkaJSDeleteGroupsError,
  KafkaJSServerDoesNotSupportApiKey,
  KafkaJSDeleteTopicRecordsError,
  KafkaJSAggregateError,
  KafkaJSAlterPartitionReassignmentsError,
  KafkaJSErrorMetadata,
} from 'kafkajs';
import { IUnknownFormatter } from 'src/modules/elk-logger';
import { MockUnknownFormatter } from 'tests/modules/elk-logger';
import { KafkaJsErrorObjectFormatter } from './kafka-js-error.object-formatter';

describe(KafkaJsErrorObjectFormatter.name, () => {
  let unknownFormatter: IUnknownFormatter;
  let formatter: KafkaJsErrorObjectFormatter;

  let cause: Error;
  let kafkaError: KafkaJSError;
  let baseParams: KafkaJSErrorMetadata;

  beforeEach(async () => {
    unknownFormatter = new MockUnknownFormatter();
    formatter = new KafkaJsErrorObjectFormatter();
    formatter.setUnknownFormatter(unknownFormatter);

    cause = new Error('Cause Error');
    cause.stack = undefined;

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

    kafkaError = new KafkaJSError('Tets error', baseParams);
    kafkaError.stack = 'Error: message\n    at <anonymous>:1:2\n';

    jest.clearAllMocks();
  });

  it('isInstanceOf', async () => {
    expect(formatter.isInstanceOf(null)).toBeFalsy();
    expect(formatter.isInstanceOf(undefined)).toBeFalsy();
    expect(formatter.isInstanceOf('')).toBeFalsy();
    expect(formatter.isInstanceOf({})).toBeFalsy();
    expect(formatter.isInstanceOf(cause)).toBeFalsy();
    expect(formatter.isInstanceOf(kafkaError)).toBeTruthy();
    expect(formatter.isInstanceOf(new KafkaJSAggregateError('Tets error', [kafkaError]))).toBeTruthy();
  });

  it('transform KafkaJSAggregateError', async () => {
    const error = new KafkaJSAggregateError('Tets error', [kafkaError]);

    expect(formatter.transform(error)).toEqual({
      errors: {
        field: 'fieldName',
      },
    });
  });

  it('transform KafkaJSConnectionClosedError', async () => {
    kafkaError['host'] = faker.string.alpha(10);
    kafkaError['port'] = faker.string.alpha(10);

    expect(formatter.transform(kafkaError)).toEqual({
      retriable: true,
      host: kafkaError['host'],
      port: kafkaError['port'],
    });
  });

  it('transform KafkaJSMemberIdRequired', async () => {
    kafkaError['memberId'] = faker.string.alpha(10);

    expect(formatter.transform(kafkaError)).toEqual({
      retriable: true,
      memberId: kafkaError['memberId'],
    });
  });

  it('transform KafkaJSCreateTopicError', async () => {
    kafkaError['topic'] = faker.string.alpha(10);

    expect(formatter.transform(kafkaError)).toEqual({
      retriable: true,
      topic: kafkaError['topic'],
    });
  });

  it('transform KafkaJSProtocolError', async () => {
    kafkaError['type'] = faker.string.alpha(10);
    kafkaError['code'] = faker.string.alpha(10);

    const error = new KafkaJSProtocolError(kafkaError);

    expect(formatter.transform(error)).toEqual({
      retriable: true,
      type: kafkaError['type'],
      code: kafkaError['code'],
    });
  });

  it('transform KafkaJSOffsetOutOfRange', async () => {
    const params = {
      topic: faker.string.alpha(10),
      partition: faker.number.int(),
    };
    const error = new KafkaJSOffsetOutOfRange(kafkaError, params);

    expect(formatter.transform(error)).toEqual({
      retriable: true,
      ...params,
    });
  });

  it('transform KafkaJSNumberOfRetriesExceeded', async () => {
    const params = {
      retryCount: faker.number.int(),
      retryTime: faker.number.int(),
    };
    const error = new KafkaJSNumberOfRetriesExceeded(kafkaError, params);

    expect(formatter.transform(error)).toEqual({
      retriable: false,
      ...params,
    });
  });

  it('transform KafkaJSConnectionError', async () => {
    const params = {
      broker: faker.string.alpha(10),
      code: faker.string.alpha(10),
    };
    const error = new KafkaJSConnectionError(kafkaError, params);

    expect(formatter.transform(error)).toEqual({
      retriable: true,
      ...params,
    });
  });

  it('transform KafkaJSRequestTimeoutError', async () => {
    const params = {
      broker: faker.string.alpha(10),
      clientId: faker.string.alpha(10),
      correlationId: faker.number.int(),
      createdAt: faker.number.int(),
      sentAt: faker.number.int(),
      pendingDuration: faker.number.int(),
    };
    const error = new KafkaJSRequestTimeoutError(kafkaError, params);

    expect(formatter.transform(error)).toEqual({
      retriable: true,
      ...params,
      clientId: undefined,
    });
  });

  it('transform KafkaJSTopicMetadataNotLoaded', async () => {
    const params = {
      topic: faker.string.alpha(10),
    };
    const error = new KafkaJSTopicMetadataNotLoaded(kafkaError, params);

    expect(formatter.transform(error)).toEqual({
      retriable: true,
      ...params,
    });
  });

  it('transform KafkaJSStaleTopicMetadataAssignment', async () => {
    const params = {
      topic: faker.string.alpha(10),
      unknownPartitions: [
        {
          partitionErrorCode: faker.number.int(),
          partitionId: faker.number.int(),
          leader: faker.number.int(),
          replicas: [faker.number.int()],
          isr: [faker.number.int()],
          offlineReplicas: [faker.number.int()],
        },
      ],
    };
    const error = new KafkaJSStaleTopicMetadataAssignment(kafkaError, params);

    expect(formatter.transform(error)).toEqual({
      retriable: true,
      ...params,
    });
  });

  it('transform KafkaJSDeleteGroupsError', async () => {
    const groups = [
      {
        groupId: faker.string.alpha(10),
        errorCode: faker.number.int(),
        error: kafkaError,
      },
    ];
    const error = new KafkaJSDeleteGroupsError(kafkaError, groups);

    expect(formatter.transform(error)).toEqual({
      retriable: true,
      groups,
    });
  });

  it('transform KafkaJSServerDoesNotSupportApiKey', async () => {
    const params = {
      apiKey: faker.number.int(),
      apiName: faker.string.alpha(10),
    };
    const error = new KafkaJSServerDoesNotSupportApiKey(kafkaError, params);

    expect(formatter.transform(error)).toEqual({
      retriable: false,
      ...params,
    });
  });

  it('transform KafkaJSDeleteTopicRecordsError', async () => {
    const params = {
      topic: faker.string.alpha(10),
      partitions: [
        {
          partition: faker.number.int(),
          offset: faker.string.alpha(10),
          error: kafkaError,
        },
      ],
    };
    const error = new KafkaJSDeleteTopicRecordsError(params);

    expect(formatter.transform(error)).toEqual({
      retriable: true,
      ...params,
      topic: undefined,
    });
  });

  it('transform KafkaJSAlterPartitionReassignmentsError', async () => {
    const params = {
      topic: faker.string.alpha(10),
      partition: faker.number.int(),
    };
    const error = new KafkaJSAlterPartitionReassignmentsError(kafkaError, params.topic, params.partition);

    expect(formatter.transform(error)).toEqual({
      retriable: true,
      ...params,
    });
  });
});
