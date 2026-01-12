import { faker } from '@faker-js/faker';
import { MockAmqpConnectionManager } from 'tests/amqp-connection-manager';
import { RabbitMqServerBuilder } from './rabbit-mq.server.builder';

let mockConnect;

jest.mock('amqp-connection-manager', () => {
  const actual = jest.requireActual('amqp-connection-manager');
  const mock = Object.assign({}, actual);

  mock.connect = jest.fn(() => mockConnect?.());

  return mock;
});

describe(RabbitMqServerBuilder.name, () => {
  beforeEach(async () => {
    mockConnect = () => new MockAmqpConnectionManager();
  });

  it('build', async () => {
    const server = RabbitMqServerBuilder.build({ urls: [faker.string.alpha(10)] });

    expect(server instanceof MockAmqpConnectionManager).toBeTruthy();
  });
});
