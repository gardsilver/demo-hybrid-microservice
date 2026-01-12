import { faker } from '@faker-js/faker';
import { MainRequest } from 'protos/compiled/demo/service/MainService';
import { IKafkaAsyncContext } from 'src/modules/kafka/kafka-common';
import { IProducerPacket, IProducerSerializerOptions, ProducerMode } from 'src/modules/kafka/kafka-client';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { kafkaHeadersFactory } from 'tests/modules/kafka';
import { DemoRequestSerializer } from './demo.request.serializer';

describe(DemoRequestSerializer.name, () => {
  let asyncContext: IKafkaAsyncContext;
  let context: MainRequest;
  let request: IProducerPacket<MainRequest>;
  let options: IProducerSerializerOptions;
  let serializer: DemoRequestSerializer;

  beforeEach(async () => {
    serializer = new DemoRequestSerializer();

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

    context = {
      query: faker.string.alpha(8),
    };
    request = {
      topic: faker.string.alpha(8),
      data: {
        key: faker.string.alpha(8),
        value: context,
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
      },
    };
    options = {
      serverName: faker.string.alpha(5),
      mode: faker.number.int(2) > 1 ? ProducerMode.SEND : ProducerMode.SEND_BATCH,
    };
  });

  it('serialize', async () => {
    let result = serializer.serialize(request, options);

    expect(result.key).toBe(request.data.key);
    expect(result.value).toEqual(Buffer.from(MainRequest.encode(context).finish()));
    expect(result.headers).toEqual(request.data.headers);

    request.data.key = undefined;
    request.data.headers = undefined;

    result = serializer.serialize(request, options);

    expect(result.key).toBeNull();
    expect(result.value).toEqual(Buffer.from(MainRequest.encode(context).finish()));
    expect(result.headers).toBeUndefined();
  });
});
