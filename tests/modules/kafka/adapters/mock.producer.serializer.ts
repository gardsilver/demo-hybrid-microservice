import { IProducerPacket, IProducerSerializer, IProducerSerializerOptions } from 'src/modules/kafka/kafka-client';
import { IKafkaMessage, KafkaHeadersHelper } from 'src/modules/kafka/kafka-common';

export class MockProducerSerializer implements IProducerSerializer {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  serialize(value: IProducerPacket, options: IProducerSerializerOptions): IKafkaMessage<string | Buffer> {
    return {
      key: value.data.key ?? null,
      value: value.data.value?.toString(),
      headers: KafkaHeadersHelper.normalize(value.data.headers),
    };
  }
}
