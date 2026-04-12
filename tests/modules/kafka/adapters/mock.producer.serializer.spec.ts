import { faker } from '@faker-js/faker';
import { IProducerPacket, IProducerSerializerOptions } from 'src/modules/kafka/kafka-client';
import { MockProducerSerializer } from './mock.producer.serializer';

describe(MockProducerSerializer.name, () => {
  let producerPacket: IProducerPacket;
  let adapter: MockProducerSerializer;

  beforeEach(async () => {
    adapter = new MockProducerSerializer();
    producerPacket = {
      topic: faker.string.alpha(3),
      data: {
        key: faker.string.alpha(3),
        value: faker.string.alpha(3),
        headers: {
          'x-header': faker.string.alpha(3),
        },
      },
    };
  });

  it('default', async () => {
    expect(adapter.serialize(producerPacket, undefined as unknown as IProducerSerializerOptions)).toEqual({
      ...producerPacket.data,
    });

    producerPacket.data.key = null;
    producerPacket.data.value = null;

    expect(adapter.serialize(producerPacket, undefined as unknown as IProducerSerializerOptions)).toEqual({
      key: null,
      headers: producerPacket.data.headers,
    });
  });
});
