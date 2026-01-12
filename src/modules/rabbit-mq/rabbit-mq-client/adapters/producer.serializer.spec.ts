import { faker } from '@faker-js/faker';
import { IRabbitMqProducerMessage } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { messagePropertyHeadersFactory } from 'tests/amqplib';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { IProducerSerializerOptions } from '../types/types';
import { ProducerSerializer } from './producer.serializer';

describe(ProducerSerializer.name, () => {
  let value: IRabbitMqProducerMessage;
  let options: IProducerSerializerOptions;
  let serializer: ProducerSerializer;

  beforeEach(async () => {
    serializer = new ProducerSerializer();

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
    });

    value.content = Buffer.from(faker.string.alpha(15));
    result = serializer.serialize(value, options);
    expect(result).toEqual({
      ...result,
    });

    content = faker.string.alpha(15);
    value.content = content;
    result = serializer.serialize(value, options);
    expect(result).toEqual({
      ...result,
      content: Buffer.from(content),
    });

    content = faker.number.int(5);
    value.content = content;
    result = serializer.serialize(value, options);
    expect(result).toEqual({
      ...result,
      content: Buffer.from(content.toString()),
    });

    content = [faker.number.int(5)];
    value.content = content;
    result = serializer.serialize(value, options);
    expect(result).toEqual({
      ...result,
      content: Buffer.from(JSON.stringify(content)),
    });

    content = {
      fieldInt: faker.number.int(5),
      fieldStr: faker.string.alpha(6),
    };
    value.content = content;
    result = serializer.serialize(value, options);
    expect(result).toEqual({
      ...result,
      content: Buffer.from(JSON.stringify(content)),
    });
  });
});
