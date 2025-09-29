import { KafkaConsumerConfig, IKafkaConsumerOptions } from '../types/types';

export class KafkaConsumerOptionsBuilder {
  public static build(options: IKafkaConsumerOptions): KafkaConsumerConfig {
    return {
      ...{
        ...options,
        retry: undefined,
      },
    };
  }
}
