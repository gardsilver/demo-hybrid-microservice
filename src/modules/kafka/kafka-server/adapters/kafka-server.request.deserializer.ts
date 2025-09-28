import { KafkaMessage } from '@nestjs/microservices/external/kafka.interface';
import { KafkaHeadersHelper } from 'src/modules/kafka/kafka-common';
import { IConsumerRequestDeserializer } from 'src/modules/kafka/kafka-server';
import { IKafkaMessageOptions, KafkaRequest } from '../types/types';

export class KafkaServerRequestDeserializer implements IConsumerRequestDeserializer<Buffer | null> {
  deserialize(value: KafkaMessage, options: IKafkaMessageOptions): KafkaRequest<Buffer | null> {
    return !options
      ? { pattern: undefined, data: undefined }
      : {
          pattern: options.topic,
          data: value.value
            ? {
                key: value.key.toString(),
                value: value.value,
                headers: KafkaHeadersHelper.normalize(value.headers ?? {}),
              }
            : undefined,
        };
  }
}
