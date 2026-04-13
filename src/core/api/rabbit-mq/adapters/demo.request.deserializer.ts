import { ConsumeMessage } from 'amqplib';
import { MainRequest } from 'protos/compiled/demo/service/MainService';
import {
  ConsumerDeserializer,
  IConsumerDeserializer,
  IConsumerPacket,
  IRabbitMqEventOptions,
} from 'src/modules/rabbit-mq/rabbit-mq-server';

export class DemoRequestDeserializer implements IConsumerDeserializer<MainRequest> {
  private rawDeserializer: ConsumerDeserializer;

  constructor() {
    this.rawDeserializer = new ConsumerDeserializer();
  }

  deserialize(
    value: ConsumeMessage,
    options: IRabbitMqEventOptions & { pattern: string },
  ): IConsumerPacket<MainRequest> | Promise<IConsumerPacket<MainRequest>> {
    const result = this.rawDeserializer.deserialize(value, options);

    return {
      ...result,
      data: result.data
        ? {
            ...result?.data,
            content: result.data.content ? MainRequest.decode(result.data.content) : undefined,
          }
        : undefined,
    };
  }
}
