import { randomUUID } from 'crypto';
import { ITraceSpan } from '../types/trace-span';

export abstract class TraceSpanHelper {
  public static generateRandomValue(): string {
    return randomUUID();
  }

  public static toZipkinFormat(ts: ITraceSpan): ITraceSpan {
    return {
      traceId: ts?.traceId ? TraceSpanHelper.formatToZipkin(ts?.traceId) : ts?.traceId,
      spanId: ts?.spanId ? TraceSpanHelper.formatToZipkin(ts?.spanId) : ts?.spanId,
      initialSpanId: ts?.initialSpanId ? TraceSpanHelper.formatToZipkin(ts?.initialSpanId) : ts?.initialSpanId,
      parentSpanId: ts?.parentSpanId ? TraceSpanHelper.formatToZipkin(ts?.parentSpanId) : ts?.parentSpanId,
    };
  }

  public static toGuidFormat(ts: ITraceSpan): ITraceSpan {
    return {
      traceId: ts?.traceId ? TraceSpanHelper.formatToGuid(ts?.traceId) : ts?.traceId,
      spanId: ts?.spanId ? TraceSpanHelper.formatToGuid(ts?.spanId) : ts?.spanId,
      initialSpanId: ts?.initialSpanId ? TraceSpanHelper.formatToGuid(ts?.initialSpanId) : ts?.initialSpanId,
      parentSpanId: ts?.parentSpanId ? TraceSpanHelper.formatToGuid(ts?.parentSpanId) : ts?.parentSpanId,
    };
  }

  public static formatToZipkin(value: string): string {
    return value.replace(/[^0-9a-z]/gi, '');
  }

  public static formatToGuid(value: string): string {
    const zipkin = TraceSpanHelper.formatToZipkin(value);

    return (
      zipkin.substring(0, 8) +
      '-' +
      zipkin.substring(8, 12) +
      '-' +
      zipkin.substring(12, 16) +
      '-' +
      zipkin.substring(16, 20) +
      '-' +
      zipkin.substring(20, 32)
    );
  }
}
