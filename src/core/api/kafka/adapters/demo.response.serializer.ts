import { MainResponse } from 'protos/compiled/demo/service/MainService';
import { IKafkaMessage } from 'src/modules/kafka/kafka-common';
import { IProducerSerializerOptions, IProducerPacket, IProducerSerializer } from 'src/modules/kafka/kafka-client';

export class DemoResponseSerializer implements IProducerSerializer<MainResponse> {
  serialize(
    value: IProducerPacket<MainResponse>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: IProducerSerializerOptions,
  ): IKafkaMessage<string | Buffer> {
    return {
      key: value.data.key ?? null,
      value: Buffer.from(MainResponse.encode(value.data.value).finish()),
      headers: value.data.headers,
    };
  }
}
