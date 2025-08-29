export interface ITraceSpan {
  traceId: string;
  spanId: string;
  initialSpanId: string;
  parentSpanId: string;
}
