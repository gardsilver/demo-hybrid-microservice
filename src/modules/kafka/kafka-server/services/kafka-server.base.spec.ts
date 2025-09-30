import { Observable, tap } from 'rxjs';
import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaStatus, MessageHandler, ReadPacket, Server, Transport } from '@nestjs/microservices';
import { KAFKA_DEFAULT_BROKER, KAFKA_DEFAULT_CLIENT, KAFKA_DEFAULT_GROUP } from '@nestjs/microservices/constants';
import { ELK_LOGGER_SERVICE_BUILDER_DI, ElkLoggerModule, IElkLoggerService } from 'src/modules/elk-logger';
import { PrometheusManager, PrometheusModule } from 'src/modules/prometheus';
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { KafkaAsyncContextHeaderNames, KafkaHeadersToAsyncContextAdapter } from 'src/modules/kafka/kafka-common';
import { MockKafka, MockConsumer } from 'tests/kafkajs';
import { MockConfigService } from 'tests/nestjs';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { kafkaMessageFactory, MockKafkaDeserializer, MockKafkaHeadersToAsyncContextAdapter } from 'tests/modules/kafka';
import { ConsumerMode } from '../types/types';
import { KafkaContext } from '../ctx-host/kafka.context';
import { KafkaServerRequestDeserializer } from '../adapters/kafka-server.request.deserializer';
import { KafkaServerBase } from './kafka-server.base';

jest.mock('kafkajs', () => {
  return { Kafka: jest.fn((prams?) => new MockKafka(prams)) };
});

describe(KafkaServerBase, () => {
  class TestKafkaServer extends KafkaServerBase {
    public async close(): Promise<void> {}

    protected async start(callback: () => void): Promise<void> {
      callback();
    }

    protected async bindEachEvents(): Promise<void> {}

    protected async bindBatchEvents(): Promise<void> {}

    unwrap<T>(): T {
      return {} as undefined as T;
    }
  }

  let logger: IElkLoggerService;
  let prometheusManager: PrometheusManager;
  let serverName: string;
  let server: TestKafkaServer;

  beforeEach(async () => {
    jest.clearAllMocks();

    logger = new MockElkLoggerService();

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
      expect(server['deserializer'] instanceof KafkaServerRequestDeserializer).toBeTruthy();
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
          deserializer: new MockKafkaDeserializer(),
        },
        prometheusManager,
      );

      expect(server).toBeDefined();
      expect(server.transportId).toEqual(Transport.KAFKA);
      expect(server['brokers']).toEqual(['kafka']);
      expect(server['clientId']).toEqual('clientId-postfixId');
      expect(server['groupId']).toEqual('groupId-postfixId');
      expect(server['headerAdapter'] instanceof MockKafkaHeadersToAsyncContextAdapter).toBeTruthy();
      expect(server['deserializer'] instanceof MockKafkaDeserializer).toBeTruthy();
    });
  });

  describe('base methods', () => {
    let extras;
    let messageHandler: MessageHandler;
    let spyHandler;

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
        ...client['config'],
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

      const consumer = await server['createConsumer']();

      expect(consumer instanceof MockConsumer).toBeTruthy();
      expect(consumer['config']).toEqual({
        groupId: KAFKA_DEFAULT_GROUP + '-server',
      });
      expect(spyOn).toHaveReturnedTimes(6);

      expect(spyOn.mock.calls[0][0]).toBe('consumer.connect');
      expect(spyOn.mock.calls[1][0]).toBe('consumer.disconnect');
      expect(spyOn.mock.calls[2][0]).toBe('consumer.rebalancing');
      expect(spyOn.mock.calls[3][0]).toBe('consumer.stop');
      expect(spyOn.mock.calls[4][0]).toBe('consumer.crash');
      expect(spyOn.mock.calls[5][0]).toBe('consumer.group_join');

      expect(spyConnect).toHaveReturnedTimes(1);
    });

    it('listen', async () => {
      const callback = jest.fn();

      await server.listen(callback);

      expect(callback).toHaveBeenCalledWith();
      expect(server['client'] instanceof MockKafka).toBeTruthy();

      const error = new Error('Test error');
      server['start'] = jest.fn().mockImplementation(() => {
        throw error;
      });

      await server.listen(callback);

      expect(callback).toHaveBeenCalledWith(error);
    });

    it('handleEvent', async () => {
      const spyLog = jest.spyOn(server['logger'], 'error').mockImplementation(() => jest.fn());

      const mockContext = {} as undefined as KafkaContext;

      const packet: ReadPacket | ReadPacket[] = {
        pattern: 'eachMessage',
        data: {
          status: 'ok',
        },
      };

      server.getHandlerByPattern = () => {
        return undefined;
      };

      await server.handleEvent('eachMessage', packet, mockContext);

      expect(spyLog).toHaveBeenCalledWith(
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
      } as undefined as MessageHandler;

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
        deserializer: new MockKafkaDeserializer(),
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

      server['client'] = server['createClient']();
      const consumer = (await server['createConsumer']()) as undefined as MockConsumer;
      const subscription = server.status.pipe(tap(spy)).subscribe();

      consumer.emit('consumer.connect');
      consumer.emit('consumer.disconnect');
      consumer.emit('consumer.rebalancing');
      consumer.emit('consumer.stop');
      consumer.emit('consumer.crash');
      consumer.emit('consumer.group_join');

      expect(spy).toHaveBeenCalledTimes(6);
      expect(spy).toHaveBeenCalledWith(KafkaStatus.CONNECTED);
      expect(spy).toHaveBeenCalledWith(KafkaStatus.DISCONNECTED);
      expect(spy).toHaveBeenCalledWith(KafkaStatus.REBALANCING);
      expect(spy).toHaveBeenCalledWith(KafkaStatus.STOPPED);
      expect(spy).toHaveBeenCalledWith(KafkaStatus.CRASHED);

      subscription.unsubscribe();
    });
  });
});
