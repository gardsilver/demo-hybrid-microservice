import { faker } from '@faker-js/faker';
import { IRabbitMqProducerMessage } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { IProducerSerializerOptions } from 'src/modules/rabbit-mq/rabbit-mq-client';
import { messagePropertyHeadersFactory } from 'tests/amqplib';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { MockProducerSerializer } from './mock.producer.serializer';

describe(MockProducerSerializer.name, () => {
  let value: IRabbitMqProducerMessage;
  let options: IProducerSerializerOptions;
  let serializer: MockProducerSerializer;

  beforeEach(async () => {
    serializer = new MockProducerSerializer();

    options = {
      serverName: faker.string.alpha(10),
      pattern: faker.string.alpha(5),
    };

    value = {
      queue: faker.string.alpha(7),
      exchange: faker.string.alpha(6),
      routingKey: faker.string.alpha(5),
      publishOptions: {
        persistent: faker.number.int(2) > 1,
        correlationId: faker.string.uuid(),
        replyTo: faker.string.alpha(7),
        messageId: faker.string.uuid(),
        headers: {
          ...messagePropertyHeadersFactory.build(
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
          ),
        },
      },
    };
  });

  it('serialize', async () => {
    let result;
    let content;

    value.content = null;
    result = serializer.serialize(value, options);
    expect(result).toEqual({
      ...result,
      content: undefined,
    });

    content = faker.string.alpha(15);
    value.content = Buffer.from(content);
    result = serializer.serialize(value, options);
    expect(result).toEqual({
      ...result,
      content,
    });

    value.content = content;
    result = serializer.serialize(value, options);
    expect(result).toEqual({
      ...result,
    });

    content = faker.number.int(5);
    value.content = content;
    result = serializer.serialize(value, options);
    expect(result).toEqual({
      ...result,
      content: content.toString(),
    });

    content = [faker.number.int(5)];
    value.content = content;
    result = serializer.serialize(value, options);
    expect(result).toEqual({
      ...result,
      content: content.toString(),
    });

    content = {
      fieldInt: faker.number.int(5),
      fieldStr: faker.string.alpha(6),
    };
    value.content = content;
    result = serializer.serialize(value, options);
    expect(result).toEqual({
      ...result,
      content: content.toString(),
    });
  });
});
