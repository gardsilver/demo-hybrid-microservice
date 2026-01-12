import { faker } from '@faker-js/faker';
import { KafkaMessage } from '@nestjs/microservices/external/kafka.interface';
import { MainResponse } from 'protos/compiled/demo/service/MainService';
import { IKafkaAsyncContext, KafkaHeadersHelper } from 'src/modules/kafka/kafka-common';
import { ConsumerMode, IKafkaMessageOptions } from 'src/modules/kafka/kafka-server';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { kafkaHeadersFactory } from 'tests/modules/kafka';
import { DemoResponseDeserializer } from './demo.response.deserializer';

describe(DemoResponseDeserializer.name, () => {
  let asyncContext: IKafkaAsyncContext;
  let context: MainResponse;
  let key: string;
  let request: KafkaMessage;
  let options: IKafkaMessageOptions;
  let deserializer: DemoResponseDeserializer;

  beforeEach(async () => {
    deserializer = new DemoResponseDeserializer();

    asyncContext = generalAsyncContextFactory.build(
      {},
      {
        transient: {
          traceId: undefined,
          spanId: undefined,
          initialSpanId: undefined,
          parentSpanId: undefined,
          requestId: undefined,
          correlationId: undefined,
        },
      },
    );
    asyncContext.replyTopic = faker.string.alpha(4);
    asyncContext.replyPartition = faker.number.int(2);
    key = faker.string.alpha(8);

    context = {
      data: {
        status: faker.string.alpha(8),
        message: faker.string.alpha(8),
      },
    };
    request = {
      key: Buffer.from(key),
      value: Buffer.from(MainResponse.encode(context).finish()),
      headers: kafkaHeadersFactory.build(
        {
          programsIds: ['1', '30'],
        },
        {
          transient: {
            ...asyncContext,
          },
        },
      ),
    } as undefined as KafkaMessage;
    options = {
      serverName: faker.string.alpha(5),
      mode: faker.number.int(2) > 1 ? ConsumerMode.EACH_MESSAGE : ConsumerMode.EACH_BATCH,
      topic: faker.string.alpha(5),
      correlationId: faker.string.alpha(5),
      replyTopic: faker.string.alpha(5),
      replyPartition: faker.number.int(6),
    };
  });

  it('deserialize', async () => {
    let result = deserializer.deserialize(request, options);

    expect(result.pattern).toBe(options.topic);
    expect(result.data).toEqual({
      key,
      value: context,
      headers: KafkaHeadersHelper.normalize(request.headers ?? {}),
    });

    request.value = undefined;
    result = deserializer.deserialize(request, options);

    expect(result.pattern).toBe(options.topic);
    expect(result.data).toBeUndefined();
  });
});
