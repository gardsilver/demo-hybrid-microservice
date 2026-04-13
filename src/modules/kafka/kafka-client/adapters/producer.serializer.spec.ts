import { faker } from '@faker-js/faker';
import { IKafkaAsyncContext } from 'src/modules/kafka/kafka-common';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { kafkaHeadersFactory } from 'tests/modules/kafka';
import { IProducerPacket, IProducerSerializerOptions, ProducerMode } from '../types/types';
import { ProducerSerializer } from './producer.serializer';

describe(ProducerSerializer.name, () => {
  let asyncContext: IKafkaAsyncContext;
  let packet: IProducerPacket;
  let options: IProducerSerializerOptions;
  let serializer: ProducerSerializer;

  beforeEach(async () => {
    serializer = new ProducerSerializer();

    options = {
      serverName: faker.string.alpha(4),
      mode: ProducerMode.SEND,
    };
    asyncContext = generalAsyncContextFactory.build(
      {},
      {
        transient: {
          traceId: undefined,
          spanId: undefined,
          initialSpanId: undefined,
          parentSpanId: undefined,
          requestId: undefined,
          correlationId: undefined,
        },
      },
    );

    asyncContext.replyTopic = faker.string.alpha(4);
    asyncContext.replyPartition = faker.number.int(2);

    packet = {
      topic: faker.string.alpha(4),
      data: {
        key: faker.string.alpha(4),
        value: {
          status: 'ok',
        },
        headers: kafkaHeadersFactory.build(
          {
            programsIds: ['1', '30'],
          },
          {
            transient: {
              ...asyncContext,
            },
          },
        ),
      },
    };
  });

  it('init', async () => {
    expect(serializer).toBeDefined();
  });

  describe('serialize', () => {
    it('JSON', async () => {
      expect(serializer.serialize(packet, options)).toEqual({
        key: packet.data.key,
        value: JSON.stringify(packet.data.value),
        headers: packet.data.headers,
      });
    });

    it('null', async () => {
      packet.data.key = undefined;
      packet.data.value = null;

      expect(serializer.serialize(packet, options)).toEqual({
        key: null,
        value: null,
        headers: packet.data.headers,
      });
    });

    it('Buffer', async () => {
      packet.data.key = undefined;
      packet.data.value = Buffer.from(faker.string.alpha(4));

      expect(serializer.serialize(packet, options)).toEqual({
        key: null,
        value: packet.data.value,
        headers: packet.data.headers,
      });
    });

    it('number', async () => {
      const numberValue = faker.number.int(4);

      packet.data.key = undefined;
      packet.data.value = numberValue;

      expect(serializer.serialize(packet, options)).toEqual({
        key: null,
        value: numberValue.toString(),
        headers: packet.data.headers,
      });
    });
  });
});
