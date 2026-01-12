import { Channel } from 'amqp-connection-manager';
import { CommonMessageFields, ConsumeMessage, MessagePropertyHeaders } from 'amqplib';
import { faker } from '@faker-js/faker';
import { IRabbitMqConsumeMessage } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { MockChannel } from 'tests/amqp-connection-manager';
import { messageFieldsFactory, messagePropertiesFactory, messagePropertyHeadersFactory } from 'tests/amqplib';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { IConsumerPacket, IRabbitMqEventOptions } from '../types/types';
import { RabbitMqContext } from './rabbit-mq.context';

describe(RabbitMqContext.name, () => {
  let headers: MessagePropertyHeaders;
  let content: string;
  let consumeMessage: ConsumeMessage;
  let mockDeserializeMessage: IConsumerPacket<string>;
  let channel: Channel;
  let options: IRabbitMqEventOptions & { pattern: string };
  let rmqContext: RabbitMqContext;

  beforeEach(async () => {
    headers = messagePropertyHeadersFactory.build(
      {
        ...httpHeadersFactory.build(
          {},
          {
            transient: {
              traceId: undefined,
              spanId: undefined,
              requestId: undefined,
              correlationId: undefined,
            },
          },
        ),
        programsIds: [faker.number.int(2).toString(), faker.number.int(2)],
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
    content = faker.string.alpha(20);
    consumeMessage = {
      content: Buffer.from(content),
      properties: messagePropertiesFactory.build(
        {},
        {
          transient: {
            properties: {
              headers,
              correlationId: undefined,
              replyTo: undefined,
              messageId: undefined,
            },
          },
        },
      ),
      fields: messageFieldsFactory.build(
        {},
        { transient: { consumerTag: undefined } },
      ) as undefined as CommonMessageFields,
    } as undefined as ConsumeMessage;

    mockDeserializeMessage = {
      pattern: faker.string.alpha(20),
      data: {
        content,
      } as undefined as IRabbitMqConsumeMessage<string>,
    };

    channel = new MockChannel() as undefined as Channel;

    options = {
      serverName: faker.string.alpha(20),
      pattern: mockDeserializeMessage.pattern,
    };

    rmqContext = new RabbitMqContext<string>([consumeMessage, mockDeserializeMessage.data, channel, options]);
  });

  it('default', async () => {
    expect(rmqContext).toBeDefined();
    expect(rmqContext.getMessageRef()).toEqual(consumeMessage);
    expect(rmqContext.getMessage()).toEqual(mockDeserializeMessage.data);
    expect(rmqContext.getChannelRef()).toEqual(channel);
    expect(rmqContext.getMessageOptions()).toEqual(options);
  });
});
