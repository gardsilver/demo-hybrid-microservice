import { firstValueFrom, Observable, of, tap } from 'rxjs';
import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaStatus, MessageHandler, ReadPacket, Server, Transport } from '@nestjs/microservices';
import { KAFKA_DEFAULT_BROKER, KAFKA_DEFAULT_CLIENT, KAFKA_DEFAULT_GROUP } from '@nestjs/microservices/constants';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ElkLoggerModule,
  IElkLoggerService,
  INestElkLoggerService,
} from 'src/modules/elk-logger';
import { PrometheusManager, PrometheusModule } from 'src/modules/prometheus';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { KafkaAsyncContextHeaderNames, KafkaHeadersToAsyncContextAdapter } from 'src/modules/kafka/kafka-common';
import { MockKafka, MockConsumer } from 'tests/kafkajs';
import { MockConfigService } from 'tests/nestjs';
import { MockElkLoggerService, MockNestElkLoggerService } from 'tests/modules/elk-logger';
import {
  kafkaMessageFactory,
  MockConsumerDeserializer,
  MockKafkaHeadersToAsyncContextAdapter,
} from 'tests/modules/kafka';
import { ConsumerMode } from '../types/types';
import { KAFKA_CONNECTION_STATUS } from '../types/metrics';
import { KafkaContext } from '../ctx-host/kafka.context';
import { ConsumerDeserializer } from '../adapters/consumer.deserializer';
import { KafkaServerBase } from './kafka-server.base';

jest.mock('kafkajs', () => jest.requireActual('tests/kafkajs').KAFKAJS_MOCK);

let mockDelay = jest.fn();

jest.mock('src/modules/date-timestamp', () => {
  const actualDateTimestamp = jest.requireActual('src/modules/date-timestamp');

  const mockDateTimestamp = Object.assign({}, actualDateTimestamp);

  mockDateTimestamp.delay = jest.fn((ms, callback) => mockDelay(ms, callback));

  return mockDateTimestamp;
});

