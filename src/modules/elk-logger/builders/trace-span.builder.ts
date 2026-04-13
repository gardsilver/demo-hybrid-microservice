import { ITraceSpan } from '../types/trace-span';
import { TraceSpanHelper } from '../helpers/trace-span.helper';

export abstract class TraceSpanBuilder {
  public static build(ts?: Partial<ITraceSpan>): ITraceSpan {
    const spanId = ts?.spanId ?? TraceSpanHelper.generateRandomValue();

    return {
      traceId: ts?.traceId ?? TraceSpanHelper.generateRandomValue(),
      spanId,
      parentSpanId: ts?.parentSpanId ?? spanId,
      initialSpanId: ts?.initialSpanId,
    };
  }
}
