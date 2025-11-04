import { Message, ProducerRecord } from '@nestjs/microservices/external/kafka.interface';
import { IKafkaRequestOptions, IKafkaSendOptions } from '../types/types';

export abstract class KafkaClientHelper {
  public static mergeRequestOptions(
    globalOptions: Omit<IKafkaRequestOptions, 'serializer' | 'headerBuilder'>,
    options?: IKafkaRequestOptions,
  ): IKafkaRequestOptions {
    const requestOptions: IKafkaRequestOptions = {
      ...globalOptions,
      ...options,
      serializerOption: {
        ...globalOptions.serializerOption,
        ...options?.serializerOption,
      },
      headersBuilderOptions: {
        ...globalOptions.headersBuilderOptions,
        ...options?.headersBuilderOptions,
      },
    };

    return requestOptions;
  }

  public static buildMessageParams(options?: IKafkaSendOptions): Omit<Message, 'key' | 'value' | 'headers'> {
    return {
      partition: options?.partition,
      timestamp: options?.timestamp,
    };
  }

  public static buildProducerParams(options?: IKafkaSendOptions): Omit<ProducerRecord, 'topic' | 'messages'> {
    return {
      acks: options?.acks,
      timeout: options?.timeout,
      compression: options?.compression,
    };
  }
}
