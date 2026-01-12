import { IRabbitMqProducerMessage, RabbitMqMessageHelper } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { IProducerSerializer, IProducerSerializerOptions } from 'src/modules/rabbit-mq/rabbit-mq-client';

export class MockProducerSerializer implements IProducerSerializer {
  serialize(
    value: IRabbitMqProducerMessage,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: IProducerSerializerOptions,
  ): IRabbitMqProducerMessage<Buffer | string> {
    return {
      ...value,
      content: value.content?.toString(),
      publishOptions: {
        ...value.publishOptions,
        headers: RabbitMqMessageHelper.normalize(value.publishOptions.headers),
      },
    };
  }
}
