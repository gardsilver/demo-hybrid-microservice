import { ConsumeMessage } from 'amqplib';
import { RabbitMqMessageHelper } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { IConsumerDeserializer, IConsumerPacket, IRabbitMqEventOptions } from 'src/modules/rabbit-mq/rabbit-mq-server';

export class MockConsumerDeserializer implements IConsumerDeserializer<string> {
  deserialize(value: ConsumeMessage, options: IRabbitMqEventOptions & { pattern: string }): IConsumerPacket<string> {
    return !options
      ? { pattern: undefined, data: undefined }
      : {
          pattern: options.pattern,
          data: value.content
            ? {
                ...value,
                content: value.content.toString(),
                properties: {
                  ...value.properties,
                  headers: RabbitMqMessageHelper.normalize(value.properties?.headers ?? {}),
                },
              }
            : undefined,
        };
  }
}
