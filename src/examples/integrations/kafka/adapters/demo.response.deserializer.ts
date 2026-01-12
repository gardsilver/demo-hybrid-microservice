import { KafkaMessage } from '@nestjs/microservices/external/kafka.interface';
import { MainResponse } from 'protos/compiled/demo/service/MainService';
import {
  ConsumerDeserializer,
  IConsumerPacket,
  IConsumerDeserializer,
  IKafkaMessageOptions,
} from 'src/modules/kafka/kafka-server';

export class DemoResponseDeserializer implements IConsumerDeserializer<MainResponse> {
  private rawDeserializer: ConsumerDeserializer;

  constructor() {
    this.rawDeserializer = new ConsumerDeserializer();
  }

  deserialize(value: KafkaMessage, options: IKafkaMessageOptions): IConsumerPacket<MainResponse> {
    const result = this.rawDeserializer.deserialize(value, options);

    return {
      ...result,
      data: result.data
        ? {
            ...result.data,
            value: result.data.value ? MainResponse.decode(result.data.value) : null,
          }
        : undefined,
    };
  }
}
