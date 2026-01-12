import { faker } from '@faker-js/faker';
import { MessagePropertyHeaders } from 'amqplib';
import { messagePropertiesFactory, messagePropertyHeadersFactory } from 'tests/amqplib';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { IRabbitMqMessageProperties, IRabbitMqMessagePropertiesToAsyncContextAdapter } from '../types/types';
import { RabbitMqMessageHelper } from '../helpers/rabbit-mq.message.helper';
import { RabbitMqMessagePropertiesToAsyncContextAdapter } from './rabbit-mq.message-properties-to-async-context.adapter';

describe(RabbitMqMessagePropertiesToAsyncContextAdapter.name, () => {
  let headers: MessagePropertyHeaders;
  let messageProperties: IRabbitMqMessageProperties;
  let adapter: IRabbitMqMessagePropertiesToAsyncContextAdapter;

  beforeEach(async () => {
    adapter = new RabbitMqMessagePropertiesToAsyncContextAdapter();
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
    messageProperties = messagePropertiesFactory.build(
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
    );
  });

  it('adapt', async () => {
    const spy = jest.spyOn(RabbitMqMessageHelper, 'toAsyncContext');

    adapter.adapt(messageProperties);

    expect(spy).toHaveBeenCalledWith(messageProperties);
  });
});
