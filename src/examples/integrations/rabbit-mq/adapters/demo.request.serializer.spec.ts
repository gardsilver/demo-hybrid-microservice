import { faker } from '@faker-js/faker';
import { MainRequest } from 'protos/compiled/demo/service/MainService';
import { IRabbitMqProducerMessage } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { IProducerSerializerOptions } from 'src/modules/rabbit-mq/rabbit-mq-client';
import { messagePropertyHeadersFactory } from 'tests/amqplib';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { DemoRequestSerializer } from './demo.request.serializer';

describe(DemoRequestSerializer.name, () => {
  let content: MainRequest;
  let request: IRabbitMqProducerMessage<MainRequest>;
  let options: IProducerSerializerOptions;
  let serializer: DemoRequestSerializer;

  beforeEach(async () => {
    serializer = new DemoRequestSerializer();

    content = {
      query: faker.string.alpha(8),
    };

    options = {
      serverName: faker.string.alpha(10),
      pattern: faker.string.alpha(5),
    };

    request = {
      queue: faker.string.alpha(7),
      exchange: faker.string.alpha(6),
      routingKey: faker.string.alpha(5),
      content,
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
    const result = serializer.serialize(request, options);

    expect(result).toEqual({
      ...request,
      content: Buffer.from(MainRequest.encode(content).finish()),
    });
  });
});
