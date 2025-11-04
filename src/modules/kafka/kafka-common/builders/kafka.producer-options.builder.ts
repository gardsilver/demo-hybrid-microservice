import { KafkaProducerConfig, IKafkaProducerOptions } from '../types/types';

export abstract class KafkaProducerOptionsBuilder {
  public static build(options: IKafkaProducerOptions): KafkaProducerConfig {
    return {
      ...options,
    };
  }
}
