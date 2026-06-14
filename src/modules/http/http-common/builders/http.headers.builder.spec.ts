import { merge } from 'ts-deepmerge';
import { faker } from '@faker-js/faker';
import { IGeneralAsyncContext, IHeaders } from 'src/modules/common';
import { ITraceSpan, TraceSpanBuilder } from 'src/modules/elk-logger';
import { CRYPTO_MOCK } from 'tests/crypto';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { IHttpHeadersBuilder } from '../types/types';
import { HttpGeneralAsyncContextHeaderNames } from '../types/general.async-context';
import { HttpHeadersBuilder } from './http.headers.builder';

describe(HttpHeadersBuilder.name, () => {
  let traceSpan: ITraceSpan;
  let asyncContext: IGeneralAsyncContext & {
    traceId: string;
    spanId: string;
    correlationId: string;
    requestId: string;
  };
  let headers: IHeaders;

  let builder: IHttpHeadersBuilder;

  beforeEach(async () => {
    builder = new HttpHeadersBuilder();

    traceSpan = TraceSpanBuilder.build();

    const builtContext = generalAsyncContextFactory.build(
      {},
      {
        transient: {
          initialSpanId: undefined,
          requestId: undefined,
          correlationId: undefined,
          ...traceSpan,
        },
      },
    );

    if (
      builtContext.traceId === undefined ||
      builtContext.spanId === undefined ||
      builtContext.correlationId === undefined ||
      builtContext.requestId === undefined
    ) {
      throw new Error('asyncContext is not fully populated by factory');
    }

    asyncContext = builtContext as typeof asyncContext;

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

  it('with headers', async () => {
    const traceId = CRYPTO_MOCK.randomBytes(16).toString('hex');
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
  });

  it('strips authorization header from input', async () => {
    const result = builder.build({
      asyncContext,
      headers: {
        authorization: 'Bearer secret',
        'x-keep': 'value',
      },
    });
    expect(result.authorization).toBeUndefined();
    expect(result['x-keep']).toBe('value');
  });
});
