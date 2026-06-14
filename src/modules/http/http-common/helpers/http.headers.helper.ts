import { trace, context } from '@opentelemetry/api';
import { IAsyncContext } from 'src/modules/async-context';
import { BaseHeadersHelper, IHeaders, IKeyValue } from 'src/modules/common';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { HttpGeneralAsyncContextHeaderNames } from '../types/general.async-context';

export abstract class HttHeadersHelper {
  public static normalize<H extends object = IKeyValue>(headers: H): IHeaders {
    return BaseHeadersHelper.normalize(headers);
  }

  public static nameAsHeaderName(name: string): string | undefined {
    const map: Record<string, HttpGeneralAsyncContextHeaderNames> = {
      traceId: HttpGeneralAsyncContextHeaderNames.TRACE_ID,
      spanId: HttpGeneralAsyncContextHeaderNames.SPAN_ID,
      correlationId: HttpGeneralAsyncContextHeaderNames.CORRELATION_ID,
      requestId: HttpGeneralAsyncContextHeaderNames.REQUEST_ID,
    };

    return map[name];
  }

  public static toAsyncContext<Ctx extends IAsyncContext>(headers: IHeaders): Ctx {
    const activeSpanContext = trace.getSpanContext(context.active());

    const traceId = activeSpanContext?.traceId ?? TraceSpanHelper.generateTraceId();
    const spanId = activeSpanContext?.spanId ?? TraceSpanHelper.generateSpanId();
    const parentSpanId = HttHeadersHelper.searchValue(headers, HttpGeneralAsyncContextHeaderNames.SPAN_ID) ?? spanId;

    return {
      traceId,
      spanId,
      parentSpanId,
      initialSpanId: parentSpanId,
      requestId: HttHeadersHelper.searchValue(headers, HttpGeneralAsyncContextHeaderNames.REQUEST_ID),
      correlationId: HttHeadersHelper.searchValue(headers, HttpGeneralAsyncContextHeaderNames.CORRELATION_ID),
    } as unknown as Ctx;
  }

  protected static searchValue(headers: IHeaders, ...headerName: string[]): string | undefined {
    const result = BaseHeadersHelper.searchValue(headers, ...headerName);

    if (Array.isArray(result.value)) {
      result.value = result.value.length ? result.value.join('-') : undefined;
    }

    if (result.value === undefined) {
      return undefined;
    }

    return result.value;
  }
}
