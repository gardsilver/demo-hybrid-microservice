import { faker } from '@faker-js/faker';
import { MockAmqpConnectionManager } from 'tests/amqp-connection-manager';
import { RabbitMqServerBuilder } from './rabbit-mq.server.builder';

import { AMQP_CONNECTION_MANAGER_MOCK } from 'tests/amqp-connection-manager';

jest.mock('amqp-connection-manager', () => jest.requireActual('tests/amqp-connection-manager').AMQP_CONNECTION_MANAGER_MOCK);

describe(RabbitMqServerBuilder.name, () => {
  beforeEach(async () => {
    AMQP_CONNECTION_MANAGER_MOCK.connect.mockImplementation(() => new MockAmqpConnectionManager());
  });

  it('build', async () => {
    const server = RabbitMqServerBuilder.build({ urls: [faker.string.alpha(10)] });

    expect(server instanceof MockAmqpConnectionManager).toBeTruthy();
  });
});
