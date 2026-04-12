import { faker } from '@faker-js/faker';
import { KafkaMessage } from 'kafkajs';
import { Consumer } from '@nestjs/microservices/external/kafka.interface';
import { kafkaMessageFactory } from 'tests/modules/kafka';
import { ConsumerMode, IKafkaMessageOptions } from '../types/types';
import { KafkaContext } from './kafka.context';

describe(KafkaContext.name, () => {
  let spy;
  let serverName: string;
  let topic: string;
  let partition: number;
  let consumer: Consumer;
  let kafkaMessage: KafkaMessage;
  let context: KafkaContext;

  beforeEach(async () => {
    spy = jest.fn();
    topic = faker.string.alpha(10);
    serverName = faker.string.alpha(10);
    partition = faker.number.int();

    consumer = {} as unknown as Consumer;
    kafkaMessage = kafkaMessageFactory.build(undefined, {
      transient: {
        key: 'test key',
        value: 'test value',
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
      partition,
      topic,
      consumer,
      async () => {
        spy();
      },
      ConsumerMode.EACH_MESSAGE,
      {
        serverName,
      } as unknown as IKafkaMessageOptions,
    ]);

    jest.clearAllMocks();
  });

  it('default', async () => {
    expect({
      message: context.getMessage(),
      partition: context.getPartition(),
      topic: context.getTopic(),
      consumer: context.getConsumer(),
      mode: context.getMode(),
      options: context.getMessageOptions(),
    }).toEqual({
      message: kafkaMessage,
      partition,
      topic,
      consumer,
      mode: ConsumerMode.EACH_MESSAGE,
      options: {
        serverName,
      },
    });

    const heartbeat = context.getHeartbeat();

    expect(typeof heartbeat).toBe('function');

    await heartbeat();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
