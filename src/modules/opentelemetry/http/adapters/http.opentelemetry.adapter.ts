import { ExpressAdapter } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { trace, context as otelContext, TraceFlags, SpanKind, Span } from '@opentelemetry/api';
import { GeneralAsyncContext, IGeneralAsyncContext } from 'src/modules/common/context';
import { HttpGeneralAsyncContextHeaderNames, HttHeadersHelper } from 'src/modules/http/http-common';
import { BaseHeadersHelper } from 'src/modules/common/helpers/base.headers.helper';
import { TraceSpanHelper } from 'src/modules/elk-logger';

type ResponseWithExtras = Response & Record<string | symbol, unknown>;

const OTEL_SPAN_SYMBOL = Symbol('OTEL_SPAN_SYMBOL');

export class HttpOpentelemetryAdapter extends ExpressAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(instance?: any) {
    super(instance);

    const expressInstance = this.getInstance();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expressInstance.use((req: Request, res: Response, next: any) => {
      const headers = HttHeadersHelper.normalize(req.headers);

      const traceId = BaseHeadersHelper.searchHeaderAsString(headers, HttpGeneralAsyncContextHeaderNames.TRACE_ID);
      const parentSpanId = BaseHeadersHelper.searchHeaderAsString(headers, HttpGeneralAsyncContextHeaderNames.SPAN_ID);

      const tracer = trace.getTracer('custom-http-server-transport');
      const operationName = `HTTP SERVER: ${req.method} ${req.originalUrl || req.url}`;

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

      const httpSpan = tracer.startSpan(operationName, { kind: SpanKind.SERVER }, parentOtelContext);
      const activeOtelContext = trace.setSpan(parentOtelContext, httpSpan);

      (res as ResponseWithExtras)[OTEL_SPAN_SYMBOL] = httpSpan;

      const asyncContext: IGeneralAsyncContext = {
        traceId: httpSpan.spanContext().traceId,
        spanId: httpSpan.spanContext().spanId,
        parentSpanId: parentSpanId || '',
        initialSpanId: parentSpanId || '',
        requestId:
          BaseHeadersHelper.searchHeaderAsString(headers, HttpGeneralAsyncContextHeaderNames.REQUEST_ID) ||
          TraceSpanHelper.generateSpanId(),
        correlationId: BaseHeadersHelper.searchHeaderAsString(
          headers,
          HttpGeneralAsyncContextHeaderNames.CORRELATION_ID,
        ),
      };

      otelContext.with(activeOtelContext, () => {
        GeneralAsyncContext.instance.runWithContext(
          () => {
            return next();
          },
          asyncContext,
          `HTTP SERVER (HttpOpentelemetryAdapter): ${req.method} ${req.originalUrl || req.url}`,
        );
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public override reply(res: Response, body: any, statusCode?: number): any {
    const httpSpan = (res as ResponseWithExtras)[OTEL_SPAN_SYMBOL] as Span;
    if (httpSpan) {
      httpSpan.end();
      delete (res as ResponseWithExtras)[OTEL_SPAN_SYMBOL];
    }
    return super.reply(res, body, statusCode);
  }
}
