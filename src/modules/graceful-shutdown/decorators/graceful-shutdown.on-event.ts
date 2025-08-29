import { GRACEFUL_SHUTDOWN_ON_EVENT_KEY } from '../types/constants';
import { GracefulShutdownEventMetadata } from '../types/types';

export function GracefulShutdownOnEvent(eventData: GracefulShutdownEventMetadata): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(GRACEFUL_SHUTDOWN_ON_EVENT_KEY, eventData, target, propertyKey);

    return descriptor;
  };
}
