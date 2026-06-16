import {
  Context,
  TextMapPropagator,
  TextMapSetter,
  TextMapGetter,
  trace,
  TraceFlags,
  SpanContext,
} from '@opentelemetry/api';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';

class Propagator implements TextMapPropagator {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extract(context: Context, carrier: any, getter: TextMapGetter): Context {
    const traceId = getter.get(carrier, HttpGeneralAsyncContextHeaderNames.TRACE_ID) as string;
    const spanId = getter.get(carrier, HttpGeneralAsyncContextHeaderNames.SPAN_ID) as string;

    if (!traceId || !spanId) {
      return context;
    }

    const formattedTraceId = traceId
      .replace(/[^0-9a-fA-F]/g, '')
      .toLowerCase()
      .padStart(32, '0');
    const formattedSpanId = spanId
      .replace(/[^0-9a-fA-F]/g, '')
      .toLowerCase()
      .padStart(16, '0');

    const currentActiveSpanContext = trace.getSpanContext(context);
    const isActuallyRemote = !currentActiveSpanContext || currentActiveSpanContext.traceId !== formattedTraceId;

    const spanContext: SpanContext = {
      traceId: formattedTraceId,
      spanId: formattedSpanId,
      traceFlags: TraceFlags.SAMPLED,
      isRemote: isActuallyRemote,
    };

    return trace.setSpanContext(context, spanContext);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inject(context: Context, carrier: any, setter: TextMapSetter): void {
    const spanContext = trace.getSpanContext(context);

    if (!spanContext || !spanContext.traceId) return;

    // Проверяем, заполнил ли уже HttpHeadersBuilder эти поля в объекте carrier
    const currentTraceId = carrier[HttpGeneralAsyncContextHeaderNames.TRACE_ID];
    const currentSpanId = carrier[HttpGeneralAsyncContextHeaderNames.SPAN_ID];

    // Записываем только в том случае, если заголовки еще пустые
    if (!currentTraceId) {
      setter.set(carrier, HttpGeneralAsyncContextHeaderNames.TRACE_ID, spanContext.traceId);
    }
    if (!currentSpanId) {
      setter.set(carrier, HttpGeneralAsyncContextHeaderNames.SPAN_ID, spanContext.spanId);
    }
  }

  fields(): string[] {
    return [HttpGeneralAsyncContextHeaderNames.TRACE_ID, HttpGeneralAsyncContextHeaderNames.SPAN_ID];
  }
}

export abstract class PropagatorBuilder {
  public static build(): TextMapPropagator {
    return new Propagator();
  }
}
