import { faker } from '@faker-js/faker';
import { KafkaMessage } from '@nestjs/microservices/external/kafka.interface';
import { ConsumerMode } from 'src/modules/kafka/kafka-server';
import { MockConsumerDeserializer } from './mock.consumer.deserializer';

describe(MockConsumerDeserializer.name, () => {
  let key: string;
  let value: string;
  let kafkaMessage: KafkaMessage;
  let adapter: MockConsumerDeserializer;

  beforeEach(async () => {
    adapter = new MockConsumerDeserializer();
    key = faker.string.alpha(3);
    value = faker.string.alpha(3);
    kafkaMessage = {
      key: Buffer.from(key, 'utf-8'),
      value: Buffer.from(value, 'utf-8'),
      headers: {
        'x-header': faker.string.alpha(3),
      },
    } as undefined as KafkaMessage;
  });

  it('default', async () => {
    expect(adapter.deserialize(undefined, undefined)).toEqual({});

    expect(adapter.deserialize(kafkaMessage, undefined)).toEqual({});
    expect(
      adapter.deserialize(kafkaMessage, {
        topic: 'topic',
        serverName: 'serverName',
        mode: ConsumerMode.EACH_BATCH,
      }),
    ).toEqual({
      pattern: 'topic',
      data: {
        key,
        value,
        headers: kafkaMessage.headers,
      },
    });

    kafkaMessage.headers = undefined;

    expect(
      adapter.deserialize(kafkaMessage, {
        topic: 'topic',
        serverName: 'serverName',
        mode: ConsumerMode.EACH_BATCH,
      }),
    ).toEqual({
      pattern: 'topic',
      data: {
        key,
        value,
        headers: {},
      },
    });

    kafkaMessage.value = null;

    expect(
      adapter.deserialize(kafkaMessage, {
        topic: 'topic',
        serverName: 'serverName',
        mode: ConsumerMode.EACH_BATCH,
      }),
    ).toEqual({
      pattern: 'topic',
      data: undefined,
    });
  });
});
