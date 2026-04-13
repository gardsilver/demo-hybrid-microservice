/* eslint-disable @typescript-eslint/no-explicit-any */
import { GeneralAsyncContext } from 'src/modules/common';
import { DateTimestamp, MILLISECONDS_IN_SECOND } from 'src/modules/date-timestamp';
import { ILogFields } from '../types/elk-logger.types';
import { IElkLoggerEvent, IElkLoggerOnMethod, IElkLoggerParams, ITargetLoggerOnMethod } from '../types/decorators.type';
import { ElkLoggerOptions, getElkLoggerOptions } from './elk-logger.on-service';
import { ElkLoggerEventService } from '../services/elk-logger.event-service';
import { LogFieldsHelper } from '../helpers/log-fields.helper';

const useLoggerParams = (
  loggerParamsBuilder:
    | ((Omit<IElkLoggerParams, 'fields'> | boolean) | ((options: any) => Omit<IElkLoggerParams, 'fields'> | boolean))
    | undefined,
  optionsBuilder: any,
  defaultValue: IElkLoggerParams,
  undefinedAsFalse?: boolean,
): IElkLoggerParams | false => {
  if (loggerParamsBuilder === undefined) {
    return undefinedAsFalse ? false : defaultValue;
  }
  if (typeof loggerParamsBuilder === 'boolean') {
    return loggerParamsBuilder ? defaultValue : false;
  }

  let result: IElkLoggerParams | false;

  if (typeof loggerParamsBuilder === 'function') {
    const params = loggerParamsBuilder(optionsBuilder);

    result = params === true ? defaultValue : params;
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
      const defaultElkLoggerOptions: ElkLoggerOptions = getElkLoggerOptions(target);

      const params: ITargetLoggerOnMethod = {
        service: target.constructor.name,
        method: propertyKey.toString(),
        context: GeneralAsyncContext.instance.extend(),
        loggerPrams: false,
      };

      let fields: ILogFields = eventData.fields
        ? typeof eventData.fields === 'function'
          ? eventData.fields({
              service: params.service,
              method: params.method,
              methodsArgs: args,
            })
          : eventData.fields
        : {};

      if (defaultElkLoggerOptions.fields !== false) {
        fields = LogFieldsHelper.merge(defaultElkLoggerOptions.fields, fields);
      }

      const beforeCall = useLoggerParams(
        eventData.before,
        {
          service: params.service,
          method: params.method,
          methodsArgs: args,
        },
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

      let duration: number = 0;
      let response;

      ElkLoggerEventService.emit(IElkLoggerEvent.BEFORE_CALL, { ...params, loggerPrams: beforeCall });

      let callError: boolean = false;

      try {
        response = originalMethod.apply(this, args);
        duration = new DateTimestamp().diff(start) / MILLISECONDS_IN_SECOND;
      } catch (exception) {
        duration = new DateTimestamp().diff(start) / MILLISECONDS_IN_SECOND;
        callError = true;

        const throwCall = useLoggerParams(
          eventData.throw,
          {
            service: params.service,
            method: params.method,
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
        if (callError || !(response instanceof Promise)) {
          const finallyCall = useLoggerParams(
            eventData.finally,
            {
              service: params.service,
              method: params.method,
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
            service: params.service,
            method: params.method,
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
              service: params.service,
              method: params.method,
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
              service: params.service,
              method: params.method,
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
              service: params.service,
              method: params.method,
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
