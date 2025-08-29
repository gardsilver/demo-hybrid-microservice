/* eslint-disable @typescript-eslint/no-explicit-any */
import { DateTimestamp, MILLISECONDS_IN_SECOND } from 'src/modules/date-timestamp';
import { GRACEFUL_SHUTDOWN_ON_COUNT_KEY } from '../types/constants';
import { GracefulShutdownCountMetadata, GracefulShutdownCountType } from '../types/types';

//** Счетчик активных процессов, завершение которых необходимо дождаться. */
export function GracefulShutdownOnCount(): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(GRACEFUL_SHUTDOWN_ON_COUNT_KEY, {}, target, propertyKey);

    const originalMethod = descriptor.value;

    descriptor.value = function (this: any, ...args: any[]) {
      const countData: GracefulShutdownCountType = {
        service: target.constructor.name,
        method: propertyKey.toString(),
      };

      const options = Reflect.getMetadata(
        GRACEFUL_SHUTDOWN_ON_COUNT_KEY,
        descriptor.value,
      ) as GracefulShutdownCountMetadata;

      const start = new DateTimestamp();

      try {
        options.increment?.call(options.instance, countData);

        const response = originalMethod.apply(this, args);

        if (response instanceof Promise) {
          // eslint-disable-next-line no-async-promise-executor, @typescript-eslint/no-misused-promises
          return new Promise(async (resolve, reject) => {
            try {
              const promiseResult = await response;
              options.decrement?.call(options.instance, {
                ...countData,
                duration: new DateTimestamp().diff(start) / MILLISECONDS_IN_SECOND,
                isSuccess: true,
              });
              resolve(promiseResult);
            } catch (e) {
              options.decrement?.call(options.instance, {
                ...countData,
                duration: new DateTimestamp().diff(start) / MILLISECONDS_IN_SECOND,
                isSuccess: false,
              });
              // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
              reject(e);
            }
          });
        }
        options.decrement?.call(options.instance, {
          ...countData,
          duration: new DateTimestamp().diff(start) / MILLISECONDS_IN_SECOND,
          isSuccess: true,
        });

        return response;
      } catch (exception) {
        options.decrement?.call(options.instance, {
          ...countData,
          duration: new DateTimestamp().diff(start) / MILLISECONDS_IN_SECOND,
          isSuccess: false,
        });

        throw exception;
      }
    };

    return descriptor;
  };
}
