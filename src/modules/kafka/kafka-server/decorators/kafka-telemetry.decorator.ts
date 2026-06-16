/* eslint-disable  @typescript-eslint/no-explicit-any */
import { trace, context as otelContext, TraceFlags, SpanStatusCode } from '@opentelemetry/api';
import { BaseHeadersHelper } from 'src/modules/common';
import { copyMetadata } from 'src/modules/common/utils';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { KafkaHeadersHelper } from 'src/modules/kafka/kafka-common/helpers/kafka.headers.helper';

export function KafkaTelemetry(): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const methodName = String(propertyKey);
    const className = target?.constructor?.name ?? 'KafkaServer';

    const wrappedMethod = function (this: any, ...args: any[]) {
      const payload = args[0]; // @TODO Предполагает, что первый аргумент всегда EachMessagePayload или EachBatchPayload
      if (!payload) {
        return originalMethod.apply(this, args);
      }

      let topic;
      let rawKafkaHeaders: any = {};
      let operationName = `Kafka CONSUMER: ${methodName}`;

      if (payload.message) {
        topic = payload.topic;
        rawKafkaHeaders = payload.message.headers ?? {};
        operationName = `Kafka CONSUMER: eachMessage [${topic}]`;
      } else if (payload.batch && payload.batch.messages && payload.batch.messages.length > 0) {
        topic = payload.batch.topic;
        rawKafkaHeaders = payload.batch.messages[0].headers ?? {};
        operationName = `Kafka CONSUMER: eachBatch [${topic}]`;
      }
      const normalizedHeaders = KafkaHeadersHelper.normalize(rawKafkaHeaders);

      const traceId = BaseHeadersHelper.searchHeaderAsString(
        normalizedHeaders,
        HttpGeneralAsyncContextHeaderNames.TRACE_ID,
      );
      const parentSpanId = BaseHeadersHelper.searchHeaderAsString(
        normalizedHeaders,
        HttpGeneralAsyncContextHeaderNames.SPAN_ID,
      );

      const tracer = trace.getTracer('kafka-server-transport');
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
            'messaging.system': 'kafka',
            'messaging.operation': 'process',
            'messaging.destination': topic,
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
