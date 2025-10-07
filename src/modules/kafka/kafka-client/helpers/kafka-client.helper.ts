import { Message, ProducerRecord } from '@nestjs/microservices/external/kafka.interface';
import { IKafkaRequestOptions } from '../types/types';

export class KafkaClientHelper {
  public static buildMessageParams(options?: IKafkaRequestOptions): Omit<Message, 'key' | 'value' | 'headers'> {
    return {
      partition: options?.partition,
      timestamp: options?.timestamp,
    };
  }

  public static buildProducerParams(options?: IKafkaRequestOptions): Omit<ProducerRecord, 'topic' | 'messages'> {
    return {
      acks: options?.acks,
      timeout: options?.timeout,
      compression: options?.compression,
    };
  }
}
