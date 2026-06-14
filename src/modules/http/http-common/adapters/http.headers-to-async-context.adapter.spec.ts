import { IKeyValue } from 'src/modules/common';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { OPENTELEMETRY_API_MOCK } from 'tests/opentelemetry';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { HttpGeneralAsyncContextHeaderNames } from '../types/general.async-context';
import { HttpHeadersToAsyncContextAdapter } from './http.headers-to-async-context.adapter';

jest.mock('@opentelemetry/api', () => ({
  ...jest.requireActual('@opentelemetry/api'),
  ...jest.requireActual('tests/opentelemetry').OPENTELEMETRY_API_MOCK,
}));

describe(HttpHeadersToAsyncContextAdapter.name, () => {
  const adapter = new HttpHeadersToAsyncContextAdapter();
  let mockTraceId: string | undefined;
  let randTraceId: string;
  let mockSpanId: string | undefined;
  let randSpanId: string;

  beforeEach(async () => {
    mockTraceId = TraceSpanHelper.generateTraceId();
    randTraceId = TraceSpanHelper.generateTraceId();
    mockSpanId = TraceSpanHelper.generateSpanId();
    randSpanId = TraceSpanHelper.generateSpanId();

    jest.spyOn(TraceSpanHelper, 'generateTraceId').mockImplementation(() => randTraceId);
    jest.spyOn(TraceSpanHelper, 'generateSpanId').mockImplementation(() => randSpanId);

    OPENTELEMETRY_API_MOCK.trace.getSpanContext.mockImplementation(() => ({
      traceId: mockTraceId,
      spanId: mockSpanId,
    }));

    jest.clearAllMocks();
  });

  it('Должен вернуть параметры трассировки соответствии с opentelemetry и в точности с заголовками остальные параметры', async () => {
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
    ) as unknown as IKeyValue<string>;

    const context = adapter.adapt(headers);

    expect(context).toEqual({
      traceId: mockTraceId,
      spanId: mockSpanId,
      parentSpanId: headers[HttpGeneralAsyncContextHeaderNames.SPAN_ID],
      initialSpanId: headers[HttpGeneralAsyncContextHeaderNames.SPAN_ID],
      requestId: headers[HttpGeneralAsyncContextHeaderNames.REQUEST_ID],
      correlationId: headers[HttpGeneralAsyncContextHeaderNames.CORRELATION_ID],
    });
  });

  it('Должен убрать requestId, и при этом spanId, parentSpanId и initialSpanId должны быть сгенерированы.', async () => {
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
    ) as unknown as IKeyValue<string>;

    mockSpanId = undefined;

    const context = adapter.adapt(headers);

    expect(context).toEqual({
      traceId: mockTraceId,
      spanId: randSpanId,
      parentSpanId: randSpanId,
      initialSpanId: randSpanId,
      correlationId: headers[HttpGeneralAsyncContextHeaderNames.CORRELATION_ID],
    });
  });

  it('Должен придумать traceId и spanId', async () => {
    const headers = httpHeadersFactory.build(
      {
        programsIds: ['1', '30'],
      },
      {
        transient: {},
      },
    ) as unknown as IKeyValue<string>;

    const context = adapter.adapt(headers);

    expect(context).toEqual({
      traceId: randTraceId,
      spanId: randSpanId,
      parentSpanId: randSpanId,
      initialSpanId: randSpanId,
    });
  });
});
