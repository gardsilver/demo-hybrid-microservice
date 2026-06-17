/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConsumeMessage } from 'amqplib';
import { trace, context as otelContext, TraceFlags, SpanStatusCode } from '@opentelemetry/api';
import { copyMetadata } from 'src/modules/common/utils';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { RabbitMqMessageHelper } from 'src/modules/rabbit-mq/rabbit-mq-common';

export function RabbitMqTelemetry(): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const methodName = String(propertyKey);
    const className = target?.constructor?.name ?? 'RabbitMqServer';

    const wrappedMethod = function (this: any, ...args: any[]) {
      // @TODO аргументы соответствуют сигнатуре RabbitMqServer.handleMessage
      const pattern = args[0] as string;
      const messageRef = args[1] as ConsumeMessage;

      if (!pattern || !messageRef || !messageRef.properties) {
        return originalMethod.apply(this, args);
      }
      const operationName = `RabbitMQ CONSUMER: ${methodName} [${pattern}]`;

      const normalizedHeaders = RabbitMqMessageHelper.normalize(messageRef.properties.headers || {});
      const traceId = RabbitMqMessageHelper.searchHeaderAsString(
        normalizedHeaders,
        HttpGeneralAsyncContextHeaderNames.TRACE_ID,
      );
      const parentSpanId = RabbitMqMessageHelper.searchHeaderAsString(
        normalizedHeaders,
        HttpGeneralAsyncContextHeaderNames.SPAN_ID,
      );

      const tracer = trace.getTracer('rabbitmq-server-transport');
      let parentOtelContext = otelContext.active();

      if (traceId && parentSpanId) {
        const customParentSpanContext = {
          traceId: traceId.padStart(32, '0'),
          spanId: parentSpanId.padStart(16, '0'),
          traceFlags: TraceFlags.SAMPLED,
          isRemote: true,
        };
        parentOtelContext = trace.setSpanContext(otelContext.active(), customParentSpanContext);
      } else {
        parentOtelContext = trace.setSpanContext(otelContext.active(), {
          traceId: TraceSpanHelper.generateTraceId(),
          spanId: TraceSpanHelper.generateSpanId(),
          traceFlags: TraceFlags.SAMPLED,
          isRemote: false,
        });
      }

      const span = tracer.startSpan(
        operationName,
        {
          attributes: {
            'messaging.system': 'rabbitmq',
            'messaging.operation': 'process',
            'messaging.destination': pattern,
            'code.function': methodName,
            'code.namespace': className,
          },
        },
        parentOtelContext,
      );

      const otelActiveContext = trace.setSpan(parentOtelContext, span);

      return otelContext.with(otelActiveContext, () => {
        try {
          const result = originalMethod.apply(this, args);

          if (result instanceof Promise) {
            return result
              .then((res) => {
                span.setStatus({ code: SpanStatusCode.OK });
                return res;
              })
              .catch((err) => {
                span.recordException(err);
                span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
                throw err;
              })
              .finally(() => span.end());
          }

          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
          return result;
        } catch (error: any) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          span.end();
          throw error;
        }
      });
    };

    copyMetadata(wrappedMethod, originalMethod);
    descriptor.value = wrappedMethod;
    return descriptor;
  };
}
