import { MainResponse } from 'protos/compiled/demo/service/MainService';
import { IRabbitMqProducerMessage } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { IProducerSerializer, IProducerSerializerOptions } from 'src/modules/rabbit-mq/rabbit-mq-client';

export class DemoResponseSerializer implements IProducerSerializer<MainResponse> {
  serialize(
    value: IRabbitMqProducerMessage<MainResponse>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: IProducerSerializerOptions,
  ): IRabbitMqProducerMessage<Buffer | string> {
    return {
      ...value,
      content: Buffer.from(MainResponse.encode(value.content).finish()),
    };
  }
}
