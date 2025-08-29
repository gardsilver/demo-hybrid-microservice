import { IKeyValue } from 'src/modules/common';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { HttpGeneralAsyncContextHeaderNames } from '../types/general.async-context';
import { HttpHeadersToAsyncContextAdapter } from './http.headers-to-async-context.adapter';

describe(HttpHeadersToAsyncContextAdapter.name, () => {
  const adapter = new HttpHeadersToAsyncContextAdapter();
  let mockId: string;

  beforeEach(async () => {
    mockId = TraceSpanHelper.generateRandomValue();
    jest.spyOn(TraceSpanHelper, 'generateRandomValue').mockImplementation(() => mockId);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('Должен вернуть в точности с заголовками', async () => {
    const headers = httpHeadersFactory.build(
      {
        programsIds: ['1', '30'],
      },
      {
        transient: {
          traceId: undefined,
          spanId: undefined,
          requestId: undefined,
          correlationId: undefined,
        },
      },
    ) as undefined as IKeyValue<string>;

    const context = adapter.adapt(headers);

    expect(context).toEqual({
      traceId: headers[HttpGeneralAsyncContextHeaderNames.TRACE_ID],
      spanId: mockId,
      parentSpanId: headers[HttpGeneralAsyncContextHeaderNames.SPAN_ID],
      initialSpanId: headers[HttpGeneralAsyncContextHeaderNames.SPAN_ID],
      requestId: headers[HttpGeneralAsyncContextHeaderNames.REQUEST_ID],
      correlationId: headers[HttpGeneralAsyncContextHeaderNames.CORRELATION_ID],
    });
  });

  it('Должен вернуть декодированные заголовки', async () => {
    const headers = httpHeadersFactory.build(
      {
        programsIds: ['1', '30'],
      },
      {
        transient: {
          traceId: undefined,
          spanId: undefined,
          requestId: undefined,
          correlationId: undefined,
          useZipkin: true,
        },
      },
    ) as undefined as IKeyValue<string>;

    const context = adapter.adapt(headers);

    expect(context).toEqual({
      traceId: TraceSpanHelper.formatToGuid(headers[HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID]),
      spanId: mockId,
      parentSpanId: TraceSpanHelper.formatToGuid(headers[HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID]),
      initialSpanId: TraceSpanHelper.formatToGuid(headers[HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID]),
      requestId: headers[HttpGeneralAsyncContextHeaderNames.REQUEST_ID],
      correlationId: headers[HttpGeneralAsyncContextHeaderNames.CORRELATION_ID],
    });
  });

  it('Должен убрать requestId, parentSpanId и initialSpanId', async () => {
    const headers = httpHeadersFactory.build(
      {
        programsIds: ['1', '30'],
      },
      {
        transient: {
          traceId: undefined,
          correlationId: undefined,
        },
      },
    ) as undefined as IKeyValue<string>;

    const context = adapter.adapt(headers);

    expect(context).toEqual({
      traceId: headers[HttpGeneralAsyncContextHeaderNames.TRACE_ID],
      spanId: mockId,
      correlationId: headers[HttpGeneralAsyncContextHeaderNames.CORRELATION_ID],
    });
  });

  it('Должен придумать traceId', async () => {
    const headers = httpHeadersFactory.build(
      {
        programsIds: ['1', '30'],
      },
      {
        transient: {},
      },
    ) as undefined as IKeyValue<string>;

    const context = adapter.adapt(headers);

    expect(context).toEqual({
      traceId: mockId,
      spanId: mockId,
    });
  });

  it('Если traceId является массивом', async () => {
    const headers = httpHeadersFactory.build(
      {},
      {
        transient: {
          traceId: undefined,
          asArray: true,
        },
      },
    ) as undefined as IKeyValue<string[]>;

    const traceId = headers[HttpGeneralAsyncContextHeaderNames.TRACE_ID].join('-');

    expect(adapter.adapt(headers)).toEqual({
      traceId,
      spanId: mockId,
    });

    headers[HttpGeneralAsyncContextHeaderNames.TRACE_ID] = [];

    expect(adapter.adapt(headers)).toEqual({
      traceId: mockId,
      spanId: mockId,
    });
  });
});
