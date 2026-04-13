import { Observable } from 'rxjs';
import { KafkaStatus } from '@nestjs/microservices';
import { Kafka, Admin } from '@nestjs/microservices/external/kafka.interface';
import { KafkaServerHealthIndicator } from './kafka-server.health-indicator';
import { KafkaServerService } from './kafka-server.service';

describe(KafkaServerHealthIndicator.name, () => {
  let kafkaClient: Kafka;
  let kafkaAdmin: Admin;
  let server: KafkaServerService;
  let indicator: KafkaServerHealthIndicator;

  beforeEach(async () => {
    kafkaAdmin = {
      fetchTopicMetadata: jest.fn(),
    } as unknown as Admin;

    kafkaClient = {
      admin: () => kafkaAdmin,
    } as unknown as Kafka;

    server = {
      status: new Observable((subscriber) => {
        subscriber.next(KafkaStatus.CONNECTED);
      }),
      getHandlers: () => {
        return new Map([['topic', true]]);
      },
      unwrap: () => [kafkaClient, null, null],
    } as unknown as KafkaServerService;
  });

  describe('use events', () => {
    it('as up', async () => {
      const spyAdmin = jest.spyOn(kafkaClient, 'admin');

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

      expect(spyAdmin).toHaveBeenCalledTimes(0);
    });

    it('as down', async () => {
      const spyAdmin = jest.spyOn(kafkaClient, 'admin');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (server as any).status = new Observable((subscriber) => {
        subscriber.next(KafkaStatus.CRASHED);
      });

      indicator = new KafkaServerHealthIndicator('serverName', server);

      expect(await indicator.isHealthy()).toEqual({
        serverName: {
          status: 'down',
          details: KafkaStatus.CRASHED,
          topics: ['topic'],
        },
      });
      expect(spyAdmin).toHaveBeenCalledTimes(0);
    });
  });

  describe('use Admin', () => {
    beforeEach(async () => {
      indicator = new KafkaServerHealthIndicator('serverName', server, {
        useAdmin: true,
        retry: {
          maxRetryTime: 1_000,
        },
      });

      jest.useFakeTimers();
      jest.clearAllMocks();
      jest.clearAllTimers();
    });

    afterEach(async () => {
      jest.useRealTimers();
    });

    it('as up', async () => {
      const spyAdmin = jest.spyOn(kafkaClient, 'admin');
      jest.advanceTimersByTimeAsync(1_000);

      expect(await indicator.isHealthy()).toEqual({
        serverName: {
          status: 'up',
          details: KafkaStatus.CONNECTED,
          topics: ['topic'],
        },
      });

      expect(spyAdmin).toHaveBeenCalledWith({
        retry: {
          maxRetryTime: 1_000,
        },
      });
    });

    it('as down: server not start', async () => {
      server.unwrap = () => {
        throw new Error();
      };
      const spyAdmin = jest.spyOn(kafkaClient, 'admin');

      expect(await indicator.isHealthy()).toEqual({
        serverName: {
          status: 'down',
          details: KafkaStatus.DISCONNECTED,
          topics: ['topic'],
        },
      });
      expect(spyAdmin).toHaveBeenCalledTimes(0);
    });

    it('as down: server crashed', async () => {
      indicator = new KafkaServerHealthIndicator('serverName', server, { useAdmin: true });
      kafkaAdmin.fetchTopicMetadata = () => {
        throw new Error('Test Error');
      };
      const spyAdmin = jest.spyOn(kafkaClient, 'admin');

      expect(await indicator.isHealthy()).toEqual({
        serverName: {
          status: 'down',
          details: 'Error: Test Error',
          topics: ['topic'],
        },
      });
      expect(spyAdmin).toHaveBeenCalledWith(undefined);
    });
  });
});
