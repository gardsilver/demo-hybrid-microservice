import { faker } from '@faker-js/faker';
import { BaseHeadersHelper } from 'src/modules/common';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { CRYPTO_MOCK } from 'tests/crypto';
import { OPENTELEMETRY_API_MOCK } from 'tests/opentelemetry';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { HttpGeneralAsyncContextHeaderNames } from '../types/general.async-context';
import { HttHeadersHelper } from './http.headers.helper';

jest.mock('@opentelemetry/api', () => ({
  ...jest.requireActual('@opentelemetry/api'),
  ...jest.requireActual('tests/opentelemetry').OPENTELEMETRY_API_MOCK,
}));

describe(HttHeadersHelper.name, () => {
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

  it('normalize', async () => {
    const ts = {
      traceId: CRYPTO_MOCK.randomBytes(16).toString('hex'),
      spanId: CRYPTO_MOCK.randomBytes(8).toString('hex'),
      requestId: faker.string.uuid(),
      correlationId: faker.string.uuid(),
    };

    const headers = httpHeadersFactory.build(
      {
        customParam: ['1', '30'],
      },
      {
        transient: {
          ...ts,
        },
      },
    );

    const spy = jest.spyOn(BaseHeadersHelper, 'normalize');

    HttHeadersHelper.normalize(headers);

    expect(spy).toHaveBeenCalledWith(headers);
  });

  describe('nameAsHeaderName', () => {
    it('default', async () => {
      const map: Record<string, string | undefined> = {};

      ['traceId', 'spanId', 'correlationId', 'requestId', 'customParam'].forEach((paramName) => {
        map[paramName] = HttHeadersHelper.nameAsHeaderName(paramName);
      });

      expect(map).toEqual({
        traceId: HttpGeneralAsyncContextHeaderNames.TRACE_ID,
        spanId: HttpGeneralAsyncContextHeaderNames.SPAN_ID,
        correlationId: HttpGeneralAsyncContextHeaderNames.CORRELATION_ID,
        requestId: HttpGeneralAsyncContextHeaderNames.REQUEST_ID,
      });
    });
  });

  describe('toAsyncContext', () => {
    it('default', async () => {
      const ts = {
        traceId: CRYPTO_MOCK.randomBytes(16).toString('hex'),
        spanId: CRYPTO_MOCK.randomBytes(8).toString('hex'),
        requestId: faker.string.uuid(),
        correlationId: faker.string.uuid(),
      };

      const headers = httpHeadersFactory.build(
        {
          customParam: ['1', '30'],
        },
        {
          transient: {
            ...ts,
          },
        },
      );

      let ctx = HttHeadersHelper.toAsyncContext(headers);

      expect(ctx).toEqual({
        traceId: mockTraceId,
        spanId: mockSpanId,
        initialSpanId: ts.spanId,
        parentSpanId: ts.spanId,
        correlationId: ts.correlationId,
        requestId: ts.requestId,
      });

      mockTraceId = undefined;
      mockSpanId = undefined;

      ctx = HttHeadersHelper.toAsyncContext(headers);

      expect(ctx).toEqual({
        traceId: randTraceId,
        spanId: randSpanId,
        initialSpanId: ts.spanId,
        parentSpanId: ts.spanId,
        correlationId: ts.correlationId,
        requestId: ts.requestId,
      });
    });
  });
});
