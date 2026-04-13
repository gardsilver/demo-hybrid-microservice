/* eslint-disable @typescript-eslint/no-explicit-any */
import { Transport, EventPattern } from '@nestjs/microservices';
import { IEventRabbitMqMessageOptions } from '../types/types';

export const EventRabbitMqMessage: {
  <T = string>(metadata?: T): MethodDecorator;
  <T = string, K = unknown>(
    metadata?: T,
    options?:
      | (Record<string, any> & IEventRabbitMqMessageOptions<K>)
      | (() => Record<string, any> & IEventRabbitMqMessageOptions<K>),
  ): MethodDecorator;
} = <T = string, K = unknown>(
  metadata?: T,
  options?:
    | (Record<string, any> & IEventRabbitMqMessageOptions<K>)
    | (() => Record<string, any> & IEventRabbitMqMessageOptions<K>),
): MethodDecorator => {
  const params: (Record<string, any> & IEventRabbitMqMessageOptions<K>) | undefined =
    typeof options === 'function' ? options() : options;

  const extras = {
    ...params,
  };

  const decorator = EventPattern(metadata, Transport.RMQ, extras);

  return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
    return decorator(target, key, descriptor);
  };
};
