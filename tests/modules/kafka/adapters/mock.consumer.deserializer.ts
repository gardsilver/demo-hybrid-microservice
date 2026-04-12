import { KafkaMessage } from '@nestjs/microservices/external/kafka.interface';
import { KafkaHeadersHelper } from 'src/modules/kafka/kafka-common';
import { IKafkaMessageOptions, IConsumerDeserializer, IConsumerPacket } from 'src/modules/kafka/kafka-server';

export class MockConsumerDeserializer implements IConsumerDeserializer<string> {
  deserialize(value: KafkaMessage, options: IKafkaMessageOptions): IConsumerPacket<string> {
    return !options
      ? { pattern: undefined, data: undefined }
      : {
          pattern: options.topic,
          data: value.value
            ? {
                key: value.key?.toString(),
                value: value.value.toString(),
                headers: KafkaHeadersHelper.normalize(value.headers ?? {}),
              }
            : undefined,
        };
  }
}
