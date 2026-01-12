import { faker } from '@faker-js/faker';
import { TraceSpanBuilder, TraceSpanHelper } from 'src/modules/elk-logger';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { messagePropertyHeadersFactory } from 'tests/amqplib';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { IRabbitMqAsyncContext } from '../types/rabbit-mq.async-context.type';
import { IRabbitMqPublishOptions } from '../types/types';
import { RabbitMqPublishOptionsBuilder } from './rabbit-mq.publish-options.builder';

describe(RabbitMqPublishOptionsBuilder.name, () => {
  let asyncContext: IRabbitMqAsyncContext;
  let publishOptions: IRabbitMqPublishOptions;
  let builder: RabbitMqPublishOptionsBuilder;

  beforeEach(async () => {
    builder = new RabbitMqPublishOptionsBuilder();

    asyncContext = {
      ...TraceSpanBuilder.build(),
      correlationId: faker.string.uuid(),
      messageId: faker.string.uuid(),
      replyTo: faker.string.alpha(8),
    };

    publishOptions = {
      correlationId: faker.string.uuid(),
      messageId: faker.string.uuid(),
      replyTo: faker.string.alpha(8),
      persistent: faker.number.int(2) > 1,
      headers: messagePropertyHeadersFactory.build(
        {
          ...httpHeadersFactory.build(
            {},
            {
              transient: {
                traceId: undefined,
                spanId: undefined,
                requestId: undefined,
              },
            },
          ),
          'Is-Called': faker.number.int(2) > 1,
          programsIds: [faker.number.int(2).toString(), faker.number.int(2)],
          'empty-array': [],
          'empty-string': '',
        },
        {
          transient: {
            firstDeathExchange: true,
            firstDeathQueue: true,
            firstDeathReason: true,
            death: true,
          },
        },
      ),
    };
  });

  it('build default', async () => {
    expect(builder.build({ asyncContext, publishOptions })).toEqual({
      ...publishOptions,
      headers: {
        ...publishOptions.headers,
        [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: asyncContext.traceId,
        [HttpGeneralAsyncContextHeaderNames.SPAN_ID]: asyncContext.spanId,
      },
      correlationId: asyncContext.correlationId,
      messageId: asyncContext.messageId,
      replyTo: asyncContext.replyTo,
    });
  });

  it('build with zipkin', async () => {
    publishOptions.headers = {
      ...publishOptions.headers,
      [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: undefined,
      [HttpGeneralAsyncContextHeaderNames.SPAN_ID]: undefined,
      [HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID]: undefined,
      [HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID]: undefined,
      ...httpHeadersFactory.build(
        {},
        {
          transient: {
            traceId: undefined,
            spanId: undefined,
            requestId: undefined,
            seZipkin: true,
          },
        },
      ),
    };

    expect(builder.build({ asyncContext, publishOptions }, { useZipkin: true })).toEqual({
      ...publishOptions,
      headers: {
        ...publishOptions.headers,
        [HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID]: TraceSpanHelper.formatToZipkin(asyncContext.traceId),
        [HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID]: TraceSpanHelper.formatToZipkin(asyncContext.spanId),
        [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: undefined,
        [HttpGeneralAsyncContextHeaderNames.SPAN_ID]: undefined,
      },
      correlationId: asyncContext.correlationId,
      messageId: asyncContext.messageId,
      replyTo: asyncContext.replyTo,
    });
  });

  it('build as array', async () => {
    publishOptions.headers = {
      ...publishOptions.headers,
      [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: undefined,
      [HttpGeneralAsyncContextHeaderNames.SPAN_ID]: undefined,
      [HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID]: undefined,
      [HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID]: undefined,
      ...httpHeadersFactory.build(
        {},
        {
          transient: {
            traceId: undefined,
            spanId: undefined,
            requestId: undefined,
            asArray: true,
          },
        },
      ),
    };

    expect(builder.build({ asyncContext, publishOptions }, { asArray: true })).toEqual({
      ...publishOptions,
      headers: {
        ...publishOptions.headers,
        [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: asyncContext.traceId.split('-'),
        [HttpGeneralAsyncContextHeaderNames.SPAN_ID]: asyncContext.spanId.split('-'),
      },
      correlationId: asyncContext.correlationId,
      messageId: asyncContext.messageId,
      replyTo: asyncContext.replyTo,
    });
  });
});
