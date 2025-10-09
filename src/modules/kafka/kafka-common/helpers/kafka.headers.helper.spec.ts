import { faker } from '@faker-js/faker';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { kafkaHeadersFactory } from 'tests/modules/kafka';
import { KafkaHeadersHelper } from './kafka.headers.helper';
import { KafkaAsyncContextHeaderNames } from '../types/constants';

describe(KafkaHeadersHelper.name, () => {
  let mockId: string;

  beforeEach(async () => {
    mockId = TraceSpanHelper.generateRandomValue();
    jest.spyOn(TraceSpanHelper, 'generateRandomValue').mockImplementation(() => mockId);
  });

  describe('nameAsHeaderName', () => {
    it('default', async () => {
      const map = {};

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

    it('as zipkin', async () => {
      const map = {};

      ['traceId', 'spanId', 'correlationId', 'requestId', 'replyTopic', 'replyPartition', 'customParam'].forEach(
        (paramName) => {
          map[paramName] = KafkaHeadersHelper.nameAsHeaderName(paramName, true);
        },
      );

      expect(map).toEqual({
        traceId: HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID,
        spanId: HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID,
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
        traceId: faker.string.uuid(),
        spanId: faker.string.uuid(),
        requestId: faker.string.uuid(),
        correlationId: faker.string.uuid(),
        replyTopic: faker.string.uuid(),
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
        traceId: ts.traceId,
        spanId: mockId,
        initialSpanId: ts.spanId,
        parentSpanId: ts.spanId,
        correlationId: ts.correlationId,
        requestId: ts.requestId,
        replyTopic: ts.replyTopic,
        replyPartition: ts.replyPartition,
      });

      headers[KafkaAsyncContextHeaderNames.REPLY_PARTITION] = undefined;

      expect(KafkaHeadersHelper.toAsyncContext(headers)).toEqual({
        traceId: ts.traceId,
        spanId: mockId,
        initialSpanId: ts.spanId,
        parentSpanId: ts.spanId,
        correlationId: ts.correlationId,
        requestId: ts.requestId,
        replyTopic: ts.replyTopic,
      });
    });

    it('as zipkin', async () => {
      const ts = {
        traceId: faker.string.uuid(),
        spanId: faker.string.uuid(),
        requestId: faker.string.uuid(),
        correlationId: faker.string.uuid(),
        replyTopic: faker.string.uuid(),
        replyPartition: faker.number.int(),
      };

      const headers = kafkaHeadersFactory.build(
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

      expect(KafkaHeadersHelper.toAsyncContext(headers)).toEqual({
        traceId: ts.traceId,
        spanId: mockId,
        initialSpanId: ts.spanId,
        parentSpanId: ts.spanId,
        correlationId: ts.correlationId,
        requestId: ts.requestId,
        replyTopic: ts.replyTopic,
        replyPartition: ts.replyPartition,
      });
    });

    it('form array format', async () => {
      const ts = {
        traceId: faker.string.uuid(),
        spanId: faker.string.uuid(),
        requestId: faker.string.uuid(),
        correlationId: faker.string.uuid(),
        replyTopic: faker.string.uuid(),
        replyPartition: faker.number.int(),
      };

      const headers = kafkaHeadersFactory.build(
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

      expect(KafkaHeadersHelper.toAsyncContext(headers)).toEqual({
        traceId: ts.traceId,
        spanId: mockId,
        initialSpanId: ts.spanId,
        parentSpanId: ts.spanId,
        correlationId: ts.correlationId,
        requestId: ts.requestId,
        replyTopic: ts.replyTopic,
        replyPartition: ts.replyPartition,
      });

      headers[HttpGeneralAsyncContextHeaderNames.TRACE_ID] = [];

      expect(KafkaHeadersHelper.toAsyncContext(headers)).toEqual({
        traceId: mockId,
        spanId: mockId,
        initialSpanId: ts.spanId,
        parentSpanId: ts.spanId,
        correlationId: ts.correlationId,
        requestId: ts.requestId,
        replyTopic: ts.replyTopic,
        replyPartition: ts.replyPartition,
      });
    });
  });
});
