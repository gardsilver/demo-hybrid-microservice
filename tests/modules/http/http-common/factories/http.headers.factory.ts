import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { IGeneralAsyncContext, IHeaders } from 'src/modules/common';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';

export interface IBaseHeaders extends IHeaders {
  [HttpGeneralAsyncContextHeaderNames.TRACE_ID]?: string | string[];
  [HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID]?: string | string[];
  [HttpGeneralAsyncContextHeaderNames.SPAN_ID]?: string | string[];
  [HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID]?: string | string[];
  [HttpGeneralAsyncContextHeaderNames.CORRELATION_ID]?: string | string[];
  [HttpGeneralAsyncContextHeaderNames.REQUEST_ID]?: string | string[];
}

export const httpHeadersFactory = Factory.define<
  IBaseHeaders,
  IGeneralAsyncContext & { useZipkin?: boolean; asArray?: boolean }
>(({ transientParams }) => {
  const tgt: IHeaders = {};

  if ('traceId' in transientParams) {
    const value = transientParams.traceId ?? faker.string.uuid();

    if (transientParams?.useZipkin) {
      tgt[HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID] = TraceSpanHelper.formatToZipkin(value);
    } else {
      tgt[HttpGeneralAsyncContextHeaderNames.TRACE_ID] = value;
    }
  }

  if ('spanId' in transientParams) {
    const value = transientParams.spanId ?? faker.string.uuid();
    if (transientParams?.useZipkin) {
      tgt[HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID] = TraceSpanHelper.formatToZipkin(value);
    } else {
      tgt[HttpGeneralAsyncContextHeaderNames.SPAN_ID] = value;
    }
  }

  if ('requestId' in transientParams) {
    tgt[HttpGeneralAsyncContextHeaderNames.REQUEST_ID] = transientParams.requestId ?? faker.string.uuid();
  }

  if ('correlationId' in transientParams) {
    tgt[HttpGeneralAsyncContextHeaderNames.CORRELATION_ID] = transientParams.correlationId ?? faker.string.uuid();
  }

  if (transientParams?.asArray) {
    for (const key of Object.keys(tgt)) {
      if (typeof tgt[key] === 'string') {
        tgt[key] = tgt[key].split('-');
      }
    }
  }

  return {
    ...tgt,
  };
});
