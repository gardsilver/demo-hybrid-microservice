import { MainRequest } from 'protos/compiled/demo/service/MainService';
import { IRabbitMqProducerMessage } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { IProducerSerializer, IProducerSerializerOptions } from 'src/modules/rabbit-mq/rabbit-mq-client';

export class DemoRequestSerializer implements IProducerSerializer<MainRequest> {
  serialize(
    value: IRabbitMqProducerMessage<MainRequest>,
    _options: IProducerSerializerOptions,
  ): IRabbitMqProducerMessage<Buffer | string> {
    return {
      ...value,
      content: value.content ? Buffer.from(MainRequest.encode(value.content).finish()) : undefined,
    };
  }
}
