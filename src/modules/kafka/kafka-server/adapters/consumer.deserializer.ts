import { KafkaMessage } from '@nestjs/microservices/external/kafka.interface';
import { KafkaHeadersHelper } from 'src/modules/kafka/kafka-common';
import { IKafkaMessageOptions, IConsumerPacket, IConsumerDeserializer } from '../types/types';

export class ConsumerDeserializer implements IConsumerDeserializer<Buffer | null> {
  deserialize(value: KafkaMessage, options: IKafkaMessageOptions): IConsumerPacket<Buffer | null> {
    return !options
      ? { pattern: undefined, data: undefined }
      : {
          pattern: options.topic,
          data: value.value
            ? {
                key: value.key?.toString(),
                value: value.value,
                headers: KafkaHeadersHelper.normalize(value.headers ?? {}),
              }
            : undefined,
        };
  }
}
