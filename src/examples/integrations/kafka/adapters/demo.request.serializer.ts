import { MainRequest } from 'protos/compiled/demo/service/MainService';
import { IKafkaMessage } from 'src/modules/kafka/kafka-common';
import { IProducerSerializerOptions, IProducerPacket, IProducerSerializer } from 'src/modules/kafka/kafka-client';

export class DemoRequestSerializer implements IProducerSerializer<MainRequest> {
  serialize(value: IProducerPacket<MainRequest>, _options: IProducerSerializerOptions): IKafkaMessage<string | Buffer> {
    return {
      key: value.data.key ?? undefined,
      value: Buffer.from(MainRequest.encode(value.data.value).finish()),
      headers: value.data.headers,
    };
  }
}
