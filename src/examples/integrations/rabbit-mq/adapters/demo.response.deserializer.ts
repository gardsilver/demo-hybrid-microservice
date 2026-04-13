import { ConsumeMessage } from 'amqplib';
import { MainResponse } from 'protos/compiled/demo/service/MainService';
import {
  ConsumerDeserializer,
  IConsumerDeserializer,
  IConsumerPacket,
  IRabbitMqEventOptions,
} from 'src/modules/rabbit-mq/rabbit-mq-server';

export class DemoResponseDeserializer implements IConsumerDeserializer<MainResponse> {
  private rawDeserializer: ConsumerDeserializer;

  constructor() {
    this.rawDeserializer = new ConsumerDeserializer();
  }

  deserialize(
    value: ConsumeMessage,
    options: IRabbitMqEventOptions & { pattern: string },
  ): IConsumerPacket<MainResponse> | Promise<IConsumerPacket<MainResponse>> {
    const result = this.rawDeserializer.deserialize(value, options);

    return {
      ...result,
      data: result.data
        ? {
            ...result?.data,
            content: result.data.content ? MainResponse.decode(result.data.content) : undefined,
          }
        : undefined,
    };
  }
}
