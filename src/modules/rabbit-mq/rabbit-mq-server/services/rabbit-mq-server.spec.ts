/* eslint-disable @typescript-eslint/no-explicit-any */
import { Observable, tap } from 'rxjs';
import { CommonMessageFields, ConsumeMessage, MessagePropertyHeaders } from 'amqplib';
import { Channel } from 'amqp-connection-manager';
import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessageHandler, Server } from '@nestjs/microservices';
import { RQM_DEFAULT_QUEUE, RQM_DEFAULT_URL } from '@nestjs/microservices/constants';
import { RmqEventsMap } from '@nestjs/microservices/events/rmq.events';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ElkLoggerModule,
  IElkLoggerService,
  INestElkLoggerService,
} from 'src/modules/elk-logger';
import { PrometheusManager, PrometheusModule } from 'src/modules/prometheus';
import { IRabbitMqConsumeMessage, RabbitMqServerBuilder, RmqStatus } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { messageFieldsFactory, messagePropertiesFactory, messagePropertyHeadersFactory } from 'tests/amqplib';
import { MockAmqpConnectionManager, MockChannel, MockChannelWrapper } from 'tests/amqp-connection-manager';
import { MockConfigService } from 'tests/nestjs';
import { MockElkLoggerService, MockNestElkLoggerService } from 'tests/modules/elk-logger';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { MockConsumerDeserializer } from 'tests/modules/rabbit-mq';
import { RabbitMqServer } from './rabbit-mq-server';
import { ConsumerDeserializer } from '../adapters/consumer.deserializer';
import {
  RABBIT_MQ_SERVER_CONNECTION_STATUS,
  RABBIT_MQ_HANDLE_MESSAGE,
  RABBIT_MQ_HANDLE_MESSAGE_FAILED,
  RABBIT_MQ_SERVER_CONNECTION_FAILED,
} from '../types/metrics';
import { RabbitMqContext } from '../ctx-host/rabbit-mq.context';
import { IConsumerPacket } from '../types/types';

