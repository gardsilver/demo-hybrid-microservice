import { IAsyncContext } from 'src/modules/async-context';
import { BaseHeadersHelper, IHeaders, IKeyValue } from 'src/modules/common';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { HttpGeneralAsyncContextHeaderNames } from '../types/general.async-context';

export class HttHeadersHelper {
  public static normalize<H = IKeyValue>(headers: H): IHeaders {
    return BaseHeadersHelper.normalize(headers);
  }

  public static nameAsHeaderName(name: string, useZipkin?: boolean): string {
    return (
      {
        traceId: useZipkin
          ? HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID
          : HttpGeneralAsyncContextHeaderNames.TRACE_ID,
        spanId: useZipkin
          ? HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID
          : HttpGeneralAsyncContextHeaderNames.SPAN_ID,
        correlationId: HttpGeneralAsyncContextHeaderNames.CORRELATION_ID,
        requestId: HttpGeneralAsyncContextHeaderNames.REQUEST_ID,
      }[name] ?? undefined
    );
  }

  public static toAsyncContext<Ctx extends IAsyncContext>(headers: IHeaders): Ctx {
    const traceId =
      this.searchValue(
        headers,
        HttpGeneralAsyncContextHeaderNames.TRACE_ID,
        HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID,
      ) ?? TraceSpanHelper.generateRandomValue();

    const parentSpanId = this.searchValue(
      headers,
      HttpGeneralAsyncContextHeaderNames.SPAN_ID,
      HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID,
    );

    const ctx: Ctx = {
      traceId,
      spanId: TraceSpanHelper.generateRandomValue(),
      parentSpanId,
      initialSpanId: parentSpanId,
      requestId: this.searchValue(headers, HttpGeneralAsyncContextHeaderNames.REQUEST_ID),
      correlationId: this.searchValue(headers, HttpGeneralAsyncContextHeaderNames.CORRELATION_ID),
    } as undefined as Ctx;

    return ctx;
  }

  private static searchValue(headers: IHeaders, ...headerName: string[]): string {
    const result = BaseHeadersHelper.searchValue(headers, ...headerName);

    if (Array.isArray(result.value)) {
      result.value = result.value.length ? result.value.join('-') : undefined;
    }

    if (result.value === undefined) {
      return undefined;
    }

    if (
      [HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID, HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID].includes(
        result.header as undefined as HttpGeneralAsyncContextHeaderNames,
      )
    ) {
      return TraceSpanHelper.formatToGuid(result.value);
    }

    return result.value;
  }
}
