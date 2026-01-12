import { ConsumeMessage } from 'amqplib';
import { RabbitMqMessageHelper } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { IRabbitMqEventOptions, IConsumerPacket, IConsumerDeserializer } from '../types/types';

export class ConsumerDeserializer implements IConsumerDeserializer<Buffer> {
  deserialize(value: ConsumeMessage, options: IRabbitMqEventOptions & { pattern: string }): IConsumerPacket<Buffer> {
    return !options
      ? { pattern: undefined, data: undefined }
      : {
          pattern: options.pattern,
          data: value.content
            ? {
                ...value,
                properties: {
                  ...value.properties,
                  headers: RabbitMqMessageHelper.normalize(value.properties?.headers ?? {}),
                },
              }
            : undefined,
        };
  }
}
