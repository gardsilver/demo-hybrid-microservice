/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { DateTimestamp, MILLISECONDS_IN_SECOND } from 'src/modules/date-timestamp';
import { GRACEFUL_SHUTDOWN_ON_COUNT_KEY } from '../types/constants';
import { GracefulShutdownCountMetadata, GracefulShutdownCountType } from '../types/types';

/** Счетчик активных процессов, завершение которых необходимо дождаться. */
export function GracefulShutdownOnCount(): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(GRACEFUL_SHUTDOWN_ON_COUNT_KEY, {}, target, propertyKey);

    const originalMethod = descriptor.value;

    const wrappedMethod = function (this: any, ...args: any[]) {
      const countData: GracefulShutdownCountType = {
        service: target.constructor.name,
        method: propertyKey.toString(),
      };

      const options = (Reflect.getMetadata(GRACEFUL_SHUTDOWN_ON_COUNT_KEY, originalMethod) ||
        Reflect.getMetadata(GRACEFUL_SHUTDOWN_ON_COUNT_KEY, wrappedMethod)) as GracefulShutdownCountMetadata;

      const start = new DateTimestamp();

      try {
        options?.increment?.call(options.instance, countData);

        const response = originalMethod.apply(this, args);

        if (response instanceof Promise) {
          return response
            .then((promiseResult) => {
              options?.decrement?.call(options.instance, {
                ...countData,
                duration: new DateTimestamp().diff(start) / MILLISECONDS_IN_SECOND,
                isSuccess: true,
              });
              return promiseResult;
            })
            .catch((e) => {
              options?.decrement?.call(options.instance, {
                ...countData,
                duration: new DateTimestamp().diff(start) / MILLISECONDS_IN_SECOND,
                isSuccess: false,
              });
              throw e;
            });
        }

        // Логика для синхронных методов
        options?.decrement?.call(options.instance, {
          ...countData,
          duration: new DateTimestamp().diff(start) / MILLISECONDS_IN_SECOND,
          isSuccess: true,
        });

        return response;
      } catch (exception) {
        options?.decrement?.call(options.instance, {
          ...countData,
          duration: new DateTimestamp().diff(start) / MILLISECONDS_IN_SECOND,
          isSuccess: false,
        });

        throw exception;
      }
    };

    // Копируем все метаданные с оригинального метода на обертку
    const metadataKeys = Reflect.getMetadataKeys(originalMethod);
    for (const key of metadataKeys) {
      const metadataValue = Reflect.getMetadata(key, originalMethod);
      Reflect.defineMetadata(key, metadataValue, wrappedMethod);
    }

    descriptor.value = wrappedMethod;

    return descriptor;
  };
}
