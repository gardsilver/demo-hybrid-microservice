import { faker } from '@faker-js/faker';
import { KafkaMessage } from 'kafkajs';
import { kafkaMessageFactory } from 'tests/modules/kafka';
import { KafkaServerRequestDeserializer } from './kafka-server.request.deserializer';
import { ConsumerMode, IKafkaMessageOptions } from '../types/types';

describe(KafkaServerRequestDeserializer.name, () => {
  let topic: string;
  let kafkaMessage: KafkaMessage;
  let deserializer: KafkaServerRequestDeserializer;

  beforeEach(async () => {
    deserializer = new KafkaServerRequestDeserializer();

    topic = faker.string.alpha(10);

    kafkaMessage = kafkaMessageFactory.build(undefined, {
      transient: {
        key: 'test key',
        value: 'test value',
        headers: {
          traceId: undefined,
          spanId: undefined,
          requestId: undefined,
          correlationId: undefined,
          replyTopic: undefined,
          replyPartition: undefined,
        },
      },
    });

    jest.clearAllMocks();
  });

  it('deserialize default', async () => {
    expect(
      deserializer.deserialize(kafkaMessage, {
        mode: ConsumerMode.EACH_BATCH,
        serverName: faker.string.alpha(10),
        topic,
      } as undefined as IKafkaMessageOptions),
    ).toEqual({
      pattern: topic,
      data: {
        key: 'test key',
        value: Buffer.from('test value', 'utf-8'),
        headers: kafkaMessage.headers,
      },
    });

    kafkaMessage.headers = undefined;

    expect(
      deserializer.deserialize(kafkaMessage, {
        mode: ConsumerMode.EACH_BATCH,
        serverName: faker.string.alpha(10),
        topic,
      } as undefined as IKafkaMessageOptions),
    ).toEqual({
      pattern: topic,
      data: {
        key: 'test key',
        value: Buffer.from('test value', 'utf-8'),
        headers: {},
      },
    });
  });

  it('deserialize as skip', async () => {
    kafkaMessage.value = null;

    expect(
      deserializer.deserialize(kafkaMessage, {
        mode: ConsumerMode.EACH_BATCH,
        serverName: faker.string.alpha(10),
        topic,
      } as undefined as IKafkaMessageOptions),
    ).toEqual({
      pattern: topic,
    });
  });

  it('deserialize as unknown', async () => {
    expect(deserializer.deserialize(kafkaMessage, undefined)).toEqual({});
  });
});
