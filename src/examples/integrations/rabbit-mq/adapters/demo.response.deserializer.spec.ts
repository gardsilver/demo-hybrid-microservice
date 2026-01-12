import { ConsumeMessage, MessageProperties } from 'amqplib';
import { faker } from '@faker-js/faker';
import { MainResponse } from 'protos/compiled/demo/service/MainService';
import { RabbitMqMessageHelper } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { IRabbitMqEventOptions } from 'src/modules/rabbit-mq/rabbit-mq-server';
import { messagePropertyHeadersFactory } from 'tests/amqplib';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { DemoResponseDeserializer } from './demo.response.deserializer';

describe(DemoResponseDeserializer.name, () => {
  let content: MainResponse;
  let request: ConsumeMessage;
  let options: IRabbitMqEventOptions & { pattern: string };
  let deserializer: DemoResponseDeserializer;

  beforeEach(async () => {
    deserializer = new DemoResponseDeserializer();

    content = {
      data: {
        status: faker.string.alpha(8),
        message: faker.string.alpha(8),
      },
    };
    request = {
      content: Buffer.from(MainResponse.encode(content).finish()),
      properties: {
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
      } as undefined as MessageProperties,
    } as undefined as ConsumeMessage;
    options = {
      serverName: faker.string.alpha(5),
      pattern: faker.string.alpha(5),
    };
  });

  it('deserialize', async () => {
    let result = deserializer.deserialize(request, options);

    expect(result).toEqual({
      pattern: options.pattern,
      data: {
        ...request,
        content,
        properties: {
          ...request.properties,
          headers: RabbitMqMessageHelper.normalize(request.properties.headers),
        },
      },
    });

    result = deserializer.deserialize(request, undefined);

    expect(result).toEqual({
      pattern: undefined,
      data: undefined,
    });

    request.properties.headers = undefined;
    result = deserializer.deserialize(request, options);

    expect(result).toEqual({
      pattern: options.pattern,
      data: {
        ...request,
        content,
        properties: {
          ...request.properties,
          headers: {},
        },
      },
    });

    request.content = undefined;
    result = deserializer.deserialize(request, options);

    expect(result).toEqual({
      pattern: options.pattern,
      data: undefined,
    });
  });
});
