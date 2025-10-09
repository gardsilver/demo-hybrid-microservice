import { KafkaProducerConfig, IKafkaProducerOptions } from '../types/types';

export class KafkaProducerOptionsBuilder {
  public static build(options: IKafkaProducerOptions): KafkaProducerConfig {
    return {
      ...options,
    };
  }
}
