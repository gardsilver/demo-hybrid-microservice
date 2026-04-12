import { Observable } from 'rxjs';
import { RmqStatus } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { RabbitMqServer } from './rabbit-mq-server';
import { RabbitMqHealthIndicator } from './rabbit-mq.health-indicator';

describe(RabbitMqHealthIndicator.name, () => {
  let server: RabbitMqServer;
  let indicator: RabbitMqHealthIndicator;

  beforeEach(async () => {
    server = {
      status: new Observable((subscriber) => {
        subscriber.next(RmqStatus.CONNECTED);
      }),
      getConsumersInfo: () => {
        return new Map([
          [
            'pattern',
            {
              queue: 'queue',
              exchange: 'exchange',
              routing: ['routing'],
            },
          ],
        ]);
      },
    } as unknown as RabbitMqServer;
  });

  it('as up', async () => {
    indicator = new RabbitMqHealthIndicator('serverName', server);

    expect(indicator).toBeDefined();
    expect(await indicator.isHealthy()).toEqual({
      serverName: {
        status: 'up',
        details: RmqStatus.CONNECTED,
        consumers: {
          pattern: {
            queue: 'queue',
            exchange: 'exchange',
            routing: ['routing'],
          },
        },
      },
    });
  });

  it('as down', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (server as any).status = new Observable((subscriber) => {
      subscriber.next(RmqStatus.DISCONNECTED);
    });

    indicator = new RabbitMqHealthIndicator('serverName', server);

    expect(indicator).toBeDefined();
    expect(await indicator.isHealthy()).toEqual({
      serverName: {
        status: 'down',
        details: RmqStatus.DISCONNECTED,
        consumers: {
          pattern: {
            queue: 'queue',
            exchange: 'exchange',
            routing: ['routing'],
          },
        },
      },
    });
  });
});
