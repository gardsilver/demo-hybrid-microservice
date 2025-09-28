import { KafkaMessage } from '@nestjs/microservices/external/kafka.interface';
import {
  KafkaServerRequestDeserializer,
  KafkaRequest,
  IConsumerRequestDeserializer,
  IKafkaMessageOptions,
} from 'src/modules/kafka/kafka-server';

export class DemoDeserializer implements IConsumerRequestDeserializer<string> {
  private rawDeserializer: KafkaServerRequestDeserializer;

  constructor() {
    this.rawDeserializer = new KafkaServerRequestDeserializer();
  }

  deserialize(value: KafkaMessage, options: IKafkaMessageOptions): KafkaRequest<string> {
    const result = this.rawDeserializer.deserialize(value, options);

    return {
      ...result,
      data: {
        ...result.data,
        value: result.data.value ? result.data.value.toString() : null,
      },
    };
  }
}
