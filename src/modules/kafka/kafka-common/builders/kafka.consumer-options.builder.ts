import { KafkaConsumerConfig, IKafkaConsumerOptions } from '../types/types';

export abstract class KafkaConsumerOptionsBuilder {
  public static build(options: IKafkaConsumerOptions): KafkaConsumerConfig {
    return {
      ...options,
    };
  }
}
