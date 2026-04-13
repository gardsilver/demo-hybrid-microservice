import { MessagePropertyHeaders, ConsumeMessage, CommonMessageFields } from 'amqplib';
import { faker } from '@faker-js/faker';
import { RabbitMqMessageHelper } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { IConsumerDeserializer, IRabbitMqEventOptions } from 'src/modules/rabbit-mq/rabbit-mq-server';
import { messageFieldsFactory, messagePropertiesFactory, messagePropertyHeadersFactory } from 'tests/amqplib';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { MockConsumerDeserializer } from './mock.consumer.deserializer';

describe(MockConsumerDeserializer.name, () => {
  let headers: MessagePropertyHeaders;
  let consumeMessage: ConsumeMessage;
  let options: IRabbitMqEventOptions & { pattern: string };
  let deserializer: IConsumerDeserializer;

  beforeEach(async () => {
    deserializer = new MockConsumerDeserializer();

    options = {
      serverName: faker.string.alpha(5),
      consumer: {
        queue: faker.string.alpha(5),
      },
      pattern: faker.string.alpha(5),
    };

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
    );

    consumeMessage = {
      content: Buffer.from('Hello World!'),
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
      ) as unknown as CommonMessageFields,
    } as unknown as ConsumeMessage;

    jest.clearAllMocks();
  });

  it('default', async () => {
    const spy = jest.spyOn(RabbitMqMessageHelper, 'normalize').mockImplementation(() => ({}));
    const result = await deserializer.deserialize(consumeMessage, options);

    expect(result.pattern).toEqual(options.pattern);
    expect(result.data?.properties.headers).toEqual({});
    expect(result.data?.content).toEqual('Hello World!');

    expect(spy).toHaveBeenCalledWith(consumeMessage.properties.headers);
  });

  it('skip', async () => {
    const spy = jest.spyOn(RabbitMqMessageHelper, 'normalize').mockImplementation(() => ({}));

    let result = await deserializer.deserialize(
      consumeMessage,
      undefined as unknown as IRabbitMqEventOptions & { pattern: string },
    );

    expect(result).toEqual({
      pattern: undefined,
      data: undefined,
    });

    result = await deserializer.deserialize(
      {
        ...consumeMessage,
        content: undefined as unknown as Buffer,
      },
      options,
    );

    expect(result).toEqual({
      pattern: options.pattern,
      data: undefined,
    });

    expect(spy).toHaveBeenCalledTimes(0);
  });
});
