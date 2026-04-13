import { KafkaMessage } from '@nestjs/microservices/external/kafka.interface';
import { MainRequest } from 'protos/compiled/demo/service/MainService';
import {
  ConsumerDeserializer,
  IConsumerPacket,
  IConsumerDeserializer,
  IKafkaMessageOptions,
} from 'src/modules/kafka/kafka-server';

export class DemoRequestDeserializer implements IConsumerDeserializer<MainRequest> {
  private rawDeserializer: ConsumerDeserializer;

  constructor() {
    this.rawDeserializer = new ConsumerDeserializer();
  }

  deserialize(value: KafkaMessage, options: IKafkaMessageOptions): IConsumerPacket<MainRequest> {
    const result = this.rawDeserializer.deserialize(value, options);

    return {
      ...result,
      data: result.data?.value
        ? {
            ...result.data,
            value: MainRequest.decode(result.data.value),
          }
        : undefined,
    };
  }
}
