/* eslint-disable @typescript-eslint/no-explicit-any */
import { GeneralAsyncContext, IGeneralAsyncContext } from 'src/modules/common';
import { DateTimestamp, MILLISECONDS_IN_SECOND } from 'src/modules/date-timestamp';
import { ElkLoggerEventService } from '../services/elk-logger.event-service';
import { IElkLoggerEvent, IElkLoggerOnMethod, IElkLoggerParams, ITargetLoggerOnMethod } from '../types/decorators.type';
import { ILogFields } from '../types/elk-logger.types';

const useLoggerParams = (
  loggerParamsBuilder:
    | ((Omit<IElkLoggerParams, 'fields'> | false) | ((options: any) => Omit<IElkLoggerParams, 'fields'> | false))
    | undefined,
  optionsBuilder: any,
  defaultValue: IElkLoggerParams,
  undefinedAsFalse?: boolean,
): IElkLoggerParams | false => {
  if (loggerParamsBuilder === undefined) {
    return undefinedAsFalse ? false : defaultValue;
  }

  let result: IElkLoggerParams | false;

  if (typeof loggerParamsBuilder === 'function') {
    result = loggerParamsBuilder(optionsBuilder);
  } else {
    result = loggerParamsBuilder;
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
        methodName: propertyKey.toString(),
        context,
        loggerPrams: false,
      };

      const fields: ILogFields = eventData.fields
        ? typeof eventData.fields === 'function'
          ? eventData.fields({ methodsArgs: args })
          : eventData.fields
        : {};

      const beforeCall = useLoggerParams(
        eventData.before,
        { methodsArgs: args },
        {
          fields,
          data: {
            payload: {
              args,
            },
          },
        },
      );

      const start = new DateTimestamp();
      let duration: number;
      let response;

      ElkLoggerEventService.emit(IElkLoggerEvent.BEFORE_CALL, { ...params, loggerPrams: beforeCall });

      try {
        response = originalMethod.apply(this, args);
        duration = new DateTimestamp().diff(start) / MILLISECONDS_IN_SECOND;
      } catch (exception) {
        duration = new DateTimestamp().diff(start) / MILLISECONDS_IN_SECOND;

        const throwCall = useLoggerParams(
          eventData.throw,
          {
            error: exception,
            duration,
            methodsArgs: args,
          },
          {
            fields,
            data: {
              payload: {
                duration,
                error: exception,
              },
            },
          },
        );

        ElkLoggerEventService.emit(IElkLoggerEvent.THROW_CALL, { ...params, loggerPrams: throwCall });

        throw exception;
      } finally {
        if (!(response instanceof Promise)) {
          const finallyCall = useLoggerParams(
            eventData.finally,
            {
              duration,
              methodsArgs: args,
            },
            {
              fields,
              data: {
                payload: {
                  duration,
                },
              },
            },
            true,
          );

          ElkLoggerEventService.emit(IElkLoggerEvent.FINALLY_CALL, { ...params, loggerPrams: finallyCall });
        }
      }

      if (!(response instanceof Promise)) {
        const afterCall = useLoggerParams(
          eventData.after,
          {
            result: response,
            duration,
            methodsArgs: args,
          },
          {
            fields,
            data: {
              payload: {
                duration,
                result: response,
              },
            },
          },
        );

        ElkLoggerEventService.emit(IElkLoggerEvent.AFTER_CALL, { ...params, loggerPrams: afterCall });

        return response;
      }

      // eslint-disable-next-line no-async-promise-executor, @typescript-eslint/no-misused-promises
      return new Promise(async (resolve, reject) => {
        try {
          const promiseResult = await response;
          duration = new DateTimestamp().diff(start) / MILLISECONDS_IN_SECOND;

          const afterCall = useLoggerParams(
            eventData.after,
            {
              result: promiseResult,
              duration,
              methodsArgs: args,
            },
            {
              fields,
              data: {
                payload: {
                  duration,
                  result: promiseResult,
                },
              },
            },
          );

          ElkLoggerEventService.emit(IElkLoggerEvent.AFTER_CALL, { ...params, loggerPrams: afterCall });

          resolve(promiseResult);
        } catch (error) {
          duration = new DateTimestamp().diff(start) / MILLISECONDS_IN_SECOND;

          const throwCall = useLoggerParams(
            eventData.throw,
            {
              error,
              duration,
              methodsArgs: args,
            },
            {
              fields,
              data: {
                payload: {
                  duration,
                  error,
                },
              },
            },
          );
          ElkLoggerEventService.emit(IElkLoggerEvent.THROW_CALL, { ...params, loggerPrams: throwCall });

          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(error);
        } finally {
          const finallyCall = useLoggerParams(
            eventData.finally,
            {
              duration,
              methodsArgs: args,
            },
            {
              fields,
              data: {
                payload: {
                  duration,
                },
              },
            },
            true,
          );

          ElkLoggerEventService.emit(IElkLoggerEvent.FINALLY_CALL, { ...params, loggerPrams: finallyCall });
        }
      });
    };

    return descriptor;
  };
}
