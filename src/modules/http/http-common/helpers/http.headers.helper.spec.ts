import { faker } from '@faker-js/faker';
import { BaseHeadersHelper } from 'src/modules/common';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { HttpGeneralAsyncContextHeaderNames } from '../types/general.async-context';
import { HttHeadersHelper } from './http.headers.helper';

describe(HttHeadersHelper.name, () => {
  let mockId: string;

  beforeEach(async () => {
    mockId = TraceSpanHelper.generateRandomValue();
    jest.spyOn(TraceSpanHelper, 'generateRandomValue').mockImplementation(() => mockId);
  });

  it('normalize', async () => {
    const ts = {
      traceId: faker.string.uuid(),
      spanId: faker.string.uuid(),
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
      const map = {};

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

    it('as zipkin', async () => {
      const map = {};

      ['traceId', 'spanId', 'correlationId', 'requestId', 'customParam'].forEach((paramName) => {
        map[paramName] = HttHeadersHelper.nameAsHeaderName(paramName, true);
      });

      expect(map).toEqual({
        traceId: HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID,
        spanId: HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID,
        correlationId: HttpGeneralAsyncContextHeaderNames.CORRELATION_ID,
        requestId: HttpGeneralAsyncContextHeaderNames.REQUEST_ID,
      });
    });
  });

  describe('toAsyncContext', () => {
    it('default', async () => {
      const ts = {
        traceId: faker.string.uuid(),
        spanId: faker.string.uuid(),
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

      expect(HttHeadersHelper.toAsyncContext(headers)).toEqual({
        traceId: ts.traceId,
        spanId: mockId,
        initialSpanId: ts.spanId,
        parentSpanId: ts.spanId,
        correlationId: ts.correlationId,
        requestId: ts.requestId,
      });
    });

    it('as zipkin', async () => {
      const ts = {
        traceId: faker.string.uuid(),
        spanId: faker.string.uuid(),
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
            useZipkin: true,
          },
        },
      );

      expect(HttHeadersHelper.toAsyncContext(headers)).toEqual({
        traceId: ts.traceId,
        spanId: mockId,
        initialSpanId: ts.spanId,
        parentSpanId: ts.spanId,
        correlationId: ts.correlationId,
        requestId: ts.requestId,
      });
    });

    it('form array format', async () => {
      const ts = {
        traceId: faker.string.uuid(),
        spanId: faker.string.uuid(),
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
            asArray: true,
          },
        },
      );

      expect(HttHeadersHelper.toAsyncContext(headers)).toEqual({
        traceId: ts.traceId,
        spanId: mockId,
        initialSpanId: ts.spanId,
        parentSpanId: ts.spanId,
        correlationId: ts.correlationId,
        requestId: ts.requestId,
      });

      headers[HttpGeneralAsyncContextHeaderNames.TRACE_ID] = [];

      expect(HttHeadersHelper.toAsyncContext(headers)).toEqual({
        traceId: mockId,
        spanId: mockId,
        initialSpanId: ts.spanId,
        parentSpanId: ts.spanId,
        correlationId: ts.correlationId,
        requestId: ts.requestId,
      });
    });
  });
});
