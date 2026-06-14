import { faker } from '@faker-js/faker';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { CRYPTO_MOCK } from 'tests/crypto';
import { OPENTELEMETRY_API_MOCK } from 'tests/opentelemetry';
import { kafkaHeadersFactory } from 'tests/modules/kafka';
import { KafkaHeadersHelper } from './kafka.headers.helper';
import { KafkaAsyncContextHeaderNames } from '../types/constants';

jest.mock('@opentelemetry/api', () => ({
  ...jest.requireActual('@opentelemetry/api'),
  ...jest.requireActual('tests/opentelemetry').OPENTELEMETRY_API_MOCK,
}));

describe(KafkaHeadersHelper.name, () => {
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

  describe('nameAsHeaderName', () => {
    it('default', async () => {
      const map: Record<string, string | undefined> = {};

      ['traceId', 'spanId', 'correlationId', 'requestId', 'replyTopic', 'replyPartition', 'customParam'].forEach(
        (paramName) => {
          map[paramName] = KafkaHeadersHelper.nameAsHeaderName(paramName);
        },
      );

      expect(map).toEqual({
        traceId: HttpGeneralAsyncContextHeaderNames.TRACE_ID,
        spanId: HttpGeneralAsyncContextHeaderNames.SPAN_ID,
        correlationId: HttpGeneralAsyncContextHeaderNames.CORRELATION_ID,
        requestId: HttpGeneralAsyncContextHeaderNames.REQUEST_ID,
        replyTopic: KafkaAsyncContextHeaderNames.REPLY_TOPIC,
        replyPartition: KafkaAsyncContextHeaderNames.REPLY_PARTITION,
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
        replyTopic: faker.string.alpha(6),
        replyPartition: faker.number.int(),
      };

      const headers = kafkaHeadersFactory.build(
        {
          customParam: ['1', '30'],
        },
        {
          transient: {
            ...ts,
          },
        },
      );

      expect(KafkaHeadersHelper.toAsyncContext(headers)).toEqual({
        traceId: mockTraceId,
        spanId: mockSpanId,
        initialSpanId: ts.spanId,
        parentSpanId: ts.spanId,
        correlationId: ts.correlationId,
        requestId: ts.requestId,
        replyTopic: ts.replyTopic,
        replyPartition: ts.replyPartition,
      });

      delete headers[KafkaAsyncContextHeaderNames.REPLY_PARTITION];

      expect(KafkaHeadersHelper.toAsyncContext(headers)).toEqual({
        traceId: mockTraceId,
        spanId: mockSpanId,
        initialSpanId: ts.spanId,
        parentSpanId: ts.spanId,
        correlationId: ts.correlationId,
        requestId: ts.requestId,
        replyTopic: ts.replyTopic,
      });

      mockTraceId = undefined;
      mockSpanId = undefined;

      expect(KafkaHeadersHelper.toAsyncContext(headers)).toEqual({
        traceId: randTraceId,
        spanId: randSpanId,
        initialSpanId: ts.spanId,
        parentSpanId: ts.spanId,
        correlationId: ts.correlationId,
        requestId: ts.requestId,
        replyTopic: ts.replyTopic,
      });
    });
  });
});
