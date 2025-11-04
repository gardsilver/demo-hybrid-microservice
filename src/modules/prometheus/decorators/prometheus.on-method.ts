/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from 'crypto';
import { GeneralAsyncContext, IGeneralAsyncContext } from 'src/modules/common';
import { DateTimestamp, MILLISECONDS_IN_SECOND } from 'src/modules/date-timestamp';
import { PrometheusLabels } from '../types/types';
import { IPrometheusEventConfig, IPrometheusOnMethod, ITargetPrometheusOnMethod } from '../types/decorators.type';
import { PrometheusDecoratorHelper } from '../helpers/prometheus.decorator.helper';
import { PrometheusEventConfigDecoratorHelper } from '../helpers/prometheus.event-config.decorator.helper';
import { getPrometheusMetricConfig, PrometheusMetricConfig } from './prometheus.metric-config.on-service';
import { PrometheusEventService } from '../services/prometheus.event-service';

export function PrometheusOnMethod(eventData: IPrometheusOnMethod): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = function (this: any, ...args: any[]) {
      const ticketId = randomUUID();

      const defaultPrometheusMetricConfig: PrometheusMetricConfig = getPrometheusMetricConfig(target);

      const baseLabels: PrometheusLabels | false = eventData.labels
        ? typeof eventData.labels === 'function'
          ? eventData.labels({
              methodsArgs: args,

              labels: defaultPrometheusMetricConfig.labels === false ? undefined : defaultPrometheusMetricConfig.labels,
            })
          : (eventData.labels as undefined as PrometheusLabels)
        : false;

      const useLabels: PrometheusLabels = PrometheusDecoratorHelper.buildLabels(
        baseLabels === false ? undefined : baseLabels,
        defaultPrometheusMetricConfig.labels,
      );

      let context: IGeneralAsyncContext;

      try {
        context = GeneralAsyncContext.instance.extend();
      } catch {
        context = {};
      }

      const params: ITargetPrometheusOnMethod = {
        instanceName: target.constructor.name,
        methodName: propertyKey.toString(),
        context,
        flush: false,
        prometheusEventConfig: false,
      };

      const start = new DateTimestamp();
      let duration: number;
      let response;
      const endConfig = {
        histogram: false,
        summary: false,
      };

      try {
        const beforeCall: IPrometheusEventConfig = PrometheusEventConfigDecoratorHelper.build(
          eventData.before
            ? typeof eventData.before === 'function'
              ? eventData.before({ methodsArgs: args, labels: useLabels })
              : eventData.before
            : false,
          defaultPrometheusMetricConfig,
          useLabels,
        );

        if (beforeCall.histogram !== false && beforeCall.histogram.startTimer) {
          endConfig.histogram = true;
        }
        if (beforeCall.summary !== false && beforeCall.summary.startTimer) {
          endConfig.summary = true;
        }

        PrometheusEventService.emit(
          ticketId,
          {
            labels: useLabels,
            methodsArgs: args,
          },
          {
            ...params,
            prometheusEventConfig: beforeCall,
          },
        );

        response = originalMethod.apply(this, args);
        duration = new DateTimestamp().diff(start) / MILLISECONDS_IN_SECOND;
      } catch (exception) {
        duration = new DateTimestamp().diff(start) / MILLISECONDS_IN_SECOND;

        const throwCall: IPrometheusEventConfig = PrometheusEventConfigDecoratorHelper.build(
          eventData.throw
            ? typeof eventData.throw === 'function'
              ? eventData.throw({ error: exception, duration, methodsArgs: args, labels: useLabels })
              : eventData.throw
            : false,
          defaultPrometheusMetricConfig,
          useLabels,
        );

        PrometheusEventService.emit(
          ticketId,
          {
            error: exception,
            duration,
            labels: useLabels,
            methodsArgs: args,
          },
          {
            ...params,
            prometheusEventConfig: throwCall,
          },
        );

        throw exception;
      } finally {
        if (!(response instanceof Promise)) {
          const finallyCall: IPrometheusEventConfig = PrometheusEventConfigDecoratorHelper.build(
            eventData.finally
              ? typeof eventData.finally === 'function'
                ? eventData.finally({ duration, methodsArgs: args, labels: useLabels })
                : eventData.finally
              : false,
            defaultPrometheusMetricConfig,
            useLabels,
            {
              histogram: {
                value: duration,
                end: endConfig.histogram,
              },
              summary: {
                value: duration,
                end: endConfig.summary,
              },
            },
          );

          PrometheusEventService.emit(
            ticketId,
            {
              duration,
              labels: useLabels,
              methodsArgs: args,
            },
            {
              ...params,
              flush: true,
              prometheusEventConfig: finallyCall,
            },
          );
        }
      }

      if (!(response instanceof Promise)) {
        const afterCall: IPrometheusEventConfig = PrometheusEventConfigDecoratorHelper.build(
          eventData.after
            ? typeof eventData.after === 'function'
              ? eventData.after({ result: response, duration, methodsArgs: args, labels: useLabels })
              : eventData.after
            : false,
          defaultPrometheusMetricConfig,
          useLabels,
        );

        PrometheusEventService.emit(
          ticketId,
          {
            result: response,
            duration,
            labels: useLabels,
            methodsArgs: args,
          },
          {
            ...params,
            prometheusEventConfig: afterCall,
          },
        );

        return response;
      }

      // eslint-disable-next-line no-async-promise-executor, @typescript-eslint/no-misused-promises
      return new Promise(async (resolve, reject) => {
        try {
          const promiseResult = await response;
          duration = new DateTimestamp().diff(start) / MILLISECONDS_IN_SECOND;

          const afterCall: IPrometheusEventConfig = PrometheusEventConfigDecoratorHelper.build(
            eventData.after
              ? typeof eventData.after === 'function'
                ? eventData.after({ result: promiseResult, duration, methodsArgs: args, labels: useLabels })
                : eventData.after
              : false,
            defaultPrometheusMetricConfig,
            useLabels,
          );

          PrometheusEventService.emit(
            ticketId,
            {
              result: promiseResult,
              duration,
              labels: useLabels,
              methodsArgs: args,
            },
            {
              ...params,
              prometheusEventConfig: afterCall,
            },
          );

          resolve(promiseResult);
        } catch (error) {
          duration = new DateTimestamp().diff(start) / MILLISECONDS_IN_SECOND;

          const throwCall: IPrometheusEventConfig = PrometheusEventConfigDecoratorHelper.build(
            eventData.throw
              ? typeof eventData.throw === 'function'
                ? eventData.throw({ error, duration, methodsArgs: args, labels: useLabels })
                : eventData.throw
              : false,
            defaultPrometheusMetricConfig,
            useLabels,
          );

          PrometheusEventService.emit(
            ticketId,
            {
              error,
              duration,
              labels: useLabels,
              methodsArgs: args,
            },
            {
              ...params,
              prometheusEventConfig: throwCall,
            },
          );

          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(error);
        } finally {
          const finallyCall: IPrometheusEventConfig = PrometheusEventConfigDecoratorHelper.build(
            eventData.finally
              ? typeof eventData.finally === 'function'
                ? eventData.finally({ duration, methodsArgs: args, labels: useLabels })
                : eventData.finally
              : false,
            defaultPrometheusMetricConfig,
            useLabels,
            {
              histogram: {
                value: duration,
                end: endConfig.histogram,
              },
              summary: {
                value: duration,
                end: endConfig.summary,
              },
            },
          );

          PrometheusEventService.emit(
            ticketId,
            {
              duration,
              labels: useLabels,
              methodsArgs: args,
            },
            {
              ...params,
              flush: true,
              prometheusEventConfig: finallyCall,
            },
          );
        }
      });
    };

    return descriptor;
  };
}
