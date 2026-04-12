import { faker } from '@faker-js/faker';
import { IHeaders } from 'src/modules/common';
import { ITraceSpan, TraceSpanBuilder } from 'src/modules/elk-logger';
import { IKafkaAsyncContext, IKafkaHeadersBuilder, KafkaHeadersBuilder } from 'src/modules/kafka/kafka-common';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { kafkaHeadersFactory } from 'tests/modules/kafka';
import { KafkaHeadersRequestBuilder } from './kafka.headers-request.builder';

describe(KafkaHeadersRequestBuilder.name, () => {
  let traceSpan: ITraceSpan;
  let asyncContext: IKafkaAsyncContext;
  let headers: IHeaders;
  let builder: IKafkaHeadersBuilder;

  beforeEach(async () => {
    builder = new KafkaHeadersRequestBuilder();

    traceSpan = TraceSpanBuilder.build();

    asyncContext = generalAsyncContextFactory.build(
      {},
      {
        transient: {
          initialSpanId: undefined,
          requestId: undefined,
          correlationId: undefined,
          ...traceSpan,
        },
      },
    );

    asyncContext.replyTopic = faker.string.alpha(4);
    asyncContext.replyPartition = faker.number.int(2);

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

  it('build', async () => {
    const spy = jest.spyOn(KafkaHeadersBuilder.prototype, 'build');

    builder.build({ asyncContext, headers }, { useZipkin: true });

    expect(spy).toHaveBeenCalledWith({ asyncContext, headers }, { useZipkin: true });
  });
});