describe(RabbitMqServer.name, () => {
  let mockConnect;
  let logger: IElkLoggerService;
  let nestLogger: INestElkLoggerService;
  let prometheusManager: PrometheusManager;
  let serverName: string;
  let logTitle: string;
  let headers: MessagePropertyHeaders;
  let consumeMessage: ConsumeMessage;
  let server: RabbitMqServer;

  beforeEach(async () => {
    mockConnect = () => new MockAmqpConnectionManager();

    jest.spyOn(RabbitMqServerBuilder, 'build').mockImplementation(() => mockConnect());

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

    serverName = faker.string.alpha(10);
    logTitle = faker.string.alpha(10);

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
    consumeMessage = {
      content: Buffer.from('Hello World!'),
      properties: messagePropertiesFactory.build(
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
      ),
      fields: messageFieldsFactory.build(
        {},
        { transient: { consumerTag: undefined } },
      ) as unknown as CommonMessageFields,
    } as unknown as ConsumeMessage;

    jest.clearAllMocks();
  });

  describe('init', () => {
    it('default', async () => {
      server = new RabbitMqServer(
        {
          serverName,
        },
        prometheusManager,
      );

      expect(server).toBeDefined();
      expect(server['serverName']).toBe(serverName);
      expect(server['logTitle']).toBe(`RMQ Server [${serverName}]: `);
      expect(server['urls']).toEqual([RQM_DEFAULT_URL]);
      expect(server['deserializer'] instanceof ConsumerDeserializer).toBeTruthy();
    });

    it('custom', async () => {
      server = new RabbitMqServer(
        {
          deserializer: new MockConsumerDeserializer(),
          serverName,
          logTitle,
        },
        prometheusManager,
      );

      expect(server).toBeDefined();
      expect(server['serverName']).toBe(serverName);
      expect(server['logTitle']).toBe(logTitle);
      expect(server['deserializer'] instanceof MockConsumerDeserializer).toBeTruthy();
    });
  });

  describe('base methods', () => {
    let extras;
    let messageHandler: MessageHandler;
    let spyHandler;

    beforeEach(async () => {
      server = new RabbitMqServer(
        {
          serverName,
        },
        prometheusManager,
      );

      spyHandler = jest.fn();
      extras = {
        serverName,
      };
      messageHandler = async (...args: unknown[]) => {
        return spyHandler(...args);
      };
    });

    it('addHandler', async () => {
      const spy = jest.spyOn(Server.prototype, 'addHandler');

      server.addHandler('pattern', messageHandler, false, extras);
      server.addHandler('pattern', messageHandler, true, { serverName: faker.string.alpha(10) });

      expect(spy).toHaveBeenCalledTimes(0);
      expect(server.getHandlers().size).toBe(0);

      server.addHandler('pattern', messageHandler, true, extras);

      expect(spy).toHaveBeenCalledWith('pattern', messageHandler, true, extras);
      expect(server.getHandlers().size).toBe(1);
    });

    it('unwrap && on when server is not start', async () => {
      expect(() => server.unwrap()).toThrow(
        'Not initialized. Please call the "listen"/"startAllMicroservices" method before accessing the server.',
      );

      const eventCallback = jest.fn();

      server.on(RmqEventsMap.ERROR, eventCallback);
      expect(server['pendingEventListeners']).toEqual([{ event: RmqEventsMap.ERROR, callback: eventCallback }]);
    });

    it('start/close server when have not subscribers', async () => {
      const callback = jest.fn();

      await server.listen(callback);

      const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
      const spyCreateChannel = jest.spyOn(mockClient, 'createChannel');

      await mockClient.testOnceEvents(RmqEventsMap.CONNECT);

      expect(callback).toHaveBeenCalledWith();

      expect(spyCreateChannel).toHaveBeenCalledTimes(0);

      expect(server['channels'].size).toBe(0);
      expect(server['consumersInfo'].size).toBe(0);

      const spyServerClose = jest.spyOn(mockClient, 'close');

      await server.close();

      expect(spyServerClose).toHaveBeenCalledTimes(1);
    });

    it('call connect() as failed', async () => {
      const error = new Error('Test error connections');
      const callback = jest.fn();

      mockConnect = () => {
        throw error;
      };

      await server.listen(callback);

      expect(callback).toHaveBeenCalledWith(error);
    });
  });

  describe('methods when server start', () => {
    let extras;
    let messageHandler: MessageHandler;
    let spyHandler;
    let callback;

    describe('default server start as success', () => {
      beforeEach(async () => {
        server = new RabbitMqServer(
          {
            serverName,
            logTitle,
          },
          prometheusManager,
        );

        callback = jest.fn();
        spyHandler = jest.fn();
        extras = {
          serverName,
        };
        messageHandler = async (...args: unknown[]) => {
          return spyHandler(...args);
        };

        server.addHandler('pattern', messageHandler, true, extras);
      });

      it('unwrap && on when server is start', async () => {
        await server.listen(callback);
        expect(server.unwrap() instanceof MockAmqpConnectionManager).toBeTruthy();

        const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;

        const spyAddListener = jest.spyOn(mockClient, 'addListener');
        const eventCallback = jest.fn();

        server.on(RmqEventsMap.ERROR, eventCallback);
        expect(spyAddListener).toHaveBeenCalledWith(RmqEventsMap.ERROR, eventCallback);
      });

      it('listen', async () => {
        await server.listen(callback);

        expect(callback).toHaveBeenCalledTimes(0);

        expect(server['client'] instanceof MockAmqpConnectionManager).toBeTruthy();

        const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;

        expect(mockClient['onceEvents'].size).toBe(2);
        expect(mockClient['events'].size).toBe(2);
      });

      it('runConsumers', async () => {
        await server.listen(callback);

        const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
        const spyCreateChannel = jest.spyOn(mockClient, 'createChannel');

        await mockClient.testOnceEvents(RmqEventsMap.CONNECT);

        expect(callback).toHaveBeenCalledWith();

        expect(spyCreateChannel).toHaveBeenCalledTimes(1);

        expect(mockClient['channelWrapper']['options']).toBeDefined();

        // Проверка: повторный вызов listen() не имеет ни какого действия
        await mockClient.testOnceEvents(RmqEventsMap.CONNECT);

        expect(spyCreateChannel).toHaveBeenCalledTimes(1);
      });

      it('setupChannel and close', async () => {
        await server.listen(callback);
        const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
        await mockClient.testOnceEvents(RmqEventsMap.CONNECT);

        const mockChannelWrapper: MockChannelWrapper = mockClient['channelWrapper'] as unknown as MockChannelWrapper;
        const mockChannel: MockChannel = mockChannelWrapper.channel as unknown as MockChannel;

        const spyAssertQueue = jest.spyOn(mockChannel, 'assertQueue');
        const spyAssertExchange = jest.spyOn(mockChannel, 'assertExchange');
        const spyBindQueue = jest.spyOn(mockChannel, 'bindQueue');
        const spyPrefetch = jest.spyOn(mockChannel, 'prefetch');
        const spyConsume = jest.spyOn(mockChannel, 'consume');

        await mockChannelWrapper.testSetup();

        expect(spyAssertQueue).toHaveBeenCalledTimes(1);
        expect(spyAssertExchange).toHaveBeenCalledTimes(0);
        expect(spyBindQueue).toHaveBeenCalledTimes(0);
        expect(spyPrefetch).toHaveBeenCalledTimes(1);
        expect(spyConsume).toHaveBeenCalledTimes(1);

        expect(server.getConsumersInfo()).toEqual(new Map<string, any>([['pattern', { queue: mockChannel.queue }]]));

        expect(server['channels'].size).toBe(1);
        expect(server['consumersInfo'].size).toBe(1);

        const spyChannelClose = jest.spyOn(mockChannelWrapper, 'close');
        const spyServerClose = jest.spyOn(mockClient, 'close');

        await server.close();

        expect(spyChannelClose).toHaveBeenCalledTimes(1);
        expect(spyServerClose).toHaveBeenCalledTimes(1);

        expect(server['channels'].size).toBe(0);
        expect(server['consumersInfo'].size).toBe(0);
      });

      it('setupChannel with noAssert=true', async () => {
        server['options'].noAssert = true;

        await server.listen(callback);
        const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
        await mockClient.testOnceEvents(RmqEventsMap.CONNECT);

        const mockChannelWrapper: MockChannelWrapper = mockClient['channelWrapper'] as unknown as MockChannelWrapper;
        const mockChannel: MockChannel = mockChannelWrapper.channel as unknown as MockChannel;

        const spyAssertQueue = jest.spyOn(mockChannel, 'assertQueue');
        const spyAssertExchange = jest.spyOn(mockChannel, 'assertExchange');
        const spyBindQueue = jest.spyOn(mockChannel, 'bindQueue');
        const spyPrefetch = jest.spyOn(mockChannel, 'prefetch');
        const spyConsume = jest.spyOn(mockChannel, 'consume');

        await mockChannelWrapper.testSetup();

        expect(spyAssertQueue).toHaveBeenCalledTimes(0);
        expect(spyAssertExchange).toHaveBeenCalledTimes(0);
        expect(spyBindQueue).toHaveBeenCalledTimes(0);
        expect(spyPrefetch).toHaveBeenCalledTimes(1);
        expect(spyConsume).toHaveBeenCalledTimes(1);

        expect(server.getConsumersInfo()).toEqual(new Map<string, any>([['pattern', { queue: RQM_DEFAULT_QUEUE }]]));

        expect(server['channels'].size).toBe(1);
        expect(server['consumersInfo'].size).toBe(1);
      });

      it('handleMessage as success', async () => {
        await server.listen(callback);
        const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
        await mockClient.testOnceEvents(RmqEventsMap.CONNECT);
        const mockChannelWrapper: MockChannelWrapper = mockClient['channelWrapper'] as unknown as MockChannelWrapper;
        const mockChannel: MockChannel = mockChannelWrapper.channel as unknown as MockChannel;
        await mockChannelWrapper.testSetup();

        const spyCounterIncrement = jest.spyOn(prometheusManager.counter(), 'increment');
        const mockDeserializeMessage: IConsumerPacket = {
          pattern: 'pattern',
          data: {
            content: 'content',
          } as unknown as IRabbitMqConsumeMessage,
        };
        const deserializeOptions = {
          pattern: 'pattern',
          ...extras,
          consumer: {
            serverName,
            logTitle,
            ...extras.consumer,
            queue: mockChannel.queue,
            exchangeArguments: {},
            queueOptions: {},
          },
        };
        const spyDeserialize = jest
          .spyOn(server['deserializer'], 'deserialize')
          .mockImplementation(() => mockDeserializeMessage);

        // eslint-disable-next-line @typescript-eslint/await-thenable
        await mockChannel.testOnMessage(consumeMessage);

        expect(spyCounterIncrement).toHaveBeenCalledTimes(1);
        expect(spyCounterIncrement).toHaveBeenCalledWith(RABBIT_MQ_HANDLE_MESSAGE, {
          labels: {
            service: serverName,
            queue: mockChannel.queue,
            exchange: '',
            routing: '',
          },
          value: 1,
        });

        expect(spyDeserialize).toHaveBeenCalledWith(consumeMessage, deserializeOptions);

        expect(spyHandler).toHaveBeenCalledWith(
          mockDeserializeMessage.data,
          new RabbitMqContext([
            consumeMessage,
            mockDeserializeMessage.data,
            mockChannel as unknown as Channel,
            deserializeOptions,
          ]),
        );
      });

      it('handleMessage as success (deserializer crash)', async () => {
        await server.listen(callback);
        const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
        await mockClient.testOnceEvents(RmqEventsMap.CONNECT);
        const mockChannelWrapper: MockChannelWrapper = mockClient['channelWrapper'] as unknown as MockChannelWrapper;
        const mockChannel: MockChannel = mockChannelWrapper.channel as unknown as MockChannel;
        await mockChannelWrapper.testSetup();

        const spyCounterIncrement = jest.spyOn(prometheusManager.counter(), 'increment');
        const crashError = new Error('Test Error');

        jest.spyOn(server['deserializer'], 'deserialize').mockImplementation(() => {
          throw crashError;
        });

        // eslint-disable-next-line @typescript-eslint/await-thenable
        await mockChannel.testOnMessage(consumeMessage);

        expect(spyCounterIncrement).toHaveBeenCalledTimes(2);
        expect(spyCounterIncrement).toHaveBeenCalledWith(RABBIT_MQ_HANDLE_MESSAGE, {
          labels: {
            service: serverName,
            queue: mockChannel.queue,
            exchange: '',
            routing: '',
          },
          value: 1,
        });

        expect(spyCounterIncrement).toHaveBeenCalledWith(RABBIT_MQ_HANDLE_MESSAGE_FAILED, {
          labels: {
            service: serverName,
            queue: mockChannel.queue,
            exchange: '',
            routing: '',
            errorType: 'Error',
          },
          value: 1,
        });

        expect(spyHandler).toHaveBeenCalledTimes(0);
      });

      it('handleMessage as failed', async () => {
        spyHandler = spyHandler.mockImplementation(() => {
          throw new Error('Test error');
        });

        await server.listen(callback);
        const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
        await mockClient.testOnceEvents(RmqEventsMap.CONNECT);
        const mockChannelWrapper: MockChannelWrapper = mockClient['channelWrapper'] as unknown as MockChannelWrapper;
        const mockChannel: MockChannel = mockChannelWrapper.channel as unknown as MockChannel;
        await mockChannelWrapper.testSetup();

        const spyCounterIncrement = jest.spyOn(prometheusManager.counter(), 'increment');

        // eslint-disable-next-line @typescript-eslint/await-thenable
        await mockChannel.testOnMessage(consumeMessage);

        expect(spyCounterIncrement).toHaveBeenCalledTimes(2);
        expect(spyCounterIncrement).toHaveBeenCalledWith(RABBIT_MQ_HANDLE_MESSAGE, {
          labels: {
            service: serverName,
            queue: mockChannel.queue,
            exchange: '',
            routing: '',
          },
          value: 1,
        });

        expect(spyCounterIncrement).toHaveBeenCalledWith(RABBIT_MQ_HANDLE_MESSAGE_FAILED, {
          labels: {
            service: serverName,
            queue: mockChannel.queue,
            exchange: '',
            routing: '',
            errorType: 'Error',
          },
          value: 1,
        });
      });

      it('handleMessage as Observable success', async () => {
        spyHandler = spyHandler.mockImplementation(() => {
          return new Observable((observer) => {
            observer.next(true);
            observer.complete();
          });
        });

        await server.listen(callback);
        const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
        await mockClient.testOnceEvents(RmqEventsMap.CONNECT);
        const mockChannelWrapper: MockChannelWrapper = mockClient['channelWrapper'] as unknown as MockChannelWrapper;
        const mockChannel: MockChannel = mockChannelWrapper.channel as unknown as MockChannel;
        await mockChannelWrapper.testSetup();

        const spyCounterIncrement = jest.spyOn(prometheusManager.counter(), 'increment');
        const mockDeserializeMessage: IConsumerPacket = {
          pattern: 'pattern',
          data: {
            content: 'content',
          } as unknown as IRabbitMqConsumeMessage,
        };
        const deserializeOptions = {
          pattern: 'pattern',
          ...extras,
          consumer: {
            serverName,
            logTitle,
            ...extras.consumer,
            queue: mockChannel.queue,
            exchangeArguments: {},
            queueOptions: {},
          },
        };

        const spyDeserialize = jest
          .spyOn(server['deserializer'], 'deserialize')
          .mockImplementation(() => mockDeserializeMessage);

        // eslint-disable-next-line @typescript-eslint/await-thenable
        await mockChannel.testOnMessage(consumeMessage);

        expect(spyCounterIncrement).toHaveBeenCalledTimes(1);
        expect(spyCounterIncrement).toHaveBeenCalledWith(RABBIT_MQ_HANDLE_MESSAGE, {
          labels: {
            service: serverName,
            queue: mockChannel.queue,
            exchange: '',
            routing: '',
          },
          value: 1,
        });

        expect(spyDeserialize).toHaveBeenCalledWith(consumeMessage, deserializeOptions);

        expect(spyHandler).toHaveBeenCalledWith(
          mockDeserializeMessage.data,
          new RabbitMqContext([
            consumeMessage,
            mockDeserializeMessage.data,
            mockChannel as unknown as Channel,
            deserializeOptions,
          ]),
        );
      });

      it('handleMessage as Observable failed', async () => {
        spyHandler = spyHandler.mockImplementation(() => {
          return new Observable((observer) => {
            observer.error(new Error('Test error'));
            observer.complete();
          });
        });

        await server.listen(callback);
        const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
        await mockClient.testOnceEvents(RmqEventsMap.CONNECT);
        const mockChannelWrapper: MockChannelWrapper = mockClient['channelWrapper'] as unknown as MockChannelWrapper;
        const mockChannel: MockChannel = mockChannelWrapper.channel as unknown as MockChannel;
        await mockChannelWrapper.testSetup();

        const spyCounterIncrement = jest.spyOn(prometheusManager.counter(), 'increment');

        // eslint-disable-next-line @typescript-eslint/await-thenable
        await mockChannel.testOnMessage(consumeMessage);

        expect(spyCounterIncrement).toHaveBeenCalledTimes(2);
        expect(spyCounterIncrement).toHaveBeenCalledWith(RABBIT_MQ_HANDLE_MESSAGE, {
          labels: {
            service: serverName,
            queue: mockChannel.queue,
            exchange: '',
            routing: '',
          },
          value: 1,
        });

        expect(spyCounterIncrement).toHaveBeenCalledWith(RABBIT_MQ_HANDLE_MESSAGE_FAILED, {
          labels: {
            service: serverName,
            queue: mockChannel.queue,
            exchange: '',
            routing: '',
            errorType: 'Error',
          },
          value: 1,
        });
      });
    });

    describe('custom server start as success', () => {
      let deserializer;
      beforeEach(async () => {
        deserializer = new MockConsumerDeserializer();
        server = new RabbitMqServer(
          {
            deserializer,
            serverName,
            logTitle,
          },
          prometheusManager,
        );

        callback = jest.fn();
        spyHandler = jest.fn();
        extras = {
          serverName,
        };
        messageHandler = async (...args: unknown[]) => {
          return spyHandler(...args);
        };

        server.addHandler('pattern', messageHandler, true, extras);
      });

      it('handleMessage', async () => {
        await server.listen(callback);
        const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
        await mockClient.testOnceEvents(RmqEventsMap.CONNECT);
        const mockChannelWrapper: MockChannelWrapper = mockClient['channelWrapper'] as unknown as MockChannelWrapper;
        const mockChannel: MockChannel = mockChannelWrapper.channel as unknown as MockChannel;
        await mockChannelWrapper.testSetup();

        const deserializeOptions = {
          pattern: 'pattern',
          ...extras,
          consumer: {
            serverName,
            logTitle,
            ...extras.consumer,
            queue: mockChannel.queue,
            exchangeArguments: {},
            queueOptions: {},
          },
        };

        const spyDeserialize = jest.spyOn(deserializer, 'deserialize');

        // eslint-disable-next-line @typescript-eslint/await-thenable
        await mockChannel.testOnMessage(consumeMessage);

        expect(spyDeserialize).toHaveBeenCalledWith(consumeMessage, deserializeOptions);
      });
    });

    describe('server start as success with noAck', () => {
      describe('noAck is false', () => {
        beforeEach(async () => {
          server = new RabbitMqServer(
            {
              noAck: false,
              serverName,
              logTitle,
            },
            prometheusManager,
          );

          callback = jest.fn();
          spyHandler = jest.fn();
          extras = {
            serverName,
          };
          messageHandler = async (...args: unknown[]) => {
            return spyHandler(...args);
          };

          server.addHandler('pattern', messageHandler, true, extras);
        });

        it('handleEvent for undefined', async () => {
          const channel: Channel = new MockChannel() as unknown as Channel;

          const spyAck = jest.spyOn(channel, 'ack');
          const spyNack = jest.spyOn(channel, 'nack');

          const mockDeserializeMessage: IConsumerPacket = {
            pattern: 'pattern',
            data: {
              content: 'content',
            } as unknown as IRabbitMqConsumeMessage,
          };
          const deserializeOptions = {
            pattern: 'pattern',
            ...extras,
            consumer: {
              serverName,
              logTitle,
              ...extras.consumer,
              queue: faker.string.alpha(6),
              exchangeArguments: {},
              queueOptions: {},
            },
          };
          const rmqContext = new RabbitMqContext([
            consumeMessage,
            mockDeserializeMessage.data,
            channel,
            deserializeOptions,
          ]);

          await server.handleEvent('pattern-undefined', mockDeserializeMessage, rmqContext);

          expect(spyAck).toHaveBeenCalledTimes(0);
          expect(spyNack).toHaveBeenCalledTimes(1);
          expect(spyHandler).toHaveBeenCalledTimes(0);
        });

        it('handleMessage as skip', async () => {
          await server.listen(callback);
          const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
          await mockClient.testOnceEvents(RmqEventsMap.CONNECT);
          const mockChannelWrapper: MockChannelWrapper = mockClient['channelWrapper'] as unknown as MockChannelWrapper;
          const mockChannel: MockChannel = mockChannelWrapper.channel as unknown as MockChannel;
          await mockChannelWrapper.testSetup();

          const mockDeserializeMessage = {
            pattern: 'pattern',
            data: undefined,
          };

          jest.spyOn(server['deserializer'], 'deserialize').mockImplementation(() => mockDeserializeMessage);

          const spyAck = jest.spyOn(mockChannel, 'ack');
          const spyNack = jest.spyOn(mockChannel, 'nack');

          // eslint-disable-next-line @typescript-eslint/await-thenable
          await mockChannel.testOnMessage(consumeMessage);

          expect(spyAck).toHaveBeenCalledTimes(1);
          expect(spyNack).toHaveBeenCalledTimes(0);
          expect(spyHandler).toHaveBeenCalledTimes(0);
        });

        it('handleMessage as success', async () => {
          await server.listen(callback);
          const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
          await mockClient.testOnceEvents(RmqEventsMap.CONNECT);
          const mockChannelWrapper: MockChannelWrapper = mockClient['channelWrapper'] as unknown as MockChannelWrapper;
          const mockChannel: MockChannel = mockChannelWrapper.channel as unknown as MockChannel;
          await mockChannelWrapper.testSetup();

          const mockDeserializeMessage = {
            pattern: 'pattern',
            data: {
              content: 'content',
            },
          };

          jest.spyOn(server['deserializer'], 'deserialize').mockImplementation(() => mockDeserializeMessage);

          const spyAck = jest.spyOn(mockChannel, 'ack');
          const spyNack = jest.spyOn(mockChannel, 'nack');

          // eslint-disable-next-line @typescript-eslint/await-thenable
          await mockChannel.testOnMessage(consumeMessage);

          expect(spyAck).toHaveBeenCalledTimes(0);
          expect(spyNack).toHaveBeenCalledTimes(0);

          expect(spyHandler).toHaveBeenCalledTimes(1);
        });

        it('handleMessage as failed', async () => {
          spyHandler = spyHandler.mockImplementation(() => {
            throw new Error('Test error');
          });

          await server.listen(callback);
          const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
          await mockClient.testOnceEvents(RmqEventsMap.CONNECT);
          const mockChannelWrapper: MockChannelWrapper = mockClient['channelWrapper'] as unknown as MockChannelWrapper;
          const mockChannel: MockChannel = mockChannelWrapper.channel as unknown as MockChannel;
          await mockChannelWrapper.testSetup();

          const spyAck = jest.spyOn(mockChannel, 'ack');
          const spyNack = jest.spyOn(mockChannel, 'nack');

          // eslint-disable-next-line @typescript-eslint/await-thenable
          await mockChannel.testOnMessage(consumeMessage);

          expect(spyNack).toHaveBeenCalledTimes(1);
          expect(spyAck).toHaveBeenCalledTimes(0);

          expect(spyHandler).toHaveBeenCalledTimes(1);
        });

        it('handleMessage as Observable success', async () => {
          spyHandler = spyHandler.mockImplementation(() => {
            return new Observable((observer) => {
              observer.next(true);
              observer.complete();
            });
          });

          await server.listen(callback);
          const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
          await mockClient.testOnceEvents(RmqEventsMap.CONNECT);
          const mockChannelWrapper: MockChannelWrapper = mockClient['channelWrapper'] as unknown as MockChannelWrapper;
          const mockChannel: MockChannel = mockChannelWrapper.channel as unknown as MockChannel;
          await mockChannelWrapper.testSetup();

          const mockDeserializeMessage = {
            pattern: 'pattern',
            data: {
              content: 'content',
            },
          };

          jest.spyOn(server['deserializer'], 'deserialize').mockImplementation(() => mockDeserializeMessage);

          const spyAck = jest.spyOn(mockChannel, 'ack');
          const spyNack = jest.spyOn(mockChannel, 'nack');

          // eslint-disable-next-line @typescript-eslint/await-thenable
          await mockChannel.testOnMessage(consumeMessage);

          expect(spyAck).toHaveBeenCalledTimes(0);
          expect(spyNack).toHaveBeenCalledTimes(0);

          expect(spyHandler).toHaveBeenCalledTimes(1);
        });

        it('handleMessage as Observable failed', async () => {
          spyHandler = spyHandler.mockImplementation(() => {
            return new Observable((observer) => {
              observer.error(new Error('Test error'));
              observer.complete();
            });
          });

          await server.listen(callback);
          const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
          await mockClient.testOnceEvents(RmqEventsMap.CONNECT);
          const mockChannelWrapper: MockChannelWrapper = mockClient['channelWrapper'] as unknown as MockChannelWrapper;
          const mockChannel: MockChannel = mockChannelWrapper.channel as unknown as MockChannel;
          await mockChannelWrapper.testSetup();

          const spyAck = jest.spyOn(mockChannel, 'ack');
          const spyNack = jest.spyOn(mockChannel, 'nack');

          // eslint-disable-next-line @typescript-eslint/await-thenable
          await mockChannel.testOnMessage(consumeMessage);

          expect(spyNack).toHaveBeenCalledTimes(1);
          expect(spyAck).toHaveBeenCalledTimes(0);

          expect(spyHandler).toHaveBeenCalledTimes(1);
        });
      });

      describe('noAck is true', () => {
        beforeEach(async () => {
          server = new RabbitMqServer(
            {
              noAck: true,
              serverName,
              logTitle,
            },
            prometheusManager,
          );

          callback = jest.fn();
          spyHandler = jest.fn();
          extras = {
            serverName,
          };
          messageHandler = async (...args: unknown[]) => {
            return spyHandler(...args);
          };

          server.addHandler('pattern', messageHandler, true, extras);
        });

        it('handleEvent for undefined', async () => {
          const channel: Channel = new MockChannel() as unknown as Channel;

          const spyAck = jest.spyOn(channel, 'ack');
          const spyNack = jest.spyOn(channel, 'nack');

          const mockDeserializeMessage: IConsumerPacket = {
            pattern: 'pattern',
            data: {
              content: 'content',
            } as unknown as IRabbitMqConsumeMessage,
          };
          const deserializeOptions = {
            pattern: 'pattern',
            ...extras,
            consumer: {
              serverName,
              logTitle,
              ...extras.consumer,
              queue: faker.string.alpha(6),
              exchangeArguments: {},
              queueOptions: {},
            },
          };
          const rmqContext = new RabbitMqContext([
            consumeMessage,
            mockDeserializeMessage.data,
            channel,
            deserializeOptions,
          ]);

          await server.handleEvent('pattern-undefined', mockDeserializeMessage, rmqContext);

          expect(spyAck).toHaveBeenCalledTimes(0);
          expect(spyNack).toHaveBeenCalledTimes(0);
          expect(spyHandler).toHaveBeenCalledTimes(0);
        });

        it('handleMessage as skip', async () => {
          await server.listen(callback);
          const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
          await mockClient.testOnceEvents(RmqEventsMap.CONNECT);
          const mockChannelWrapper: MockChannelWrapper = mockClient['channelWrapper'] as unknown as MockChannelWrapper;
          const mockChannel: MockChannel = mockChannelWrapper.channel as unknown as MockChannel;
          await mockChannelWrapper.testSetup();

          const mockDeserializeMessage = {
            pattern: 'pattern',
            data: undefined,
          };

          jest.spyOn(server['deserializer'], 'deserialize').mockImplementation(() => mockDeserializeMessage);

          const spyAck = jest.spyOn(mockChannel, 'ack');
          const spyNack = jest.spyOn(mockChannel, 'nack');

          // eslint-disable-next-line @typescript-eslint/await-thenable
          await mockChannel.testOnMessage(consumeMessage);

          expect(spyAck).toHaveBeenCalledTimes(0);
          expect(spyNack).toHaveBeenCalledTimes(0);
          expect(spyHandler).toHaveBeenCalledTimes(0);
        });

        it('handleMessage as success', async () => {
          await server.listen(callback);
          const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
          await mockClient.testOnceEvents(RmqEventsMap.CONNECT);
          const mockChannelWrapper: MockChannelWrapper = mockClient['channelWrapper'] as unknown as MockChannelWrapper;
          const mockChannel: MockChannel = mockChannelWrapper.channel as unknown as MockChannel;
          await mockChannelWrapper.testSetup();

          const mockDeserializeMessage = {
            pattern: 'pattern',
            data: {
              content: 'content',
            },
          };

          jest.spyOn(server['deserializer'], 'deserialize').mockImplementation(() => mockDeserializeMessage);

          const spyAck = jest.spyOn(mockChannel, 'ack');
          const spyNack = jest.spyOn(mockChannel, 'nack');

          // eslint-disable-next-line @typescript-eslint/await-thenable
          await mockChannel.testOnMessage(consumeMessage);

          expect(spyAck).toHaveBeenCalledTimes(0);
          expect(spyNack).toHaveBeenCalledTimes(0);

          expect(spyHandler).toHaveBeenCalledTimes(1);
        });

        it('handleMessage as failed', async () => {
          spyHandler = spyHandler.mockImplementation(() => {
            throw new Error('Test error');
          });

          await server.listen(callback);
          const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
          await mockClient.testOnceEvents(RmqEventsMap.CONNECT);
          const mockChannelWrapper: MockChannelWrapper = mockClient['channelWrapper'] as unknown as MockChannelWrapper;
          const mockChannel: MockChannel = mockChannelWrapper.channel as unknown as MockChannel;
          await mockChannelWrapper.testSetup();

          const spyAck = jest.spyOn(mockChannel, 'ack');
          const spyNack = jest.spyOn(mockChannel, 'nack');

          // eslint-disable-next-line @typescript-eslint/await-thenable
          await mockChannel.testOnMessage(consumeMessage);

          expect(spyNack).toHaveBeenCalledTimes(0);
          expect(spyAck).toHaveBeenCalledTimes(0);

          expect(spyHandler).toHaveBeenCalledTimes(1);
        });

        it('handleMessage as Observable success', async () => {
          spyHandler = spyHandler.mockImplementation(() => {
            return new Observable((observer) => {
              observer.next(true);
              observer.complete();
            });
          });

          await server.listen(callback);
          const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
          await mockClient.testOnceEvents(RmqEventsMap.CONNECT);
          const mockChannelWrapper: MockChannelWrapper = mockClient['channelWrapper'] as unknown as MockChannelWrapper;
          const mockChannel: MockChannel = mockChannelWrapper.channel as unknown as MockChannel;
          await mockChannelWrapper.testSetup();

          const mockDeserializeMessage = {
            pattern: 'pattern',
            data: {
              content: 'content',
            },
          };

          jest.spyOn(server['deserializer'], 'deserialize').mockImplementation(() => mockDeserializeMessage);

          const spyAck = jest.spyOn(mockChannel, 'ack');
          const spyNack = jest.spyOn(mockChannel, 'nack');

          // eslint-disable-next-line @typescript-eslint/await-thenable
          await mockChannel.testOnMessage(consumeMessage);

          expect(spyAck).toHaveBeenCalledTimes(0);
          expect(spyNack).toHaveBeenCalledTimes(0);

          expect(spyHandler).toHaveBeenCalledTimes(1);
        });

        it('handleMessage as Observable failed', async () => {
          spyHandler = spyHandler.mockImplementation(() => {
            return new Observable((observer) => {
              observer.error(new Error('Test error'));
              observer.complete();
            });
          });

          await server.listen(callback);
          const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
          await mockClient.testOnceEvents(RmqEventsMap.CONNECT);
          const mockChannelWrapper: MockChannelWrapper = mockClient['channelWrapper'] as unknown as MockChannelWrapper;
          const mockChannel: MockChannel = mockChannelWrapper.channel as unknown as MockChannel;
          await mockChannelWrapper.testSetup();

          const spyAck = jest.spyOn(mockChannel, 'ack');
          const spyNack = jest.spyOn(mockChannel, 'nack');

          // eslint-disable-next-line @typescript-eslint/await-thenable
          await mockChannel.testOnMessage(consumeMessage);

          expect(spyNack).toHaveBeenCalledTimes(0);
          expect(spyAck).toHaveBeenCalledTimes(0);

          expect(spyHandler).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('server start as success with routing', () => {
      describe('routing as array', () => {
        beforeEach(async () => {
          server = new RabbitMqServer(
            {
              serverName,
              logTitle,
            },
            prometheusManager,
          );

          callback = jest.fn();
          spyHandler = jest.fn();
          extras = {
            serverName,
            consumer: {
              exchange: 'exchange',
              routing: ['info'],
            },
          };
          messageHandler = async (...args: unknown[]) => {
            return spyHandler(...args);
          };

          server.addHandler('pattern', messageHandler, true, extras);
        });

        it('setupChannel', async () => {
          await server.listen(callback);
          const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
          await mockClient.testOnceEvents(RmqEventsMap.CONNECT);

          const mockChannelWrapper: MockChannelWrapper = mockClient['channelWrapper'] as unknown as MockChannelWrapper;
          const mockChannel: MockChannel = mockChannelWrapper.channel as unknown as MockChannel;

          const spyAssertQueue = jest.spyOn(mockChannel, 'assertQueue');
          const spyAssertExchange = jest.spyOn(mockChannel, 'assertExchange');
          const spyBindQueue = jest.spyOn(mockChannel, 'bindQueue');
          const spyPrefetch = jest.spyOn(mockChannel, 'prefetch');
          const spyConsume = jest.spyOn(mockChannel, 'consume');

          await mockChannelWrapper.testSetup();

          expect(spyAssertQueue).toHaveBeenCalledTimes(1);
          expect(spyAssertExchange).toHaveBeenCalledTimes(1);
          expect(spyBindQueue).toHaveBeenCalledTimes(1);
          expect(spyPrefetch).toHaveBeenCalledTimes(1);
          expect(spyConsume).toHaveBeenCalledTimes(1);

          expect(server.getConsumersInfo()).toEqual(
            new Map<string, any>([['pattern', { queue: mockChannel.queue, exchange: 'exchange', routing: ['info'] }]]),
          );
        });
      });

      describe('routing as string', () => {
        beforeEach(async () => {
          server = new RabbitMqServer(
            {
              serverName,
              logTitle,
            },
            prometheusManager,
          );

          callback = jest.fn();
          spyHandler = jest.fn();
          extras = {
            serverName,
            consumer: {
              exchange: 'exchange',
              routing: 'info',
            },
          };
          messageHandler = async (...args: unknown[]) => {
            return spyHandler(...args);
          };

          server.addHandler('pattern', messageHandler, true, extras);
        });

        it('setupChannel', async () => {
          await server.listen(callback);
          const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
          await mockClient.testOnceEvents(RmqEventsMap.CONNECT);

          const mockChannelWrapper: MockChannelWrapper = mockClient['channelWrapper'] as unknown as MockChannelWrapper;
          const mockChannel: MockChannel = mockChannelWrapper.channel as unknown as MockChannel;

          const spyAssertQueue = jest.spyOn(mockChannel, 'assertQueue');
          const spyAssertExchange = jest.spyOn(mockChannel, 'assertExchange');
          const spyBindQueue = jest.spyOn(mockChannel, 'bindQueue');
          const spyPrefetch = jest.spyOn(mockChannel, 'prefetch');
          const spyConsume = jest.spyOn(mockChannel, 'consume');

          await mockChannelWrapper.testSetup();

          expect(spyAssertQueue).toHaveBeenCalledTimes(1);
          expect(spyAssertExchange).toHaveBeenCalledTimes(1);
          expect(spyBindQueue).toHaveBeenCalledTimes(1);
          expect(spyPrefetch).toHaveBeenCalledTimes(1);
          expect(spyConsume).toHaveBeenCalledTimes(1);

          expect(server.getConsumersInfo()).toEqual(
            new Map<string, any>([['pattern', { queue: mockChannel.queue, exchange: 'exchange', routing: ['info'] }]]),
          );
        });
      });

      describe('default routing', () => {
        beforeEach(async () => {
          server = new RabbitMqServer(
            {
              serverName,
              logTitle,
            },
            prometheusManager,
          );

          callback = jest.fn();
          spyHandler = jest.fn();
          extras = {
            serverName,
            consumer: {
              exchange: 'exchange',
            },
          };
          messageHandler = async (...args: unknown[]) => {
            return spyHandler(...args);
          };

          server.addHandler('pattern', messageHandler, true, extras);
        });

        it('setupChannel', async () => {
          await server.listen(callback);
          const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
          await mockClient.testOnceEvents(RmqEventsMap.CONNECT);

          const mockChannelWrapper: MockChannelWrapper = mockClient['channelWrapper'] as unknown as MockChannelWrapper;
          const mockChannel: MockChannel = mockChannelWrapper.channel as unknown as MockChannel;

          const spyAssertQueue = jest.spyOn(mockChannel, 'assertQueue');
          const spyAssertExchange = jest.spyOn(mockChannel, 'assertExchange');
          const spyBindQueue = jest.spyOn(mockChannel, 'bindQueue');
          const spyPrefetch = jest.spyOn(mockChannel, 'prefetch');
          const spyConsume = jest.spyOn(mockChannel, 'consume');

          await mockChannelWrapper.testSetup();

          expect(spyAssertQueue).toHaveBeenCalledTimes(1);
          expect(spyAssertExchange).toHaveBeenCalledTimes(1);
          expect(spyBindQueue).toHaveBeenCalledTimes(1);
          expect(spyPrefetch).toHaveBeenCalledTimes(1);
          expect(spyConsume).toHaveBeenCalledTimes(1);

          expect(server.getConsumersInfo()).toEqual(
            new Map<string, any>([['pattern', { queue: mockChannel.queue, exchange: 'exchange', routing: [''] }]]),
          );
        });
      });
    });

    describe('default server start as failed', () => {
      let crashError;

      beforeEach(async () => {
        server = new RabbitMqServer(
          {
            maxConnectionAttempts: 2,
            serverName,
            logTitle,
          },
          prometheusManager,
        );

        crashError = new Error('Test error');
        callback = jest.fn();
        spyHandler = jest.fn();
        extras = {
          serverName,
        };
        messageHandler = async (...args: unknown[]) => {
          return spyHandler(...args);
        };

        server.addHandler('pattern', messageHandler, true, extras);
      });

      it('runConsumers', async () => {
        await server.listen(callback);

        const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;
        jest.spyOn(mockClient, 'createChannel').mockImplementation(() => {
          throw crashError;
        });

        await mockClient.testOnceEvents(RmqEventsMap.CONNECT);

        expect(callback).toHaveBeenCalledWith(crashError);
      });

      it('callback for server.on()', async () => {
        const spy = jest.fn();
        const spyCounterIncrement = jest.spyOn(prometheusManager.counter(), 'increment');
        const subscription = server.status.pipe(tap(spy)).subscribe();
        await server.listen(callback);

        server['connectionAttempts'] = 1;

        const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;

        await mockClient.testEvents(RmqEventsMap.CONNECT);
        await mockClient.testEvents(RmqEventsMap.DISCONNECT);
        await mockClient.testEvents(RmqEventsMap.DISCONNECT, { err: crashError });

        expect(server['connectionAttempts']).toBe(0);

        expect(spy).toHaveReturnedTimes(3);
        expect(spy).toHaveBeenCalledWith(RmqStatus.CONNECTED);
        expect(spy).toHaveBeenCalledWith(RmqStatus.DISCONNECTED);
        expect(spy).toHaveBeenCalledWith(RmqStatus.CRASHED);

        expect(spyCounterIncrement).toHaveReturnedTimes(4);
        expect(spyCounterIncrement).toHaveBeenCalledWith(RABBIT_MQ_SERVER_CONNECTION_STATUS, {
          labels: {
            service: serverName,
            status: RmqStatus.CONNECTED,
          },
        });
        expect(spyCounterIncrement).toHaveBeenCalledWith(RABBIT_MQ_SERVER_CONNECTION_STATUS, {
          labels: {
            service: serverName,
            status: RmqStatus.DISCONNECTED,
          },
        });
        expect(spyCounterIncrement).toHaveBeenCalledWith(RABBIT_MQ_SERVER_CONNECTION_STATUS, {
          labels: {
            service: serverName,
            status: RmqStatus.CRASHED,
          },
        });

        expect(spyCounterIncrement).toHaveBeenCalledWith(RABBIT_MQ_SERVER_CONNECTION_FAILED, {
          labels: {
            service: serverName,
            errorType: 'Error',
          },
        });

        subscription.unsubscribe();
      });

      it('connectFailed as success', async () => {
        const spy = jest.fn();
        const spyCounterIncrement = jest.spyOn(prometheusManager.counter(), 'increment');
        const subscription = server.status.pipe(tap(spy)).subscribe();
        await server.listen(callback);

        const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;

        await mockClient.testOnceEvents('connectFailed');

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(new Error('Disconnected from RMQ.'));

        expect(spy).toHaveReturnedTimes(1);
        expect(spy).toHaveBeenCalledWith(RmqStatus.DISCONNECTED);

        expect(spyCounterIncrement).toHaveReturnedTimes(1);
        expect(spyCounterIncrement).toHaveBeenCalledWith(RABBIT_MQ_SERVER_CONNECTION_STATUS, {
          labels: {
            service: serverName,
            status: RmqStatus.DISCONNECTED,
          },
        });

        subscription.unsubscribe();
      });

      it('connectFailed as crash retry', async () => {
        const spy = jest.fn();
        const spyClose = jest.spyOn(server, 'close');
        const spyCounterIncrement = jest.spyOn(prometheusManager.counter(), 'increment');

        const subscription = server.status.pipe(tap(spy)).subscribe();
        await server.listen(callback);

        const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;

        await mockClient.testOnceEvents('connectFailed', { err: crashError });

        expect(callback).toHaveBeenCalledTimes(0);
        expect(spyClose).toHaveReturnedTimes(0);

        await mockClient.testOnceEvents('connectFailed', { err: crashError });

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(crashError);

        expect(spyClose).toHaveReturnedTimes(1);

        expect(spy).toHaveReturnedTimes(1);
        expect(spy).toHaveBeenCalledWith(RmqStatus.CRASHED);

        expect(spyCounterIncrement).toHaveReturnedTimes(4);
        expect(spyCounterIncrement).toHaveBeenCalledWith(RABBIT_MQ_SERVER_CONNECTION_STATUS, {
          labels: {
            service: serverName,
            status: RmqStatus.CRASHED,
          },
        });
        expect(spyCounterIncrement).toHaveBeenCalledWith(RABBIT_MQ_SERVER_CONNECTION_FAILED, {
          labels: {
            service: serverName,
            errorType: 'Error',
          },
        });

        subscription.unsubscribe();
      });

      it('connectFailed as crash skip maxConnectionAttempts', async () => {
        const spy = jest.fn();
        const spyClose = jest.spyOn(server, 'close');
        const spyCounterIncrement = jest.spyOn(prometheusManager.counter(), 'increment');

        server['options'].maxConnectionAttempts = -1;

        const subscription = server.status.pipe(tap(spy)).subscribe();
        await server.listen(callback);

        const mockClient: MockAmqpConnectionManager = server['client'] as unknown as MockAmqpConnectionManager;

        await mockClient.testOnceEvents('connectFailed', { err: crashError });

        expect(callback).toHaveBeenCalledTimes(0);
        expect(spyClose).toHaveReturnedTimes(0);

        await mockClient.testOnceEvents('connectFailed', { err: crashError });

        expect(callback).toHaveBeenCalledTimes(0);
        expect(spyClose).toHaveReturnedTimes(0);

        expect(spy).toHaveReturnedTimes(1);
        expect(spy).toHaveBeenCalledWith(RmqStatus.CRASHED);

        expect(spyCounterIncrement).toHaveReturnedTimes(4);
        expect(spyCounterIncrement).toHaveBeenCalledWith(RABBIT_MQ_SERVER_CONNECTION_STATUS, {
          labels: {
            service: serverName,
            status: RmqStatus.CRASHED,
          },
        });
        expect(spyCounterIncrement).toHaveBeenCalledWith(RABBIT_MQ_SERVER_CONNECTION_FAILED, {
          labels: {
            service: serverName,
            errorType: 'Error',
          },
        });

        subscription.unsubscribe();

        subscription.unsubscribe();
      });
    });
  });
});
