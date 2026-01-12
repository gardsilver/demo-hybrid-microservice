/* eslint-disable @typescript-eslint/no-explicit-any */
import { Transport, EventPattern } from '@nestjs/microservices';
import { ConsumerMode, IEventKafkaMessageOptions } from '../types/types';

export const EventKafkaMessage: {
  <T = string>(metadata?: T): MethodDecorator;
  <T = string, K = unknown>(
    metadata?: T,
    options?:
      | (Record<string, any> & IEventKafkaMessageOptions<K>)
      | (() => Record<string, any> & IEventKafkaMessageOptions<K>),
  ): MethodDecorator;
} = <T = string, K = unknown>(
  metadata?: T,
  options?:
    | (Record<string, any> & IEventKafkaMessageOptions<K>)
    | (() => Record<string, any> & IEventKafkaMessageOptions<K>),
): MethodDecorator => {
  const params: Record<string, any> & IEventKafkaMessageOptions<K> =
    typeof options === 'function' ? options() : options;

  const extras = {
    ...params,
    mode: params?.mode ?? ConsumerMode.EACH_MESSAGE,
  };

  const decorator = EventPattern(metadata, Transport.KAFKA, extras);

  return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
    return decorator(target, key, descriptor);
  };
};
