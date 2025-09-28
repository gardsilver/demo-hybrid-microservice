import { Observable } from 'rxjs';
import { KafkaStatus, Server } from '@nestjs/microservices';
import { KafkaServerHealthIndicator } from './kafka-server.health-indicator';

describe(KafkaServerHealthIndicator.name, () => {
  let server: Server;
  let indicator: KafkaServerHealthIndicator;

  it('as up', async () => {
    server = {
      status: new Observable((subscriber) => {
        subscriber.next(KafkaStatus.CONNECTED);
      }),
      getHandlers: () => {
        return new Map([['topic', true]]);
      },
    } as undefined as Server;

    indicator = new KafkaServerHealthIndicator('serverName', server);

    expect(indicator).toBeDefined();
    expect(indicator['topics']).toBeUndefined();

    const spy = jest.spyOn(server, 'getHandlers');

    expect(await indicator.isHealthy()).toEqual({
      serverName: {
        status: 'up',
        details: KafkaStatus.CONNECTED,
        topics: ['topic'],
      },
    });
    expect(indicator['topics']).toEqual(['topic']);

    await indicator.isHealthy();

    expect(spy).toHaveBeenCalledTimes(1);

    indicator['topics'] = undefined;
    jest.spyOn(server, 'getHandlers').mockImplementation(() => new Map());

    expect(await indicator.isHealthy()).toEqual({
      serverName: {
        status: 'up',
        details: KafkaStatus.CONNECTED,
        topics: [],
      },
    });
  });

  it('as down', async () => {
    server = {
      status: new Observable((subscriber) => {
        subscriber.next(KafkaStatus.CRASHED);
      }),
      getHandlers: () => {
        return new Map([['topic', true]]);
      },
    } as undefined as Server;

    indicator = new KafkaServerHealthIndicator('serverName', server);

    expect(await indicator.isHealthy()).toEqual({
      serverName: {
        status: 'down',
        details: KafkaStatus.CRASHED,
        topics: ['topic'],
      },
    });
  });
});
