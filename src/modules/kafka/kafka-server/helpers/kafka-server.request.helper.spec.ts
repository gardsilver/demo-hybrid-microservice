import { faker } from '@faker-js/faker';
import { merge } from 'ts-deepmerge';
import { Consumer, KafkaMessage } from '@nestjs/microservices/external/kafka.interface';
import { IHeaders } from 'src/modules/common';
import { KafkaHeadersHelper } from 'src/modules/kafka/kafka-common';
import { kafkaMessageFactory } from 'tests/modules/kafka';
import { KafkaServerRequestHelper } from './kafka-server.request.helper';
import { KafkaContext } from '../ctx-host/kafka.context';
import { ConsumerMode, IKafkaMessageOptions } from '../types/types';
import { METADATA_ASYNC_CONTEXT_KEY } from '../types/constants';

describe(KafkaServerRequestHelper.name, () => {
  let consumer: Consumer;
  let kafkaMessage: KafkaMessage;
  let context: KafkaContext;

  beforeEach(async () => {
    consumer = {} as undefined as Consumer;
    kafkaMessage = kafkaMessageFactory.build(undefined, {
      transient: {
        headers: {
          traceId: undefined,
          spanId: undefined,
          requestId: undefined,
          correlationId: undefined,
          replyTopic: undefined,
          replyPartition: undefined,
        },
      },
    });

    context = new KafkaContext([
      kafkaMessage,
      faker.number.int(),
      faker.string.alpha(10),
      consumer,
      jest.fn(),
      ConsumerMode.EACH_MESSAGE,
      {
        serverName: faker.string.alpha(10),
      } as undefined as IKafkaMessageOptions,
    ]);

    jest.clearAllMocks();
  });

  it('AsyncContext', async () => {
    const asyncContext = KafkaHeadersHelper.toAsyncContext(kafkaMessage.headers as undefined as IHeaders);
    const copyAsyncContext = merge(asyncContext);

    KafkaServerRequestHelper.setAsyncContext(asyncContext, context);

    expect(copyAsyncContext).toEqual(asyncContext);
    expect(METADATA_ASYNC_CONTEXT_KEY in context).toBeTruthy();
    expect(context[METADATA_ASYNC_CONTEXT_KEY]).toEqual(copyAsyncContext);

    const result = KafkaServerRequestHelper.getAsyncContext(context);

    expect(copyAsyncContext).toEqual(asyncContext);
    expect(result).toEqual(copyAsyncContext);
  });
});
