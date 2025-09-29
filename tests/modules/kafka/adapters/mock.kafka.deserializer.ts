import { KafkaMessage } from '@nestjs/microservices/external/kafka.interface';
import { KafkaHeadersHelper } from 'src/modules/kafka/kafka-common';
import { IKafkaMessageOptions, IConsumerRequestDeserializer, KafkaRequest } from 'src/modules/kafka/kafka-server';

export class MockKafkaDeserializer implements IConsumerRequestDeserializer<string> {
  deserialize(value: KafkaMessage, options: IKafkaMessageOptions): KafkaRequest<string> {
    return !options
      ? { pattern: undefined, data: undefined }
      : {
          pattern: options.topic,
          data: value.value
            ? {
                key: value.key.toString(),
                value: value.value.toString(),
                headers: KafkaHeadersHelper.normalize(value.headers ?? {}),
              }
            : undefined,
        };
  }
}