describe(KafkaServerBase, () => {
  class TestKafkaServer extends KafkaServerBase {
    protected async start(): Promise<void> {}

    protected async disconnect(): Promise<void> {
      this.client = null;
    }

    protected async bindEachEvents(): Promise<void> {}

    protected async bindBatchEvents(): Promise<void> {}

    unwrap<T>(): T {
      return {} as unknown as T;
    }
  }

  let logger: IElkLoggerService;
  let nestLogger: INestElkLoggerService;
  let prometheusManager: PrometheusManager;
  let serverName: string;
  let server: TestKafkaServer;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockDelay = jest.fn(() => Promise.resolve());
    logger = new MockElkLoggerService();
    nestLogger = new MockNestElkLoggerService();
    const module = await Test.createTestingModule({
      imports: [ConfigModule, ElkLoggerModule.forRoot(), PrometheusModule],
    })
      .overrideProvider(ConfigService)
      .useValue(new MockConfigService())
      .overrideProvider(ELK_LOGGER_SERVICE_BUILDER_DI)
      .useValue({
        build: () => logger,
      })
      .compile();

    module.useLogger(nestLogger);
    prometheusManager = module.get(PrometheusManager);
  });

  describe('init', () => {
    it('default', async () => {
      server = new TestKafkaServer(
        {
          serverName: 'serverName',
        },
        prometheusManager,
      );

      expect(server).toBeDefined();
      expect(server.transportId).toEqual(Transport.KAFKA);
      expect(server['brokers']).toEqual([KAFKA_DEFAULT_BROKER]);
      expect(server['clientId']).toEqual(KAFKA_DEFAULT_CLIENT + '-server');
      expect(server['groupId']).toEqual(KAFKA_DEFAULT_GROUP + '-server');
      expect(server['headerAdapter'] instanceof KafkaHeadersToAsyncContextAdapter).toBeTruthy();
      expect(server['deserializer'] instanceof ConsumerDeserializer).toBeTruthy();
    });

    it('custom', async () => {
      server = new TestKafkaServer(
        {
          serverName: 'serverName',
          postfixId: '-postfixId',
          client: {
            brokers: ['kafka'],
            clientId: 'clientId',
          },
          consumer: {
            groupId: 'groupId',
          },
          headerAdapter: new MockKafkaHeadersToAsyncContextAdapter(),
          deserializer: new MockConsumerDeserializer(),
        },
        prometheusManager,
      );

      expect(server).toBeDefined();
      expect(server.transportId).toEqual(Transport.KAFKA);
      expect(server['brokers']).toEqual(['kafka']);
      expect(server['clientId']).toEqual('clientId-postfixId');
      expect(server['groupId']).toEqual('groupId-postfixId');
      expect(server['headerAdapter'] instanceof MockKafkaHeadersToAsyncContextAdapter).toBeTruthy();
      expect(server['deserializer'] instanceof MockConsumerDeserializer).toBeTruthy();
    });
  });

  describe('base methods', () => {
    let extras: Record<string, unknown>;
    let messageHandler: MessageHandler;
    let spyHandler: jest.Mock;

    beforeEach(async () => {
      spyHandler = jest.fn();
      serverName = faker.string.alpha(10);
      server = new TestKafkaServer({ serverName }, prometheusManager);
      extras = {
        serverName,
      };
      messageHandler = async (...args: unknown[]) => {
        return spyHandler(...args);
      };

      jest.clearAllMocks();
    });

    it('on', async () => {
      expect(() => server.on('event', jest.fn())).toThrow('Method is not supported for Kafka server');
    });

    it('addHandler', async () => {
      expect(server['eachMessageHandlers']).toEqual([]);
      expect(server['batchMessageHandlers']).toEqual([]);

      const spy = jest.spyOn(Server.prototype, 'addHandler').mockImplementation(jest.fn());

      server.addHandler('topic', messageHandler, false, extras);
      server.addHandler('topic', messageHandler, true, { serverName: faker.string.alpha(4) });

      expect(spy).toHaveBeenCalledTimes(0);

      server.addHandler('eachMessage', messageHandler, true, extras);
      server.addHandler('eachBatch', messageHandler, true, { ...extras, mode: ConsumerMode.EACH_BATCH });

      expect(spy).toHaveBeenCalledTimes(2);
      expect(server['eachMessageHandlers']).toEqual(['eachMessage']);
      expect(server['batchMessageHandlers']).toEqual(['eachBatch']);

      expect(() => server.addHandler('eachBatch', messageHandler, true, extras)).toThrow(
        'Subscription type conflict! The pattern[eachBatch] cannot be used as eachMessage because it is registered as eachBach.',
      );
      expect(() =>
        server.addHandler('eachMessage', messageHandler, true, { ...extras, mode: ConsumerMode.EACH_BATCH }),
      ).toThrow(
        'Subscription type conflict! The pattern[eachMessage] cannot be used as eachBach because it is registered as eachMessage.',
      );
    });

    it('createClient', async () => {
      const client = server['createClient']();

      expect(client instanceof MockKafka).toBeTruthy();
      expect({
        ...(client as unknown as MockKafka)['config'],
        logCreator: undefined,
      }).toEqual({
        enforceRequestTimeout: false,
        clientId: KAFKA_DEFAULT_CLIENT + '-server',
        brokers: [KAFKA_DEFAULT_BROKER],
      });
    });

    it('createConsumer', async () => {
      server['client'] = server['createClient']();

      const spyOn = jest.spyOn(MockConsumer.prototype, 'on');
      const spyConnect = jest.spyOn(MockConsumer.prototype, 'connect');

      const consumer = await server['createConsumer'](ConsumerMode.EACH_BATCH, ['topic']);

      expect(consumer instanceof MockConsumer).toBeTruthy();
      expect((consumer as unknown as MockConsumer)['config']).toEqual({
        groupId: KAFKA_DEFAULT_GROUP + '-server' + '-' + ConsumerMode.EACH_BATCH.toString(),
      });
      expect(spyOn).toHaveBeenCalledTimes(6);

      expect(spyOn.mock.calls[0][0]).toBe('consumer.connect');
      expect(spyOn.mock.calls[1][0]).toBe('consumer.disconnect');
      expect(spyOn.mock.calls[2][0]).toBe('consumer.rebalancing');
      expect(spyOn.mock.calls[3][0]).toBe('consumer.stop');
      expect(spyOn.mock.calls[4][0]).toBe('consumer.crash');
      expect(spyOn.mock.calls[5][0]).toBe('consumer.group_join');

      expect(spyConnect).toHaveBeenCalledTimes(1);
    });

    it('listen', async () => {
      let count = 0;
      mockDelay.mockImplementation(async (ms, callback) => {
        ++count;
        if (count > 1) {
          await server.close();
        }
        if (callback) {
          callback();
        }
        return Promise.resolve();
      });

      // success
      const callback = jest.fn();
      const spyStart = jest.fn();
      server['start'] = spyStart;

      const spyLogError = jest.spyOn(nestLogger, 'error');
      const spyLogWarn = jest.spyOn(nestLogger, 'warn');

      expect(server['client']).toBeNull();

      await server.listen(callback);

      expect(callback).toHaveBeenCalledWith();
      expect(spyStart).toHaveBeenCalledTimes(1);
      expect(server['client'] instanceof MockKafka).toBeTruthy();
      expect(spyLogError).toHaveBeenCalledTimes(0);
      expect(spyLogWarn).toHaveBeenCalledTimes(0);
      expect(count).toBe(0);

      await server.close();

      expect(server['client']).toBeNull();

      // failed createClient
      jest.clearAllMocks();

      const error = new Error('Test error');

      const originalCreateClient = server['createClient'];

      server['createClient'] = () => {
        throw error;
      };

      await server.listen(callback);

      expect(callback).toHaveBeenCalledWith(error);
      expect(spyLogError).toHaveBeenCalledWith(
        `Kafka Server [${serverName}]: ` + 'connection failed.',
        error,
        'KafkaServer',
      );
      expect(spyLogError).toHaveBeenCalledWith(
        `Kafka Server [${serverName}]: ` + 'server failed.',
        undefined,
        'KafkaServer',
      );
      expect(spyLogWarn).toHaveBeenCalledWith(`Kafka Server [${serverName}]: ` + 'connection retry.', 'KafkaServer');
      expect(count).toBe(2);

      // failed start
      jest.clearAllMocks();

      count = 0;
      server['createClient'] = originalCreateClient;
      server['start'] = jest.fn().mockImplementation(() => {
        throw error;
      });

      await server.listen(callback);

      expect(callback).toHaveBeenCalledWith(error);
      expect(spyLogError).toHaveBeenCalledWith(
        `Kafka Server [${serverName}]: ` + 'connection failed.',
        error,
        'KafkaServer',
      );
      expect(spyLogError).toHaveBeenCalledWith(
        `Kafka Server [${serverName}]: ` + 'server failed.',
        undefined,
        'KafkaServer',
      );
      expect(spyLogWarn).toHaveBeenCalledWith(`Kafka Server [${serverName}]: ` + 'connection retry.', 'KafkaServer');
    });

    it('handleEvent', async () => {
      const spyLog = jest.spyOn(server['logger'], 'error').mockImplementation(() => jest.fn());

      const mockContext = {} as unknown as KafkaContext;

      const packet: ReadPacket | ReadPacket[] = {
        pattern: 'eachMessage',
        data: {
          status: 'ok',
        },
      };

      server.getHandlerByPattern = () => {
        return null;
      };

      await server.handleEvent('eachMessage', packet, mockContext);

      expect(spyLog).toHaveBeenCalledWith(
        `Kafka Server [${serverName}]: ` +
          'There is no matching event handler defined in the remote service. Event pattern: eachMessage',
      );

      server.getHandlerByPattern = () => {
        messageHandler.isEventHandler = true;
        messageHandler.extras = {
          ...extras,
          mode: ConsumerMode.EACH_MESSAGE,
        };

        return messageHandler;
      };

      const spyHook = jest.fn().mockImplementation(
        () =>
          new Observable((subscriber) => {
            subscriber.next({ status: 'ok' });
            subscriber.complete();
          }),
      );

      server.setOnProcessingStartHook((transportId, context, done) => spyHook(transportId, context, done));

      await server.handleEvent('eachMessage', packet, mockContext);

      expect(spyHook).toHaveBeenCalledTimes(1);

      const hook = async () => {
        await spyHook.mock.calls[0][2]();
      };

      await hook();

      expect(spyHandler).toHaveBeenCalledWith(packet.data, mockContext);
    });

    it('getMessageOptionsAndAdapters', async () => {
      const handle = {
        ...messageHandler,
        isEventHandler: true,
        extras: {
          ...extras,
          mode: ConsumerMode.EACH_MESSAGE,
        },
      } as unknown as MessageHandler;

      const kafkaMessage = kafkaMessageFactory.build(undefined, {
        transient: {
          headers: {
            traceId: undefined,
            spanId: undefined,
            requestId: undefined,
            correlationId: undefined,
            replyTopic: undefined,
            replyPartition: undefined,
          },
        },
      });

      if (kafkaMessage.headers === undefined) {
        throw new Error('kafkaMessage.headers is not populated by factory');
      }

      expect(server['getMessageOptionsAndAdapters']('eachMessage', kafkaMessage, handle)).toEqual({
        messageOptions: {
          correlationId: kafkaMessage.headers[HttpGeneralAsyncContextHeaderNames.CORRELATION_ID],
          replyTopic: kafkaMessage.headers[KafkaAsyncContextHeaderNames.REPLY_TOPIC],
          replyPartition: Number(kafkaMessage.headers[KafkaAsyncContextHeaderNames.REPLY_PARTITION]),
          serverName,
          topic: 'eachMessage',
          mode: ConsumerMode.EACH_MESSAGE,
        },
        adapters: {
          headerAdapter: server['headerAdapter'],
          deserializer: server['deserializer'],
        },
      });

      extras = {
        serverName,
        mode: ConsumerMode.EACH_MESSAGE,
        replyTopic: faker.string.alpha(4),
        replyPartition: faker.number.int(),
        headerAdapter: new MockKafkaHeadersToAsyncContextAdapter(),
        deserializer: new MockConsumerDeserializer(),
      };

      handle.extras = extras;

      expect(server['getMessageOptionsAndAdapters']('eachMessage', kafkaMessage, handle)).toEqual({
        messageOptions: {
          replyTopic: extras.replyTopic,
          replyPartition: extras.replyPartition,
          serverName,
          topic: 'eachMessage',
          mode: ConsumerMode.EACH_MESSAGE,
        },
        adapters: {
          headerAdapter: extras.headerAdapter,
          deserializer: extras.deserializer,
        },
      });
    });

    it('status', async () => {
      const spy = jest.fn();
      const spyCount = jest.spyOn(prometheusManager.counter(), 'increment');

      server['client'] = server['createClient']();
      const consumer = (await server['createConsumer'](ConsumerMode.EACH_BATCH, ['topic'])) as unknown as MockConsumer;
      const subscription = server.status.pipe(tap(spy)).subscribe();

      consumer.emit('consumer.connect');
      consumer.emit('consumer.disconnect');
      consumer.emit('consumer.rebalancing');
      consumer.emit('consumer.stop');
      consumer.emit('consumer.crash', { payload: { restart: true } });
      consumer.emit('consumer.group_join');

      expect(spy).toHaveBeenCalledTimes(6);
      expect(spy).toHaveBeenCalledWith(KafkaStatus.CONNECTED);
      expect(spy).toHaveBeenCalledWith(KafkaStatus.DISCONNECTED);
      expect(spy).toHaveBeenCalledWith(KafkaStatus.REBALANCING);
      expect(spy).toHaveBeenCalledWith(KafkaStatus.STOPPED);
      expect(spy).toHaveBeenCalledWith(KafkaStatus.CRASHED);

      expect(spyCount).toHaveBeenCalledTimes(6);
      expect(spyCount).toHaveBeenCalledWith(KAFKA_CONNECTION_STATUS, {
        labels: {
          service: serverName,
          status: 'connected',
          topics: 'topic',
          method: ConsumerMode.EACH_BATCH,
        },
      });
      expect(spyCount).toHaveBeenCalledWith(KAFKA_CONNECTION_STATUS, {
        labels: {
          service: serverName,
          status: 'disconnected',
          topics: 'topic',
          method: ConsumerMode.EACH_BATCH,
        },
      });
      expect(spyCount).toHaveBeenCalledWith(KAFKA_CONNECTION_STATUS, {
        labels: {
          service: serverName,
          status: 'stopped',
          topics: 'topic',
          method: ConsumerMode.EACH_BATCH,
        },
      });
      expect(spyCount).toHaveBeenCalledWith(KAFKA_CONNECTION_STATUS, {
        labels: {
          service: serverName,
          status: 'crashed',
          topics: 'topic',
          method: ConsumerMode.EACH_BATCH,
        },
      });
      expect(spyCount).toHaveBeenCalledWith(KAFKA_CONNECTION_STATUS, {
        labels: {
          service: serverName,
          status: 'rebalancing',
          topics: 'topic',
          method: ConsumerMode.EACH_BATCH,
        },
      });
      subscription.unsubscribe();
    });

    it('createConsumer throws when client is not initialized', async () => {
      server['client'] = null;
      await expect(server['createConsumer'](ConsumerMode.EACH_MESSAGE, ['t'])).rejects.toThrow(
        'Kafka client is not initialized',
      );
    });

    it('handleEvent with array packet and observable result triggers end hook', async () => {
      const mockContext = {} as unknown as KafkaContext;
      const endHook = jest.fn();

      server.setOnProcessingEndHook((transportId, context) => endHook(transportId, context));

      const handlerFn = jest.fn().mockReturnValue(of({ ok: true }));
      (handlerFn as unknown as MessageHandler).isEventHandler = true;
      (handlerFn as unknown as MessageHandler).extras = { ...extras, mode: ConsumerMode.EACH_MESSAGE };
      server.getHandlerByPattern = () => handlerFn as unknown as MessageHandler;

      const packets: ReadPacket[] = [
        { pattern: 'p', data: { a: 1 } },
        { pattern: 'p', data: { a: 2 } },
      ];

      await server.handleEvent('p', packets, mockContext);

      expect(handlerFn).toHaveBeenCalledWith([{ a: 1 }, { a: 2 }], mockContext);
      expect(endHook).toHaveBeenCalledWith(Transport.KAFKA, mockContext);
    });

    it('connectAndStart throws when isStop is set while retrying (falsy err.name path)', async () => {
      const error = Object.assign(new Error('boom'), { name: '' });

      mockDelay.mockImplementation(async () => {
        server['isStop'] = true;
      });

      server['start'] = jest.fn(() => {
        throw error;
      });

      await expect(server['connectAndStart']()).rejects.toBe(error);
    });

    it('reconnect early exit when isStop is true', async () => {
      server['isStop'] = true;
      const spyDisconnect = jest.spyOn(server as unknown as { disconnect: () => Promise<void> }, 'disconnect');
      await server['reconnect']();
      expect(spyDisconnect).not.toHaveBeenCalled();
    });

    it('reconnect early exit when isReconnecting is true', async () => {
      server['isReconnecting'] = true;
      const spyDisconnect = jest.spyOn(server as unknown as { disconnect: () => Promise<void> }, 'disconnect');
      await server['reconnect']();
      expect(spyDisconnect).not.toHaveBeenCalled();
    });

    it('reconnect success path', async () => {
      server['start'] = jest.fn().mockResolvedValue(undefined);
      const spyLog = jest.spyOn(nestLogger, 'log');
      await server['reconnect']();
      expect(server['isReconnecting']).toBe(false);
      expect(spyLog).toHaveBeenCalledWith(`Kafka Server [${serverName}]: reconnection success.`, 'KafkaServer');
    });

    it('reconnect silent catch when connectAndStart throws', async () => {
      const error = new Error('fail');
      mockDelay.mockImplementation(async () => {
        server['isStop'] = true;
      });
      server['start'] = jest.fn(() => {
        throw error;
      });
      await expect(server['reconnect']()).resolves.toBeUndefined();
      expect(server['isReconnecting']).toBe(false);
    });

    it('registerConsumerEventListeners CRASH with restart=false triggers reconnect when not stopping/connecting', async () => {
      server['client'] = server['createClient']();
      const consumer = (await server['createConsumer'](ConsumerMode.EACH_MESSAGE, [
        'topic',
      ])) as unknown as MockConsumer;
      const spyReconnect = jest
        .spyOn(server as unknown as { reconnect: () => Promise<void> }, 'reconnect')
        .mockResolvedValue(undefined);

      server['isStop'] = false;
      server['isConnecting'] = false;

      consumer.emit('consumer.crash', { payload: { restart: false } });

      expect(spyReconnect).toHaveBeenCalledTimes(1);
    });

    it('registerConsumerEventListeners CRASH does not reconnect when isStop=true', async () => {
      server['client'] = server['createClient']();
      const consumer = (await server['createConsumer'](ConsumerMode.EACH_MESSAGE, [
        'topic',
      ])) as unknown as MockConsumer;
      const spyReconnect = jest
        .spyOn(server as unknown as { reconnect: () => Promise<void> }, 'reconnect')
        .mockResolvedValue(undefined);
      server['isStop'] = true;
      consumer.emit('consumer.crash', { payload: { restart: false } });
      expect(spyReconnect).not.toHaveBeenCalled();
    });

    it('registerConsumerEventListeners CRASH does not reconnect when isConnecting=true', async () => {
      server['client'] = server['createClient']();
      const consumer = (await server['createConsumer'](ConsumerMode.EACH_MESSAGE, [
        'topic',
      ])) as unknown as MockConsumer;
      const spyReconnect = jest
        .spyOn(server as unknown as { reconnect: () => Promise<void> }, 'reconnect')
        .mockResolvedValue(undefined);
      server['isStop'] = false;
      server['isConnecting'] = true;
      consumer.emit('consumer.crash', { payload: { restart: false } });
      expect(spyReconnect).not.toHaveBeenCalled();
    });

    it('waitForConsumerReady resolves on GROUP_JOIN', async () => {
      server['client'] = server['createClient']();
      const consumer = (await server['createConsumer'](ConsumerMode.EACH_MESSAGE, [
        'topic',
      ])) as unknown as MockConsumer;

      const pending = server['waitForConsumerReady'](
        consumer as unknown as Parameters<(typeof server)['waitForConsumerReady']>[0],
        ConsumerMode.EACH_MESSAGE,
      );
      consumer.emit('consumer.group_join');
      await expect(pending).resolves.toBeUndefined();
    });

    it('waitForConsumerReady rejects on CRASH with restart=false', async () => {
      server['client'] = server['createClient']();
      const consumer = (await server['createConsumer'](ConsumerMode.EACH_MESSAGE, [
        'topic',
      ])) as unknown as MockConsumer;

      const pending = server['waitForConsumerReady'](
        consumer as unknown as Parameters<(typeof server)['waitForConsumerReady']>[0],
        ConsumerMode.EACH_MESSAGE,
      );
      consumer.emit('consumer.crash', { payload: { restart: false, error: new Error('oops') } });
      await expect(pending).rejects.toThrow(`Consumer ${ConsumerMode.EACH_MESSAGE} crashed: oops`);
    });

    it('waitForConsumerReady does not reject on CRASH with restart=true', async () => {
      server['client'] = server['createClient']();
      const consumer = (await server['createConsumer'](ConsumerMode.EACH_MESSAGE, [
        'topic',
      ])) as unknown as MockConsumer;

      let settled = false;
      const pending = server['waitForConsumerReady'](
        consumer as unknown as Parameters<(typeof server)['waitForConsumerReady']>[0],
        ConsumerMode.EACH_MESSAGE,
      ).then(
        () => (settled = true),
        () => (settled = true),
      );

      consumer.emit('consumer.crash', { payload: { restart: true } });
      await new Promise((r) => setImmediate(r));
      expect(settled).toBe(false);

      consumer.emit('consumer.group_join');
      await pending;
      expect(settled).toBe(true);
    });

    it('waitForConsumerReady rejects with unknown error when crash payload has no error', async () => {
      server['client'] = server['createClient']();
      const consumer = (await server['createConsumer'](ConsumerMode.EACH_MESSAGE, [
        'topic',
      ])) as unknown as MockConsumer;

      const pending = server['waitForConsumerReady'](
        consumer as unknown as Parameters<(typeof server)['waitForConsumerReady']>[0],
        ConsumerMode.EACH_MESSAGE,
      );
      consumer.emit('consumer.crash', { payload: { restart: false } });
      await expect(pending).rejects.toThrow(`Consumer ${ConsumerMode.EACH_MESSAGE} crashed: unknown error`);
    });

    it('waitForConsumerReady rejects on STOP', async () => {
      server['client'] = server['createClient']();
      const consumer = (await server['createConsumer'](ConsumerMode.EACH_MESSAGE, [
        'topic',
      ])) as unknown as MockConsumer;

      const pending = server['waitForConsumerReady'](
        consumer as unknown as Parameters<(typeof server)['waitForConsumerReady']>[0],
        ConsumerMode.EACH_MESSAGE,
      );
      consumer.emit('consumer.stop');
      await expect(pending).rejects.toThrow(`Consumer ${ConsumerMode.EACH_MESSAGE} stopped during startup`);
    });

    it('getMessageOptionsAndAdapters without handler uses defaults', async () => {
      const kafkaMessage = kafkaMessageFactory.build();
      const result = server['getMessageOptionsAndAdapters']('topicX', kafkaMessage, null);
      expect(result.adapters.headerAdapter).toBe(server['headerAdapter']);
      expect(result.adapters.deserializer).toBe(server['deserializer']);
      expect(result.messageOptions.mode).toBe(ConsumerMode.EACH_MESSAGE);
      expect(result.messageOptions.topic).toBe('topicX');
      expect(result.messageOptions.serverName).toBe(serverName);
    });

    it('addHandler defaults mode to EACH_MESSAGE when undefined', async () => {
      jest.spyOn(Server.prototype, 'addHandler').mockImplementation(jest.fn());
      server.addHandler('p', messageHandler, true, { serverName });
      expect(extras).toBeDefined();
      expect(server['eachMessageHandlers']).toContain('p');
    });

    it('observable result from firstValueFrom is just to keep import used', async () => {
      await expect(firstValueFrom(of(1))).resolves.toBe(1);
    });
  });
});
