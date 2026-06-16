/* eslint-disable  @typescript-eslint/no-explicit-any */
import { ServerGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { trace, context as otelContext, TraceFlags, SpanStatusCode } from '@opentelemetry/api';
import { BaseHeadersHelper } from 'src/modules/common';
import { GeneralAsyncContext, IGeneralAsyncContext } from 'src/modules/common/context';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { GrpcHeadersHelper } from 'src/modules/grpc/grpc-common/helpers/grpc.headers.helper';

export class GrpcServerStrategy extends ServerGrpc {
  public override addHandler(pattern: string, callback: any, isStream?: boolean): void {
    if (callback?.__isWrappedWithTelemetry) {
      return super.addHandler(pattern, callback, isStream);
    }

    const wrappedHandler = async (...args: any[]) => {
      const firstArg = args[0];
      const secondArg = args[1];

      let metadata: Metadata | undefined;

      if (secondArg instanceof Metadata) {
        metadata = secondArg;
      } else if (firstArg && firstArg.metadata instanceof Metadata) {
        metadata = firstArg.metadata;
      }
      const rawHeadersMap = metadata ? metadata.getMap() : {};
      const normalizedHeaders = GrpcHeadersHelper.normalize(rawHeadersMap);

      const traceId = BaseHeadersHelper.searchHeaderAsString(
        normalizedHeaders,
        HttpGeneralAsyncContextHeaderNames.TRACE_ID,
      );
      const parentSpanId = BaseHeadersHelper.searchHeaderAsString(
        normalizedHeaders,
        HttpGeneralAsyncContextHeaderNames.SPAN_ID,
      );

      const tracer = trace.getTracer('grpc-server-transport');
      const operationName = `gRPC SERVER: ${GrpcHeadersHelper.parsePattern(pattern)}`;

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
            'rpc.system': 'grpc',
            'rpc.method': pattern,
          },
        },
        parentOtelContext,
      );

      const otelActiveContext = trace.setSpan(parentOtelContext, span);

      const enrichedContext: IGeneralAsyncContext = {
        traceId: span.spanContext().traceId,
        spanId: span.spanContext().spanId,
        parentSpanId: parentSpanId || '',
        initialSpanId: parentSpanId || '',
        requestId: BaseHeadersHelper.searchHeaderAsString(
          normalizedHeaders,
          HttpGeneralAsyncContextHeaderNames.REQUEST_ID,
        ),
        correlationId: BaseHeadersHelper.searchHeaderAsString(
          normalizedHeaders,
          HttpGeneralAsyncContextHeaderNames.CORRELATION_ID,
        ),
      };

      return otelContext.with(otelActiveContext, () => {
        return GeneralAsyncContext.instance.runWithContextAsync(async () => {
          try {
            const res = await callback(...args);

            span.setStatus({ code: SpanStatusCode.OK });
            span.end();
            return res;
          } catch (error: any) {
            span.recordException(error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
            span.end();
            throw error;
          }
        }, enrichedContext);
      });
    };

    (wrappedHandler as any).__isWrappedWithTelemetry = true;

    return super.addHandler(pattern, wrappedHandler, isStream);
  }
}
