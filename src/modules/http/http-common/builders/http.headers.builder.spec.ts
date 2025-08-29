import { merge } from 'ts-deepmerge';
import { faker } from '@faker-js/faker';
import { IGeneralAsyncContext, IHeaders } from 'src/modules/common';
import { ITraceSpan, TraceSpanBuilder, TraceSpanHelper } from 'src/modules/elk-logger';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { IHttpHeadersBuilder } from '../types/types';
import { HttpGeneralAsyncContextHeaderNames } from '../types/general.async-context';
import { HttpHeadersBuilder } from './http.headers.builder';

describe(HttpHeadersBuilder.name, () => {
  let traceSpan: ITraceSpan;
  let asyncContext: IGeneralAsyncContext;
  let headers: IHeaders;

  let builder: IHttpHeadersBuilder;

  beforeEach(async () => {
    builder = new HttpHeadersBuilder();

    traceSpan = TraceSpanBuilder.build();

    asyncContext = generalAsyncContextFactory.build(
      {},
      {
        transient: {
          traceId: undefined,
          spanId: undefined,
          initialSpanId: undefined,
          parentSpanId: undefined,
          requestId: undefined,
          correlationId: undefined,
          ...traceSpan,
        },
      },
    );

    headers = httpHeadersFactory.build(
      {
        programsIds: ['1', '30'],
      },
      {
        transient: {
          ...asyncContext,
        },
      },
    );
  });

  it('init', async () => {
    expect(builder).toBeDefined();
  });

  it('default', async () => {
    const result = builder.build({ asyncContext });

    expect(result).toEqual({
      ...headers,
      programsIds: undefined,
    });
  });

  it('useZipkin', async () => {
    const result = builder.build({ asyncContext }, { useZipkin: true });

    expect(result).toEqual({
      ...headers,
      programsIds: undefined,
      [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: undefined,
      [HttpGeneralAsyncContextHeaderNames.SPAN_ID]: undefined,
      [HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID]: TraceSpanHelper.formatToZipkin(traceSpan.traceId),
      [HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID]: TraceSpanHelper.formatToZipkin(traceSpan.spanId),
    });
  });

  it('asArray', async () => {
    const result = builder.build({ asyncContext }, { asArray: true });

    expect(result).toEqual({
      [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: asyncContext.traceId.split('-'),
      [HttpGeneralAsyncContextHeaderNames.SPAN_ID]: asyncContext.spanId.split('-'),
      [HttpGeneralAsyncContextHeaderNames.CORRELATION_ID]: asyncContext.correlationId.split('-'),
      [HttpGeneralAsyncContextHeaderNames.REQUEST_ID]: asyncContext.requestId.split('-'),
    });
  });

  it('with headers', async () => {
    const traceId = faker.string.uuid();
    let result = builder.build({
      asyncContext: {
        ...asyncContext,
        traceId,
        spanId: undefined,
      },
      headers: {
        [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: asyncContext.traceId,
        [HttpGeneralAsyncContextHeaderNames.SPAN_ID]: asyncContext.spanId,
        [HttpGeneralAsyncContextHeaderNames.REQUEST_ID]: faker.string.uuid(),
        programsIds: ['1', '30'],
      },
    });

    expect(result).toEqual({
      [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: traceId,
      [HttpGeneralAsyncContextHeaderNames.SPAN_ID]: asyncContext.spanId,
      [HttpGeneralAsyncContextHeaderNames.CORRELATION_ID]: asyncContext.correlationId,
      [HttpGeneralAsyncContextHeaderNames.REQUEST_ID]: asyncContext.requestId,
      programsIds: ['1', '30'],
    });

    const copyHeaders = merge({}, headers);

    result = builder.build({
      asyncContext: {},
      headers: copyHeaders,
    });

    expect(copyHeaders).toEqual(headers);
    expect(result).toEqual(headers);

    result = builder.build(
      {
        asyncContext,
        headers: copyHeaders,
      },
      { useZipkin: true },
    );

    expect(copyHeaders).toEqual(headers);

    expect(result).toEqual({
      [HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID]: TraceSpanHelper.formatToZipkin(asyncContext.traceId),
      [HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID]: TraceSpanHelper.formatToZipkin(asyncContext.spanId),
      [HttpGeneralAsyncContextHeaderNames.CORRELATION_ID]: headers[HttpGeneralAsyncContextHeaderNames.CORRELATION_ID],
      [HttpGeneralAsyncContextHeaderNames.REQUEST_ID]: headers[HttpGeneralAsyncContextHeaderNames.REQUEST_ID],
      programsIds: ['1', '30'],
    });
  });

  it('with headers and useZipkin', async () => {
    const traceId = faker.string.uuid();
    const result = builder.build(
      {
        asyncContext: {
          ...asyncContext,
          traceId,
          spanId: undefined,
        },
        headers: {
          [HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID]: TraceSpanHelper.formatToZipkin(asyncContext.traceId),
          [HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID]: TraceSpanHelper.formatToZipkin(asyncContext.spanId),
          [HttpGeneralAsyncContextHeaderNames.REQUEST_ID]: faker.string.uuid(),
        },
      },
      { useZipkin: true },
    );

    expect(result).toEqual({
      [HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID]: TraceSpanHelper.formatToZipkin(traceId),
      [HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID]: TraceSpanHelper.formatToZipkin(asyncContext.spanId),
      [HttpGeneralAsyncContextHeaderNames.CORRELATION_ID]: asyncContext.correlationId,
      [HttpGeneralAsyncContextHeaderNames.REQUEST_ID]: asyncContext.requestId,
    });
  });
});
