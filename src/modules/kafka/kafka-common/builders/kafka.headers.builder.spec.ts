import { merge } from 'ts-deepmerge';
import { faker } from '@faker-js/faker';
import { IHeaders } from 'src/modules/common';
import { ITraceSpan, TraceSpanBuilder, TraceSpanHelper } from 'src/modules/elk-logger';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { kafkaHeadersFactory } from 'tests/modules/kafka';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { IKafkaHeadersBuilder } from '../types/types';
import { IKafkaAsyncContext } from '../types/kafka.async-context.type';
import { KafkaAsyncContextHeaderNames } from '../types/constants';
import { KafkaHeadersBuilder } from './kafka.headers.builder';

describe(KafkaHeadersBuilder.name, () => {
  let traceSpan: ITraceSpan;
  let asyncContext: IKafkaAsyncContext & {
    traceId: string;
    spanId: string;
    correlationId: string;
    requestId: string;
    replyTopic: string;
    replyPartition: number;
  };
  let headers: IHeaders;
  let builder: IKafkaHeadersBuilder;

  beforeEach(async () => {
    builder = new KafkaHeadersBuilder();

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
    ) as IKafkaAsyncContext;

    builtContext.replyTopic = faker.string.alpha(4);
    builtContext.replyPartition = faker.number.int(2);

    if (
      builtContext.traceId === undefined ||
      builtContext.spanId === undefined ||
      builtContext.correlationId === undefined ||
      builtContext.requestId === undefined
    ) {
      throw new Error('asyncContext is not fully populated by factory');
    }

    asyncContext = builtContext as typeof asyncContext;

    headers = kafkaHeadersFactory.build(
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

  it('useZipkin', async () => {
    const result = builder.build({ asyncContext }, { useZipkin: true });

    expect(result).toEqual({
      ...headers,
      programsIds: undefined,
      [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: undefined,
      [HttpGeneralAsyncContextHeaderNames.SPAN_ID]: undefined,
      [HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID]: TraceSpanHelper.formatToZipkin(traceSpan.traceId),
      [HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID]: TraceSpanHelper.formatToZipkin(traceSpan.spanId),
      [KafkaAsyncContextHeaderNames.REPLY_TOPIC]: asyncContext.replyTopic,
      [KafkaAsyncContextHeaderNames.REPLY_PARTITION]: asyncContext.replyPartition.toString(),
    });
  });

  it('asArray', async () => {
    const result = builder.build({ asyncContext }, { asArray: true });

    expect(result).toEqual({
      [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: asyncContext.traceId.split('-'),
      [HttpGeneralAsyncContextHeaderNames.SPAN_ID]: asyncContext.spanId.split('-'),
      [HttpGeneralAsyncContextHeaderNames.CORRELATION_ID]: asyncContext.correlationId.split('-'),
      [HttpGeneralAsyncContextHeaderNames.REQUEST_ID]: asyncContext.requestId.split('-'),
      [KafkaAsyncContextHeaderNames.REPLY_TOPIC]: [asyncContext.replyTopic],
      [KafkaAsyncContextHeaderNames.REPLY_PARTITION]: [asyncContext.replyPartition.toString()],
    });
  });

  it('with headers', async () => {
    const traceId = faker.string.uuid();
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
        [KafkaAsyncContextHeaderNames.REPLY_TOPIC]: faker.string.alpha(5),
        [KafkaAsyncContextHeaderNames.REPLY_PARTITION]: faker.number.int(4).toString(),
        programsIds: ['1', '30'],
      },
    });

    expect(result).toEqual({
      [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: traceId,
      [HttpGeneralAsyncContextHeaderNames.SPAN_ID]: asyncContext.spanId,
      [HttpGeneralAsyncContextHeaderNames.CORRELATION_ID]: asyncContext.correlationId,
      [HttpGeneralAsyncContextHeaderNames.REQUEST_ID]: asyncContext.requestId,
      [KafkaAsyncContextHeaderNames.REPLY_TOPIC]: asyncContext.replyTopic,
      [KafkaAsyncContextHeaderNames.REPLY_PARTITION]: asyncContext.replyPartition.toString(),
      programsIds: ['1', '30'],
    });

    const copyHeaders = merge({}, headers);

    result = builder.build({
      asyncContext: {},
      headers: copyHeaders,
    });

    expect(copyHeaders).toEqual(headers);
    expect(result).toEqual(headers);

    result = builder.build(
      {
        asyncContext,
        headers: copyHeaders,
      },
      { useZipkin: true },
    );

    expect(copyHeaders).toEqual(headers);

    expect(result).toEqual({
      [HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID]: TraceSpanHelper.formatToZipkin(asyncContext.traceId),
      [HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID]: TraceSpanHelper.formatToZipkin(asyncContext.spanId),
      [HttpGeneralAsyncContextHeaderNames.CORRELATION_ID]: headers[HttpGeneralAsyncContextHeaderNames.CORRELATION_ID],
      [HttpGeneralAsyncContextHeaderNames.REQUEST_ID]: headers[HttpGeneralAsyncContextHeaderNames.REQUEST_ID],
      [KafkaAsyncContextHeaderNames.REPLY_TOPIC]: asyncContext.replyTopic,
      [KafkaAsyncContextHeaderNames.REPLY_PARTITION]: asyncContext.replyPartition.toString(),
      programsIds: ['1', '30'],
    });
  });

  it('with headers and useZipkin', async () => {
    const traceId = faker.string.uuid();
    const result = builder.build(
      {
        asyncContext: {
          ...asyncContext,
          traceId,
          spanId: undefined,
        },
        headers: {
          [HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID]: TraceSpanHelper.formatToZipkin(asyncContext.traceId),
          [HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID]: TraceSpanHelper.formatToZipkin(asyncContext.spanId),
          [HttpGeneralAsyncContextHeaderNames.REQUEST_ID]: faker.string.uuid(),
          [KafkaAsyncContextHeaderNames.REPLY_TOPIC]: faker.string.alpha(5),
          [KafkaAsyncContextHeaderNames.REPLY_PARTITION]: faker.number.int(4).toString(),
        },
      },
      { useZipkin: true },
    );

    expect(result).toEqual({
      [HttpGeneralAsyncContextHeaderNames.ZIPKIN_TRACE_ID]: TraceSpanHelper.formatToZipkin(traceId),
      [HttpGeneralAsyncContextHeaderNames.ZIPKIN_SPAN_ID]: TraceSpanHelper.formatToZipkin(asyncContext.spanId),
      [HttpGeneralAsyncContextHeaderNames.CORRELATION_ID]: asyncContext.correlationId,
      [HttpGeneralAsyncContextHeaderNames.REQUEST_ID]: asyncContext.requestId,
      [KafkaAsyncContextHeaderNames.REPLY_TOPIC]: asyncContext.replyTopic,
      [KafkaAsyncContextHeaderNames.REPLY_PARTITION]: asyncContext.replyPartition.toString(),
    });
  });
});
