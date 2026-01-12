import { faker } from '@faker-js/faker';
import { MessagePropertyHeaders } from 'amqplib';
import { IGeneralAsyncContext } from 'src/modules/common';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { HttHeadersHelper, HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { messagePropertiesFactory, messagePropertyHeadersFactory } from 'tests/amqplib';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { IRabbitMqMessageProperties, IRabbitMqPublishOptionsBuilderOptions } from '../types/types';
import { IRabbitMqAsyncContext } from '../types/rabbit-mq.async-context.type';
import { RabbitMqMessageHelper } from './rabbit-mq.message.helper';

const headersFactory = (
  traceSpan: IRabbitMqAsyncContext,
  transientParams?: Partial<IGeneralAsyncContext & IRabbitMqPublishOptionsBuilderOptions>,
) => {
  return messagePropertyHeadersFactory.build(
    {
      ...httpHeadersFactory.build(
        {},
        {
          transient: {
            ...transientParams,
            ...traceSpan,
          },
        },
      ),
      'Is-Called': faker.number.int(2) > 1,
      programsIds: [faker.number.int(2).toString(), faker.number.int(2)],
      'empty-array': [],
      'empty-string': '',
      'undefined-header': undefined,
    },
    {
      transient: {
        firstDeathExchange: true,
        firstDeathQueue: true,
        firstDeathReason: true,
        death: true,
      },
    },
  );
};

describe(RabbitMqMessageHelper.name, () => {
  let mockId: string;
  let traceSpan: IRabbitMqAsyncContext;
  let correlationId: string;
  let headers: MessagePropertyHeaders;

  beforeEach(async () => {
    mockId = TraceSpanHelper.generateRandomValue();
    jest.spyOn(TraceSpanHelper, 'generateRandomValue').mockImplementation(() => mockId);
    correlationId = faker.string.uuid();

    traceSpan = {
      traceId: faker.string.uuid(),
      spanId: faker.string.uuid(),
      requestId: faker.string.uuid(),
      correlationId: faker.string.uuid(),
    };

    headers = headersFactory(traceSpan);

    jest.clearAllMocks();
  });

  it('normalize', async () => {
    const normalize = RabbitMqMessageHelper.normalize(headers);

    expect(normalize).toEqual({
      ...headers,
      'empty-array': undefined,
      'Is-Called': undefined,
      programsIds: undefined,
      'is-called': headers['Is-Called'],
      programsids: headers['programsIds'],
    });
  });

  describe('nameAsHeaderName', () => {
    it('default', async () => {
      const headerNames = {};

      const spy = jest.spyOn(HttHeadersHelper, 'nameAsHeaderName');

      ['traceId', 'spanId', 'correlationId', 'requestId', 'customParam'].forEach((paramName) => {
        headerNames[paramName] = RabbitMqMessageHelper.nameAsHeaderName(paramName);

        if (paramName !== 'correlationId') {
          expect(spy).toHaveBeenCalledWith(paramName, undefined);
        }
      });

      expect(spy).toHaveBeenCalledTimes(4);

      expect(headerNames).toEqual({
        traceId: HttpGeneralAsyncContextHeaderNames.TRACE_ID,
        spanId: HttpGeneralAsyncContextHeaderNames.SPAN_ID,
        correlationId: undefined,
        requestId: HttpGeneralAsyncContextHeaderNames.REQUEST_ID,
      });
    });

    it('useZipkin', async () => {
      const headerNames = {};
      const spy = jest.spyOn(HttHeadersHelper, 'nameAsHeaderName');

      ['traceId', 'spanId', 'correlationId', 'requestId', 'customParam'].forEach((paramName) => {
        headerNames[paramName] = RabbitMqMessageHelper.nameAsHeaderName(paramName, true);

        if (paramName !== 'correlationId') {
          expect(spy).toHaveBeenCalledWith(paramName, true);
        }
      });

      expect(spy).toHaveBeenCalledTimes(4);

      expect(headerNames).toEqual({
        traceId: HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID,
        spanId: HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID,
        correlationId: undefined,
        requestId: HttpGeneralAsyncContextHeaderNames.REQUEST_ID,
      });
    });
  });

  describe('searchValue', () => {
    it('default', async () => {
      const testHeaders = {};
      expect(RabbitMqMessageHelper.searchValue(testHeaders, 'test-header')).toEqual({});

      testHeaders['test-header'] = undefined;
      expect(RabbitMqMessageHelper.searchValue(testHeaders, 'test-header')).toEqual({
        header: 'test-header',
        value: undefined,
      });

      testHeaders['test-header'] = [];
      expect(RabbitMqMessageHelper.searchValue(testHeaders, 'test-header')).toEqual({
        header: 'test-header',
        value: undefined,
      });

      testHeaders['test-header'] = {};
      expect(RabbitMqMessageHelper.searchValue(testHeaders, 'test-header')).toEqual({
        header: 'test-header',
        value: undefined,
      });

      testHeaders['test-header'] = {
        header: faker.string.alpha(6),
      };
      expect(RabbitMqMessageHelper.searchValue(testHeaders, 'test-header')).toEqual({
        header: 'test-header',
        value: testHeaders['test-header'],
      });

      const normalize = RabbitMqMessageHelper.normalize(headers);

      expect(RabbitMqMessageHelper.searchValue(normalize, HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID)).toEqual(
        {},
      );
      expect(
        RabbitMqMessageHelper.searchValue(
          normalize,
          HttpGeneralAsyncContextHeaderNames.TRACE_ID,
          HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID,
        ),
      ).toEqual({
        header: HttpGeneralAsyncContextHeaderNames.TRACE_ID,
        value: traceSpan.traceId,
      });
      expect(RabbitMqMessageHelper.searchValue(normalize, 'programsids')).toEqual({
        header: 'programsids',
        value: headers['programsIds'],
      });
      expect(RabbitMqMessageHelper.searchValue(normalize, 'empty')).toEqual({
        header: undefined,
        value: undefined,
      });
      expect(RabbitMqMessageHelper.searchValue(normalize, 'empty-array')).toEqual({
        header: undefined,
        value: undefined,
      });

      expect(RabbitMqMessageHelper.searchValue(normalize, 'empty-string')).toEqual({
        header: 'empty-string',
        value: '',
      });
    });

    it('useZipkin', async () => {
      headers[HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID] = TraceSpanHelper.formatToZipkin(traceSpan.traceId);

      delete headers[HttpGeneralAsyncContextHeaderNames.TRACE_ID];

      const normalize = RabbitMqMessageHelper.normalize(headers);

      expect(
        RabbitMqMessageHelper.searchValue(
          normalize,
          HttpGeneralAsyncContextHeaderNames.TRACE_ID,
          HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID,
        ),
      ).toEqual({
        header: HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID,
        value: traceSpan.traceId,
      });
    });
  });

  describe('toAsyncContext', () => {
    let messageProperties: IRabbitMqMessageProperties;

    beforeEach(async () => {
      messageProperties = messagePropertiesFactory.build(
        {},
        {
          transient: {
            properties: {
              headers,
              correlationId,
              replyTo: undefined,
              messageId: undefined,
            },
          },
        },
      );
    });

    it('default', async () => {
      expect(RabbitMqMessageHelper.toAsyncContext(messageProperties)).toEqual({
        traceId: traceSpan.traceId,
        spanId: mockId,
        initialSpanId: traceSpan.spanId,
        parentSpanId: traceSpan.spanId,
        requestId: traceSpan.requestId,
        correlationId,
        messageId: messageProperties.messageId,
        replyTo: messageProperties.replyTo,
      });

      messageProperties.headers[HttpGeneralAsyncContextHeaderNames.TRACE_ID] = {
        test: faker.string.alpha(4),
      };

      const context = RabbitMqMessageHelper.toAsyncContext(messageProperties);

      expect(context.traceId).toBe(mockId);
    });

    it('as zipkin', async () => {
      headers = headersFactory(traceSpan, { useZipkin: true });
      messageProperties.headers = headers;

      expect(RabbitMqMessageHelper.toAsyncContext(messageProperties)).toEqual({
        traceId: traceSpan.traceId,
        spanId: mockId,
        initialSpanId: traceSpan.spanId,
        parentSpanId: traceSpan.spanId,
        requestId: traceSpan.requestId,
        correlationId,
        messageId: messageProperties.messageId,
        replyTo: messageProperties.replyTo,
      });
    });

    it('form array format', async () => {
      headers = headersFactory(traceSpan, { asArray: true });
      messageProperties.headers = headers;

      expect(RabbitMqMessageHelper.toAsyncContext(messageProperties)).toEqual({
        traceId: traceSpan.traceId,
        spanId: mockId,
        initialSpanId: traceSpan.spanId,
        parentSpanId: traceSpan.spanId,
        requestId: traceSpan.requestId,
        correlationId: correlationId,
        messageId: messageProperties.messageId,
        replyTo: messageProperties.replyTo,
      });

      headers[HttpGeneralAsyncContextHeaderNames.TRACE_ID] = [];
      messageProperties.headers = headers;

      expect(RabbitMqMessageHelper.toAsyncContext(messageProperties)).toEqual({
        traceId: mockId,
        spanId: mockId,
        initialSpanId: traceSpan.spanId,
        parentSpanId: traceSpan.spanId,
        requestId: traceSpan.requestId,
        correlationId: correlationId,
        messageId: messageProperties.messageId,
        replyTo: messageProperties.replyTo,
      });
    });
  });
});
