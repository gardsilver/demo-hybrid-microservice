/* eslint-disable @typescript-eslint/unbound-method */
import { faker } from '@faker-js/faker';
import { MessagePropertyHeaders } from 'amqplib';
import { IGeneralAsyncContext } from 'src/modules/common/context';
import { HttHeadersHelper, HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { CRYPTO_MOCK } from 'tests/crypto';
import { messagePropertiesFactory, messagePropertyHeadersFactory } from 'tests/amqplib';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { IRabbitMqHeaders, IRabbitMqMessageProperties, IRabbitMqPublishOptionsBuilderOptions } from '../types/types';
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
  let traceSpan: IRabbitMqAsyncContext & { traceId: string; spanId: string; requestId: string; correlationId: string };
  let correlationId: string;
  let headers: MessagePropertyHeaders;

  beforeEach(async () => {
    correlationId = faker.string.uuid();

    traceSpan = {
      traceId: CRYPTO_MOCK.randomBytes(16).toString('hex'),
      spanId: CRYPTO_MOCK.randomBytes(8).toString('hex'),
      requestId: CRYPTO_MOCK.randomUUID(),
      correlationId: CRYPTO_MOCK.randomUUID(),
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
      const headerNames: Record<string, string | undefined> = {};

      const spy = jest.spyOn(HttHeadersHelper, 'nameAsHeaderName');

      ['traceId', 'spanId', 'correlationId', 'requestId', 'customParam'].forEach((paramName) => {
        headerNames[paramName] = RabbitMqMessageHelper.nameAsHeaderName(paramName);

        if (paramName !== 'correlationId') {
          expect(spy).toHaveBeenCalledWith(paramName);
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
  });

  describe('searchValue', () => {
    it('default', async () => {
      const testHeaders: IRabbitMqHeaders = {};
      expect(RabbitMqMessageHelper.searchValue(testHeaders, 'test-header')).toEqual({});

      testHeaders['test-header'] = undefined as unknown as IRabbitMqHeaders[string];
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

      expect(RabbitMqMessageHelper.searchValue(normalize, 'x-other')).toEqual({});
      expect(
        RabbitMqMessageHelper.searchValue(normalize, HttpGeneralAsyncContextHeaderNames.TRACE_ID, 'x-other'),
      ).toEqual({
        header: HttpGeneralAsyncContextHeaderNames.TRACE_ID,
        value: traceSpan.traceId,
      });

      const normalizeWithOther = RabbitMqMessageHelper.normalize({
        ...headers,
        [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: undefined,
        'x-other': normalize[HttpGeneralAsyncContextHeaderNames.TRACE_ID],
      });

      expect(
        RabbitMqMessageHelper.searchValue(normalizeWithOther, HttpGeneralAsyncContextHeaderNames.TRACE_ID, 'x-other'),
      ).toEqual({
        header: 'x-other',
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
  });

  describe('toAsyncContext', () => {
    let messageProperties: IRabbitMqMessageProperties;
    let mockBaseContext: IRabbitMqAsyncContext & {
      traceId: string;
      spanId: string;
      requestId: string;
      correlationId: string;
    };

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
      ) as unknown as IRabbitMqMessageProperties;

      messageProperties.headers = RabbitMqMessageHelper.normalize(messageProperties.headers);

      mockBaseContext = {
        traceId: CRYPTO_MOCK.randomBytes(16).toString('hex'),
        spanId: CRYPTO_MOCK.randomBytes(8).toString('hex'),
        requestId: CRYPTO_MOCK.randomUUID(),
        correlationId: CRYPTO_MOCK.randomUUID(),
      };

      jest.clearAllMocks();
    });

    it('должен корректно преобразовывать свойства amqplib сообщения в IRabbitMqAsyncContext', () => {
      const spy = jest.spyOn(HttHeadersHelper, 'toAsyncContext').mockReturnValue(mockBaseContext);

      const result = RabbitMqMessageHelper.toAsyncContext(messageProperties);

      expect(spy).toHaveBeenCalledWith({
        [HttpGeneralAsyncContextHeaderNames.TRACE_ID]:
          messageProperties.headers[HttpGeneralAsyncContextHeaderNames.TRACE_ID],
        [HttpGeneralAsyncContextHeaderNames.SPAN_ID]:
          messageProperties.headers[HttpGeneralAsyncContextHeaderNames.SPAN_ID],
        [HttpGeneralAsyncContextHeaderNames.CORRELATION_ID]:
          messageProperties.headers[HttpGeneralAsyncContextHeaderNames.CORRELATION_ID],
        [HttpGeneralAsyncContextHeaderNames.REQUEST_ID]:
          messageProperties.headers[HttpGeneralAsyncContextHeaderNames.REQUEST_ID],
      });

      expect(result).toEqual({
        traceId: mockBaseContext.traceId,
        spanId: mockBaseContext.spanId,
        requestId: mockBaseContext.requestId,
        correlationId,
        messageId: messageProperties.messageId,
        replyTo: messageProperties.replyTo,
      });
    });

    it('должен брать correlationId из базового HTTP-контекста, если в свойствах amqplib он равен undefined', () => {
      jest.spyOn(HttHeadersHelper, 'toAsyncContext').mockReturnValue(mockBaseContext);

      messageProperties.correlationId = undefined;
      messageProperties.replyTo = undefined;
      messageProperties.headers = {
        [HttpGeneralAsyncContextHeaderNames.TRACE_ID]:
          messageProperties.headers[HttpGeneralAsyncContextHeaderNames.TRACE_ID],
      };

      const result = RabbitMqMessageHelper.toAsyncContext(messageProperties);

      expect(result.correlationId).toBe(mockBaseContext.correlationId);
      expect(result.messageId).toBe(messageProperties.messageId);
      expect(result.replyTo).toBeUndefined();
    });

    it('должен корректно обрабатывать пустые, неопределенные заголовки без падения рантайма', () => {
      jest.spyOn(HttHeadersHelper, 'toAsyncContext').mockReturnValue({
        traceId: mockBaseContext.traceId,
        spanId: mockBaseContext.spanId,
      });

      messageProperties.headers = undefined as unknown as IRabbitMqHeaders;
      messageProperties.messageId = undefined;
      messageProperties.replyTo = undefined;

      const result = RabbitMqMessageHelper.toAsyncContext(messageProperties);

      expect(HttHeadersHelper.toAsyncContext).toHaveBeenCalledWith({});
      expect(result.traceId).toBe(mockBaseContext.traceId);
      expect(result.correlationId).toBe(correlationId);
    });

    it('должен корректно обрабатывать массивы в заголовках трассировки (склеивать через дефис)', () => {
      const spy = (HttHeadersHelper.toAsyncContext as jest.Mock).mockReturnValue(mockBaseContext);

      messageProperties.headers[HttpGeneralAsyncContextHeaderNames.REQUEST_ID] = ['partA', 'partB'];

      const result = RabbitMqMessageHelper.toAsyncContext(messageProperties);

      expect(spy).toHaveBeenCalledWith({
        [HttpGeneralAsyncContextHeaderNames.TRACE_ID]:
          messageProperties.headers[HttpGeneralAsyncContextHeaderNames.TRACE_ID],
        [HttpGeneralAsyncContextHeaderNames.SPAN_ID]:
          messageProperties.headers[HttpGeneralAsyncContextHeaderNames.SPAN_ID],
        [HttpGeneralAsyncContextHeaderNames.CORRELATION_ID]:
          messageProperties.headers[HttpGeneralAsyncContextHeaderNames.CORRELATION_ID],
        [HttpGeneralAsyncContextHeaderNames.REQUEST_ID]: 'partA-partB',
      });

      expect(result.requestId).toBe(mockBaseContext.requestId);
    });
  });
});
