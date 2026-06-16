/* eslint-disable @typescript-eslint/no-explicit-any */
import { Socket } from 'socket.io';
import { trace, context as otelContext, TraceFlags, SpanStatusCode } from '@opentelemetry/api';
import { HttpGeneralAsyncContextHeaderNames, HttHeadersHelper } from 'src/modules/http/http-common';
import { BaseHeadersHelper } from 'src/modules/common/helpers/base.headers.helper';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { GeneralAsyncContext, IGeneralAsyncContext } from 'src/modules/common/context';

export abstract class WsConnectionContextHelper {
  public static run<R>(client: Socket, headersAdapter: any, executionBlock: () => R): R {
    const headers = HttHeadersHelper.normalize(client.handshake.headers);

    const traceId = BaseHeadersHelper.searchHeaderAsString(headers, HttpGeneralAsyncContextHeaderNames.TRACE_ID);
    const parentSpanId = BaseHeadersHelper.searchHeaderAsString(headers, HttpGeneralAsyncContextHeaderNames.SPAN_ID);

    const tracer = trace.getTracer('websocket-platform-transport');
    const operationName = `WS CONNECT: Handshake [${client.id}]`;

    let parentOtelContext = otelContext.active();

    if (traceId && parentSpanId) {
      parentOtelContext = trace.setSpanContext(otelContext.active(), {
        traceId: traceId.padStart(32, '0'),
        spanId: parentSpanId.padStart(16, '0'),
        traceFlags: TraceFlags.SAMPLED,
        isRemote: true,
      });
    } else {
      parentOtelContext = trace.setSpanContext(otelContext.active(), {
        traceId: TraceSpanHelper.generateTraceId(),
        spanId: TraceSpanHelper.generateSpanId(),
        traceFlags: TraceFlags.SAMPLED,
        isRemote: false,
      });
    }

    const span = tracer.startSpan(operationName, {}, parentOtelContext);
    const otelActiveContext = trace.setSpan(parentOtelContext, span);

    const asyncContext: IGeneralAsyncContext = {
      ...headersAdapter.adapt(headers),
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
      parentSpanId: parentSpanId || '',
      initialSpanId: parentSpanId || '',
    };

    return otelContext.with(otelActiveContext, () => {
      return GeneralAsyncContext.instance.runWithContext(() => {
        try {
          const result = executionBlock();
          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
          return result;
        } catch (error: any) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          span.end();
          throw error;
        }
      }, asyncContext);
    });
  }
}
