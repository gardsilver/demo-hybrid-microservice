import { IProducerPacket, IProducerSerializer, IProducerSerializerOptions } from 'src/modules/kafka/kafka-client';
import { IKafkaMessage, KafkaHeadersHelper } from 'src/modules/kafka/kafka-common';

export class MockProducerSerializer implements IProducerSerializer {
  serialize(value: IProducerPacket, _options: IProducerSerializerOptions): IKafkaMessage<string | Buffer | null> {
    return {
      key: value.data.key ?? null,
      value: value.data.value?.toString(),
      headers: KafkaHeadersHelper.normalize(value.data.headers ?? {}),
    } as unknown as IKafkaMessage<string | Buffer | null>;
  }
}
