/* eslint-disable @typescript-eslint/no-explicit-any */
import { GeneralAsyncContext, IGeneralAsyncContext } from 'src/modules/common';
import { ElkLoggerEventService } from '../services/elk-logger.event-service';
import { IElkLoggerEvent, IElkLoggerOnMethod, IElkLoggerPrams, ITargetLoggerOnMethod } from '../types/decorators.type';
import { ILogFields } from '../types/elk-logger.types';

const useLoggerPrams = (
  loggerPramsBuilder:
    | ((Omit<IElkLoggerPrams, 'fields'> | false) | ((options: any) => Omit<IElkLoggerPrams, 'fields'> | false))
    | undefined,
  optionsBuilder: any,
  defaultValue: IElkLoggerPrams,
): IElkLoggerPrams | false => {
  if (loggerPramsBuilder === undefined) {
    return defaultValue;
  }

  let result: IElkLoggerPrams | false;

  if (typeof loggerPramsBuilder === 'function') {
    result = loggerPramsBuilder(optionsBuilder);
  } else {
    result = loggerPramsBuilder;
  }

  if (result !== false) {
    result = {
      ...defaultValue,
      ...result,
    };
  }

  return result;
};

export function ElkLoggerOnMethod(eventData: IElkLoggerOnMethod): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = function (this: any, ...args: any[]) {
      let context: IGeneralAsyncContext;

      try {
        context = GeneralAsyncContext.instance.extend();
      } catch {
        context = {};
      }

      const params: ITargetLoggerOnMethod = {
        instanceName: target.constructor.name,
        methodName: originalMethod.name,
        context,
        loggerPrams: false,
      };

      const fields: ILogFields = eventData.fields
        ? typeof eventData.fields === 'function'
          ? eventData.fields({ methodsArgs: args })
          : eventData.fields
        : {};

      const beforeCall = useLoggerPrams(
        eventData.before,
        { fields, methodsArgs: args },
        {
          fields,
          data: {
            payload: {
              args,
            },
          },
        },
      );

      try {
        ElkLoggerEventService.emit(IElkLoggerEvent.BEFORE_CALL, { ...params, loggerPrams: beforeCall });

        const response = originalMethod.apply(this, args);

        if (response instanceof Promise) {
          // eslint-disable-next-line no-async-promise-executor, @typescript-eslint/no-misused-promises
          return new Promise(async (resolve, reject) => {
            try {
              const promiseResult = await response;

              const afterCall = useLoggerPrams(
                eventData.after,
                { result: promiseResult, fields, methodsArgs: args },
                {
                  fields,
                  data: {
                    payload: {
                      result: promiseResult,
                    },
                  },
                },
              );

              ElkLoggerEventService.emit(IElkLoggerEvent.AFTER_CALL, { ...params, loggerPrams: afterCall });

              resolve(promiseResult);
            } catch (error) {
              const throwCall = useLoggerPrams(
                eventData.throw,
                { error, fields, methodsArgs: args },
                {
                  fields,
                  data: {
                    payload: {
                      error,
                    },
                  },
                },
              );

              ElkLoggerEventService.emit(IElkLoggerEvent.THROW_CALL, { ...params, loggerPrams: throwCall });
              // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
              reject(error);
            }
          });
        }

        const afterCall = useLoggerPrams(
          eventData.after,
          { result: response, fields, methodsArgs: args },
          {
            fields,
            data: {
              payload: {
                result: response,
              },
            },
          },
        );

        ElkLoggerEventService.emit(IElkLoggerEvent.AFTER_CALL, { ...params, loggerPrams: afterCall });

        return response;
      } catch (exception) {
        const throwCall = useLoggerPrams(
          eventData.throw,
          { error: exception, fields, methodsArgs: args },
          {
            fields,
            data: {
              payload: {
                error: exception,
              },
            },
          },
        );

        ElkLoggerEventService.emit(IElkLoggerEvent.THROW_CALL, { ...params, loggerPrams: throwCall });

        throw exception;
      }
    };

    return descriptor;
  };
}
