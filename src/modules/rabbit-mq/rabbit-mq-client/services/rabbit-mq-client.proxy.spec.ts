import { firstValueFrom } from 'rxjs';
import { AmqpConnectionManager } from 'amqp-connection-manager';
import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  RQM_DEFAULT_NO_ASSERT,
  RQM_DEFAULT_PERSISTENT,
  RQM_DEFAULT_QUEUE,
  RQM_DEFAULT_QUEUE_OPTIONS,
  RQM_DEFAULT_URL,
} from '@nestjs/microservices/constants';
import { RmqEventsMap } from '@nestjs/microservices/events/rmq.events';
import { InvalidMessageException } from '@nestjs/microservices/errors/invalid-message.exception';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ElkLoggerModule,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
  TraceSpanBuilder,
} from 'src/modules/elk-logger';
import {
  IRabbitMqAsyncContext,
  IRabbitMqProducerMessage,
  IRabbitMqPublishOptionsBuilder,
  RabbitMqAsyncContext,
  RabbitMqError,
  RabbitMqFormatterHelper,
  RabbitMqPublishOptionsBuilder,
  RabbitMqServerBuilder,
  IRMQErrorInfo,
} from 'src/modules/rabbit-mq/rabbit-mq-common';
import { MockAmqpConnectionManager, MockChannel, MockChannelWrapper } from 'tests/amqp-connection-manager';
import { MockConfigService } from 'tests/nestjs';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { MockProducerSerializer, MockRabbitMqPublishOptionsBuilder } from 'tests/modules/rabbit-mq';
import { IProducerSerializer, IRabbitMqSendOptions } from '../types/types';
import { RabbitMqClientProxy } from './rabbit-mq-client.proxy';
import { ProducerSerializer } from '../adapters/producer.serializer';

const formatRabbitMqError = (error?: Error | unknown) => {
  if (typeof error === 'object') {
    return {
      isRabbitMqError: error && error instanceof RabbitMqError,
      name: error && 'name' in error ? error['name'] : undefined,
      message: error && 'message' in error ? error['message'] : undefined,
      cause: error && 'cause' in error ? (error['cause'] as { toString(): string })?.toString() : undefined,
      data: error && 'data' in error ? error['data'] : undefined,
    };
  }

  return error;
};

describe(RabbitMqClientProxy.name, () => {
  let mockClient: AmqpConnectionManager;
  let mockConnect: () => AmqpConnectionManager;
  let serverName: string;
  let error: Error;
  let errorInfo: IRMQErrorInfo;
  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let publishOptionsBuilder: IRabbitMqPublishOptionsBuilder;
  let serializer: IProducerSerializer;
  let clientProxy: RabbitMqClientProxy;

  let spyLogBuilder: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();

    logger = new MockElkLoggerService();
    serverName = faker.string.alpha(4);

    const module = await Test.createTestingModule({
      imports: [ConfigModule, ElkLoggerModule.forRoot()],
    })
      .overrideProvider(ConfigService)
      .useValue(new MockConfigService())
      .overrideProvider(ELK_LOGGER_SERVICE_BUILDER_DI)
      .useValue({
        build: () => logger,
      })
      .compile();

    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);
    serializer = new MockProducerSerializer();
    publishOptionsBuilder = new MockRabbitMqPublishOptionsBuilder();

    spyLogBuilder = jest.spyOn(loggerBuilder, 'build');

    mockClient = new MockAmqpConnectionManager();
    mockConnect = () => mockClient;

    error = new Error('Test Error');

    errorInfo = {
      url: 'rmq://rabbitmq:60/path',
      err: error,
    };

    jest.spyOn(RabbitMqServerBuilder, 'build').mockImplementation(() => mockConnect());
  });

  describe('init', () => {
    it('default', async () => {
      clientProxy = new RabbitMqClientProxy(
        {
          serverName,
          producer: {},
        },
        loggerBuilder,
      );

      expect(clientProxy['serverName']).toBe(serverName);
      expect(spyLogBuilder).toHaveBeenCalledWith({ module: 'RabbitMqClientProxy' });
      expect(clientProxy['options']).toEqual({
        urls: [RQM_DEFAULT_URL],
        noAssert: RQM_DEFAULT_NO_ASSERT,
        queue: RQM_DEFAULT_QUEUE,
        queueOptions: {
          ...RQM_DEFAULT_QUEUE_OPTIONS,
        },
        routing: [''],
        exchangeArguments: {},
        exchangeType: 'topic',
        publishOptions: {
          persistent: RQM_DEFAULT_PERSISTENT,
          headers: {},
        },
        publishOptionsBuilderOptions: {
          skip: false,
        },
      });
      expect(clientProxy['serializer'] instanceof ProducerSerializer).toBeTruthy();
      expect(clientProxy['publishOptionsBuilder'] instanceof RabbitMqPublishOptionsBuilder).toBeTruthy();
    });

    it('custom', async () => {
      clientProxy = new RabbitMqClientProxy(
        {
          serverName,
          producer: {
            urls: ['rabbitMq'],
            noAssert: true,
            queue: 'queue',
            queueOptions: {
              durable: true,
            },
            exchangeType: 'fanout',
            exchangeArguments: {
              exchangeArgument: 'exchangeArgument',
            },
            publishOptions: {
              messageId: 'messageId',
              persistent: true,
              headers: {
                'x-header': 'header',
              },
            },
            publishOptionsBuilderOptions: {
              useZipkin: true,
              skip: true,
            },
            routing: 'routing',
            serializer,
            publishOptionsBuilder,
          },
        },
        loggerBuilder,
      );

      expect(clientProxy['serverName']).toBe(serverName);
      expect(spyLogBuilder).toHaveBeenCalledWith({ module: 'RabbitMqClientProxy' });
      expect(clientProxy['options']).toEqual({
        urls: ['rabbitMq'],
        noAssert: true,
        queue: 'queue',
        queueOptions: {
          durable: true,
        },
        exchangeType: 'fanout',
        exchangeArguments: {
          exchangeArgument: 'exchangeArgument',
        },
        publishOptions: {
          messageId: 'messageId',
          persistent: true,
          headers: {
            'x-header': 'header',
          },
        },
        publishOptionsBuilderOptions: {
          useZipkin: true,
          skip: true,
        },
        routing: ['routing'],
        serializer,
        publishOptionsBuilder,
      });
      expect(clientProxy['serializer'] instanceof MockProducerSerializer).toBeTruthy();
      expect(clientProxy['publishOptionsBuilder'] instanceof MockRabbitMqPublishOptionsBuilder).toBeTruthy();
    });
  });

  describe('base methods', () => {
    beforeEach(async () => {
      clientProxy = new RabbitMqClientProxy(
        {
          serverName,
          producer: {
            urls: ['rmq://rabbitmq:60/path'],
            noAssert: true,
            queueOptions: {
              durable: true,
            },
            exchangeArguments: {
              exchangeArgument: 'exchangeArgument',
            },
          },
        },
        loggerBuilder,
      );
    });

    it('getServerName', async () => {
      expect(clientProxy.getServerName()).toBe(serverName);
    });

    it('on', async () => {
      const callback = jest.fn();
      const spyAddListener = jest.spyOn(mockClient, 'addListener');

      clientProxy.on('connect', callback);

      clientProxy['client'] = mockClient;

      clientProxy.on('connect', callback);

      expect(clientProxy['pendingEventListeners']).toEqual([{ event: 'connect', callback }]);
      expect(spyAddListener).toHaveBeenCalledWith('connect', callback);
    });

    it('connect failed with error', async () => {
      let crashError;

      const callback = jest.fn();
      const spyLogError = jest.spyOn(logger, 'error');
      const spyLogWarn = jest.spyOn(logger, 'warn');

      // Тест возникновения ошибки подключения: on(RmqEventsMap.ERROR)
      jest.clearAllMocks();
      crashError = undefined;
      clientProxy.on(RmqEventsMap.ERROR, callback);
      clientProxy.connect().catch((err) => {
        crashError = err;
      });

      expect(clientProxy['client']).toEqual(mockClient);

      await (mockClient as MockAmqpConnectionManager).testEvents(RmqEventsMap.ERROR, errorInfo);

      expect(callback).toHaveBeenCalledWith(errorInfo);
      expect(spyLogError).toHaveBeenCalledWith('RMQ connection failed.', {
        payload: { error: RabbitMqFormatterHelper.errorInfoFormat(errorInfo) },
      });
      expect(spyLogWarn).toHaveBeenCalledTimes(0);
      expect(formatRabbitMqError(crashError)).toEqual(
        formatRabbitMqError(RabbitMqError.buildFromRMQErrorInfo(serverName, RmqEventsMap.ERROR, errorInfo)),
      );

      // Тест потери соединения with isInitialConnect = true: on(RmqEventsMap.DISCONNECT)
      jest.clearAllMocks();
      crashError = undefined;
      await clientProxy.close();
      clientProxy.connect().catch((err) => {
        crashError = err;
      });

      await (mockClient as MockAmqpConnectionManager).testEvents(RmqEventsMap.DISCONNECT, errorInfo);
      expect(spyLogWarn).toHaveBeenCalledWith('RMQ disconnected. Trying to reconnect.', {
        payload: { error: RabbitMqFormatterHelper.errorInfoFormat(errorInfo) },
      });
      expect(spyLogError).toHaveBeenCalledTimes(0);
      expect(formatRabbitMqError(crashError)).toEqual(
        formatRabbitMqError(RabbitMqError.buildFromRMQErrorInfo(serverName, RmqEventsMap.DISCONNECT, errorInfo)),
      );

      // Тест потери соединения with isInitialConnect = false: on(RmqEventsMap.DISCONNECT)
      jest.clearAllMocks();
      crashError = undefined;
      await clientProxy.close();
      clientProxy['isInitialConnect'] = false;
      clientProxy.connect().catch((err) => {
        crashError = err;
      });

      await (mockClient as MockAmqpConnectionManager).testEvents(RmqEventsMap.DISCONNECT, errorInfo);
      expect(spyLogWarn).toHaveBeenCalledWith('RMQ disconnected. Trying to reconnect.', {
        payload: { error: RabbitMqFormatterHelper.errorInfoFormat(errorInfo) },
      });
      expect(spyLogError).toHaveBeenCalledTimes(0);
      expect(formatRabbitMqError(crashError)).toEqual(
        formatRabbitMqError(RabbitMqError.buildFromRMQErrorInfo(serverName, RmqEventsMap.DISCONNECT, errorInfo)),
      );

      // Тест ошибки установки подключения with not last url: on(connectFailed)
      jest.clearAllMocks();
      crashError = undefined;
      await clientProxy.close();
      clientProxy.connect().catch((err) => {
        crashError = err;
      });

      await (mockClient as MockAmqpConnectionManager).testEvents('connectFailed', { ...errorInfo, url: 'rabbitmq' });
      expect(spyLogWarn).toHaveBeenCalledTimes(0);
      expect(spyLogError).toHaveBeenCalledTimes(0);
      expect(crashError).toBeUndefined();

      // Тест ошибки установки подключения for last url: on(connectFailed)
      jest.clearAllMocks();
      crashError = undefined;
      await clientProxy.close();
      clientProxy.connect().catch((err) => {
        crashError = err;
      });

      await (mockClient as MockAmqpConnectionManager).testEvents('connectFailed', errorInfo);
      expect(spyLogWarn).toHaveBeenCalledTimes(0);
      expect(spyLogError).toHaveBeenCalledTimes(0);
      expect(formatRabbitMqError(crashError)).toEqual(
        formatRabbitMqError(RabbitMqError.buildFromRMQErrorInfo(serverName, 'connectFailed', errorInfo)),
      );
    });

    it('connect success', async () => {
      let crashError;

      const spyLogDebug = jest.spyOn(logger, 'debug');

      const spyCreateChannel = jest.spyOn(mockClient, 'createChannel');

      jest.clearAllMocks();
      crashError = undefined;
      clientProxy.connect().catch((err) => {
        crashError = err;
      });

      expect(clientProxy['client']).toEqual(mockClient);

      await (mockClient as MockAmqpConnectionManager).testEvents(RmqEventsMap.CONNECT);

      expect(spyLogDebug).toHaveBeenCalledWith('RMQ connection success');
      expect(crashError).toBeUndefined();
      expect(clientProxy['isInitialConnect']).toBeFalsy();
      expect(spyCreateChannel).toHaveBeenCalled();
      expect(clientProxy['channel']).toBeDefined();

      const mockChannelWrapper: MockChannelWrapper = (mockClient as unknown as Record<string, unknown>)[
        'channelWrapper'
      ] as MockChannelWrapper;
      const mockChannel: MockChannel = mockChannelWrapper.channel as unknown as MockChannel;

      const spyAssertQueue = jest.spyOn(mockChannel, 'assertQueue');
      const spyAssertExchange = jest.spyOn(mockChannel, 'assertExchange');
      const spyBindQueue = jest.spyOn(mockChannel, 'bindQueue');
      const spyPrefetch = jest.spyOn(mockChannel, 'prefetch');
      const spyConsume = jest.spyOn(mockChannel, 'consume');

      // skip setupChannel for noAssert=true
      jest.clearAllMocks();
      await mockChannelWrapper.testSetup();

      expect(spyAssertQueue).toHaveBeenCalledTimes(0);
      expect(spyAssertExchange).toHaveBeenCalledTimes(0);
      expect(spyBindQueue).toHaveBeenCalledTimes(0);
      expect(spyPrefetch).toHaveBeenCalledTimes(0);
      expect(spyConsume).toHaveBeenCalledTimes(0);
      expect(crashError).toBeUndefined();

      // skip setupChannel for default queue: не инициализируем очередь по умолчанию.
      jest.clearAllMocks();
      clientProxy['options'].noAssert = false;
      await mockChannelWrapper.testSetup();

      expect(spyAssertQueue).toHaveBeenCalledTimes(0);
      expect(spyAssertExchange).toHaveBeenCalledTimes(0);
      expect(spyBindQueue).toHaveBeenCalledTimes(0);
      expect(spyPrefetch).toHaveBeenCalledTimes(0);
      expect(spyConsume).toHaveBeenCalledTimes(0);

      // initialize queue
      jest.clearAllMocks();
      const queue = faker.string.alpha(6);

      clientProxy['options'].queue = queue;
      await mockChannelWrapper.testSetup();

      expect(spyAssertQueue).toHaveBeenCalledWith(queue, clientProxy['options'].queueOptions);
      expect(spyAssertExchange).toHaveBeenCalledTimes(0);
      expect(spyBindQueue).toHaveBeenCalledTimes(0);
      expect(spyPrefetch).toHaveBeenCalledTimes(0);
      expect(spyConsume).toHaveBeenCalledTimes(0);

      // initialize exchange
      jest.clearAllMocks();
      const exchange = faker.string.alpha(6);

      clientProxy['options'].queue = '';
      clientProxy['options'].exchange = exchange;
      await mockChannelWrapper.testSetup();

      expect(spyAssertQueue).toHaveBeenCalledTimes(0);
      expect(spyAssertExchange).toHaveBeenCalledWith(exchange, clientProxy['options'].exchangeType, {
        durable: true,
        arguments: clientProxy['options'].exchangeArguments,
      });
      expect(spyBindQueue).toHaveBeenCalledTimes(0);
      expect(spyPrefetch).toHaveBeenCalledTimes(0);
      expect(spyConsume).toHaveBeenCalledTimes(0);

      // initialize queue and exchange
      jest.clearAllMocks();

      clientProxy['options'].queue = queue;
      clientProxy['options'].exchange = exchange;
      await mockChannelWrapper.testSetup();

      expect(spyAssertQueue).toHaveBeenCalledWith(queue, clientProxy['options'].queueOptions);
      expect(spyAssertExchange).toHaveBeenCalledWith(exchange, clientProxy['options'].exchangeType, {
        durable: true,
        arguments: clientProxy['options'].exchangeArguments,
      });
      expect(spyBindQueue).toHaveBeenCalledTimes(1);
      expect(spyBindQueue).toHaveBeenCalledWith(queue, exchange, '');
      expect(spyPrefetch).toHaveBeenCalledTimes(0);
      expect(spyConsume).toHaveBeenCalledTimes(0);
    });
  });

  describe('send', () => {
    let request: IRabbitMqProducerMessage;
    let options: IRabbitMqSendOptions;
    let asyncContext: IRabbitMqAsyncContext;

    beforeEach(async () => {
      clientProxy = new RabbitMqClientProxy(
        {
          serverName,
          producer: {
            noAssert: true,
            publishOptions: {
              messageId: 'messageId',
              persistent: true,
              headers: {
                'x-header': 'header',
              },
            },
            publishOptionsBuilderOptions: {
              useZipkin: true,
              skip: true,
            },
            serializerOption: {
              format: 'string',
            },
          },
        },
        loggerBuilder,
      );

      request = {
        content: faker.string.alpha(15),
        publishOptions: {
          replyTo: faker.string.alpha(7),
        },
      };

      options = {
        serializerOption: {},
        publishOptionsBuilderOptions: {
          skip: false,
        },
      };
      asyncContext = {
        ...TraceSpanBuilder.build(),
        correlationId: faker.string.uuid(),
      };
    });

    it('invalid request', async () => {
      let error;
      try {
        await firstValueFrom(clientProxy.send(undefined as unknown as IRabbitMqProducerMessage, options));
      } catch (err) {
        error = err;
      }
      expect(error instanceof InvalidMessageException).toBeTruthy();

      error = undefined;
      try {
        await firstValueFrom(clientProxy.send(request, options));
      } catch (err) {
        error = err;
      }
      expect(error instanceof InvalidMessageException).toBeTruthy();

      error = undefined;
      try {
        await firstValueFrom(
          clientProxy.send(
            {
              ...request,
              queue: '',
            },
            options,
          ),
        );
      } catch (err) {
        error = err;
      }
      expect(error instanceof InvalidMessageException).toBeTruthy();
    });

    describe('default', () => {
      it('sendToQueue as success', async () => {
        jest.useFakeTimers();

        request.queue = faker.string.alpha(8);

        const mockChannelWrapper: MockChannelWrapper = (mockClient as unknown as Record<string, unknown>)[
          'channelWrapper'
        ] as MockChannelWrapper;
        const spyPublish = jest.spyOn(mockChannelWrapper, 'publish');
        const spySendToQueue = jest.spyOn(mockChannelWrapper, 'sendToQueue');
        const spySerialize = jest.spyOn(clientProxy['serializer'], 'serialize').mockImplementation(() => {
          return {
            ...request,
            content: 'serialized',
          };
        });
        const spyPublishOptionsBuilder = jest
          .spyOn(clientProxy['publishOptionsBuilder'], 'build')
          .mockImplementation(() => {
            return {
              correlationId: 'correlation-id',
            };
          });

        jest.clearAllMocks();

        setTimeout(() => {
          (mockClient as MockAmqpConnectionManager).testEvents(RmqEventsMap.CONNECT);
        }, 50);

        setTimeout(() => {
          mockChannelWrapper.testSetup();
        }, 100);

        let err;
        const result = RabbitMqAsyncContext.instance.runWithContextAsync(
          () => firstValueFrom(clientProxy.send(request, options)).catch((e) => (err = e)),
          asyncContext,
        );

        await jest.advanceTimersByTimeAsync(100);
        jest.useRealTimers();

        expect(await result).toBeTruthy();
        expect(err).toBeUndefined();
        expect(spySerialize).toHaveBeenCalledTimes(1);
        expect(spySerialize).toHaveBeenCalledWith(request, { serverName, ...clientProxy['options'].serializerOption });
        expect(spyPublishOptionsBuilder).toHaveBeenCalledTimes(1);
        expect(spyPublishOptionsBuilder).toHaveBeenCalledWith(
          {
            asyncContext,
            publishOptions: {
              ...clientProxy['options'].publishOptions,
              ...request.publishOptions,
              headers: {
                ...clientProxy['options'].publishOptions.headers,
                ...request.publishOptions?.headers,
              },
            },
          },
          {
            ...clientProxy['options'].publishOptionsBuilderOptions,
            ...options.publishOptionsBuilderOptions,
          },
        );

        expect(spyPublish).toHaveBeenCalledTimes(0);
        expect(spySendToQueue).toHaveBeenCalledTimes(1);
        expect(spySendToQueue).toHaveBeenCalledWith(
          request.queue,
          'serialized',
          { correlationId: 'correlation-id' },
          spySendToQueue.mock.calls[0][3],
        );
      });

      it('sendToQueue as failed', async () => {
        jest.useFakeTimers();
        request.queue = faker.string.alpha(8);

        const crashError = new Error('Send error');

        const mockChannelWrapper: MockChannelWrapper = (mockClient as unknown as Record<string, unknown>)[
          'channelWrapper'
        ] as MockChannelWrapper;
        const spyPublish = jest.spyOn(mockChannelWrapper, 'publish');
        const spySendToQueue = jest.spyOn(mockChannelWrapper, 'sendToQueue');
        const spySerialize = jest.spyOn(clientProxy['serializer'], 'serialize').mockImplementation(() => {
          return {
            ...request,
            content: 'serialized',
          };
        });
        const spyPublishOptionsBuilder = jest
          .spyOn(clientProxy['publishOptionsBuilder'], 'build')
          .mockImplementation(() => {
            return {
              correlationId: 'correlation-id',
            };
          });

        jest.spyOn(mockChannelWrapper.channel, 'sendToQueue').mockImplementation(async () => {
          throw crashError;
        });

        jest.clearAllMocks();

        setTimeout(() => {
          (mockClient as MockAmqpConnectionManager).testEvents(RmqEventsMap.CONNECT);
        }, 50);

        setTimeout(() => {
          mockChannelWrapper.testSetup();
        }, 100);

        let err;

        RabbitMqAsyncContext.instance.runWithContextAsync(
          () => firstValueFrom(clientProxy.send(request, options)).catch((e) => (err = e)),
          asyncContext,
        );

        await jest.advanceTimersByTimeAsync(100);
        jest.useRealTimers();

        expect(formatRabbitMqError(err)).toEqual(
          formatRabbitMqError(
            new RabbitMqError(
              crashError.message,
              {
                serverName,
                eventType: 'sendToQueueFailed',
              },
              crashError,
            ),
          ),
        );
        expect(spySerialize).toHaveBeenCalledTimes(1);
        expect(spySerialize).toHaveBeenCalledWith(request, { serverName, ...clientProxy['options'].serializerOption });
        expect(spyPublishOptionsBuilder).toHaveBeenCalledTimes(1);
        expect(spyPublishOptionsBuilder).toHaveBeenCalledWith(
          {
            asyncContext,
            publishOptions: {
              ...clientProxy['options'].publishOptions,
              ...request.publishOptions,
              headers: {
                ...clientProxy['options'].publishOptions.headers,
                ...request.publishOptions?.headers,
              },
            },
          },
          {
            ...clientProxy['options'].publishOptionsBuilderOptions,
            ...options.publishOptionsBuilderOptions,
          },
        );

        expect(spyPublish).toHaveBeenCalledTimes(0);
        expect(spySendToQueue).toHaveBeenCalledTimes(1);
        expect(spySendToQueue).toHaveBeenCalledWith(
          request.queue,
          'serialized',
          { correlationId: 'correlation-id' },
          spySendToQueue.mock.calls[0][3],
        );
      });

      it('publish', async () => {
        jest.useFakeTimers();

        request.exchange = faker.string.alpha(8);

        const mockChannelWrapper: MockChannelWrapper = (mockClient as unknown as Record<string, unknown>)[
          'channelWrapper'
        ] as MockChannelWrapper;
        const spyPublish = jest.spyOn(mockChannelWrapper, 'publish');
        const spySendToQueue = jest.spyOn(mockChannelWrapper, 'sendToQueue');
        const spySerialize = jest.spyOn(clientProxy['serializer'], 'serialize').mockImplementation(() => {
          return {
            ...request,
            content: 'serialized',
          };
        });
        const spyPublishOptionsBuilder = jest
          .spyOn(clientProxy['publishOptionsBuilder'], 'build')
          .mockImplementation(() => {
            return {
              correlationId: 'correlation-id',
            };
          });

        jest.clearAllMocks();

        setTimeout(() => {
          (mockClient as MockAmqpConnectionManager).testEvents(RmqEventsMap.CONNECT);
        }, 50);

        setTimeout(() => {
          mockChannelWrapper.testSetup();
        }, 100);

        let err;
        const result = RabbitMqAsyncContext.instance.runWithContextAsync(
          () => firstValueFrom(clientProxy.send(request, options)).catch((e) => (err = e)),
          asyncContext,
        );

        await jest.advanceTimersByTimeAsync(100);
        jest.useRealTimers();

        expect(await result).toBeTruthy();
        expect(err).toBeUndefined();
        expect(spySerialize).toHaveBeenCalledTimes(1);
        expect(spySerialize).toHaveBeenCalledWith(request, { serverName, ...clientProxy['options'].serializerOption });
        expect(spyPublishOptionsBuilder).toHaveBeenCalledTimes(1);
        expect(spyPublishOptionsBuilder).toHaveBeenCalledWith(
          {
            asyncContext,
            publishOptions: {
              ...clientProxy['options'].publishOptions,
              ...request.publishOptions,
              headers: {
                ...clientProxy['options'].publishOptions.headers,
                ...request.publishOptions?.headers,
              },
            },
          },
          {
            ...clientProxy['options'].publishOptionsBuilderOptions,
            ...options.publishOptionsBuilderOptions,
          },
        );

        expect(spySendToQueue).toHaveBeenCalledTimes(0);
        expect(spyPublish).toHaveBeenCalledTimes(1);
        expect(spyPublish).toHaveBeenCalledWith(
          request.exchange,
          '',
          'serialized',
          { correlationId: 'correlation-id' },
          spyPublish.mock.calls[0][4],
        );
      });

      it('publish failed', async () => {
        jest.useFakeTimers();

        const crashError = new Error('Send error');
        request.exchange = faker.string.alpha(8);

        const mockChannelWrapper: MockChannelWrapper = (mockClient as unknown as Record<string, unknown>)[
          'channelWrapper'
        ] as MockChannelWrapper;
        const spyPublish = jest.spyOn(mockChannelWrapper, 'publish');
        const spySendToQueue = jest.spyOn(mockChannelWrapper, 'sendToQueue');
        const spySerialize = jest.spyOn(clientProxy['serializer'], 'serialize').mockImplementation(() => {
          return {
            ...request,
            content: 'serialized',
          };
        });
        const spyPublishOptionsBuilder = jest
          .spyOn(clientProxy['publishOptionsBuilder'], 'build')
          .mockImplementation(() => {
            return {
              correlationId: 'correlation-id',
            };
          });

        jest.spyOn(mockChannelWrapper.channel, 'publish').mockImplementation(async () => {
          throw crashError;
        });

        jest.clearAllMocks();

        setTimeout(() => {
          (mockClient as MockAmqpConnectionManager).testEvents(RmqEventsMap.CONNECT);
        }, 50);

        setTimeout(() => {
          mockChannelWrapper.testSetup();
        }, 100);

        let err;
        RabbitMqAsyncContext.instance.runWithContextAsync(
          () => firstValueFrom(clientProxy.send(request, options)).catch((e) => (err = e)),
          asyncContext,
        );

        await jest.advanceTimersByTimeAsync(100);
        jest.useRealTimers();

        expect(formatRabbitMqError(err)).toEqual(
          formatRabbitMqError(
            new RabbitMqError(
              crashError.message,
              {
                serverName,
                eventType: 'publishFailed',
              },
              crashError,
            ),
          ),
        );
        expect(spySerialize).toHaveBeenCalledTimes(1);
        expect(spySerialize).toHaveBeenCalledWith(request, { serverName, ...clientProxy['options'].serializerOption });
        expect(spyPublishOptionsBuilder).toHaveBeenCalledTimes(1);
        expect(spyPublishOptionsBuilder).toHaveBeenCalledWith(
          {
            asyncContext,
            publishOptions: {
              ...clientProxy['options'].publishOptions,
              ...request.publishOptions,
              headers: {
                ...clientProxy['options'].publishOptions.headers,
                ...request.publishOptions?.headers,
              },
            },
          },
          {
            ...clientProxy['options'].publishOptionsBuilderOptions,
            ...options.publishOptionsBuilderOptions,
          },
        );

        expect(spySendToQueue).toHaveBeenCalledTimes(0);
        expect(spyPublish).toHaveBeenCalledTimes(1);
        expect(spyPublish).toHaveBeenCalledWith(
          request.exchange,
          '',
          'serialized',
          { correlationId: 'correlation-id' },
          spyPublish.mock.calls[0][4],
        );
      });
    });

    describe('custom', () => {
      beforeEach(async () => {
        options.serializer = serializer;
        options.publishOptionsBuilder = publishOptionsBuilder;
      });
      it('sendToQueue', async () => {
        jest.useFakeTimers();

        request.queue = faker.string.alpha(8);

        const mockChannelWrapper: MockChannelWrapper = (mockClient as unknown as Record<string, unknown>)[
          'channelWrapper'
        ] as MockChannelWrapper;
        const spyPublish = jest.spyOn(mockChannelWrapper, 'publish');
        const spySendToQueue = jest.spyOn(mockChannelWrapper, 'sendToQueue');
        const spySerialize = jest.spyOn(serializer, 'serialize').mockImplementation(() => {
          return {
            ...request,
            content: 'serialized',
          };
        });
        const spyPublishOptionsBuilder = jest.spyOn(publishOptionsBuilder, 'build').mockImplementation(() => {
          return {
            correlationId: 'correlation-id',
          };
        });

        jest.clearAllMocks();

        setTimeout(() => {
          (mockClient as MockAmqpConnectionManager).testEvents(RmqEventsMap.CONNECT);
        }, 50);

        setTimeout(() => {
          mockChannelWrapper.testSetup();
        }, 100);

        const result = RabbitMqAsyncContext.instance.runWithContextAsync(
          () => firstValueFrom(clientProxy.send(request, options)),
          asyncContext,
        );

        await jest.advanceTimersByTimeAsync(100);
        jest.useRealTimers();

        expect(await result).toBeTruthy();
        expect(spySerialize).toHaveBeenCalledTimes(1);
        expect(spySerialize).toHaveBeenCalledWith(request, { serverName, ...clientProxy['options'].serializerOption });
        expect(spyPublishOptionsBuilder).toHaveBeenCalledTimes(1);
        expect(spyPublishOptionsBuilder).toHaveBeenCalledWith(
          {
            asyncContext,
            publishOptions: {
              ...clientProxy['options'].publishOptions,
              ...request.publishOptions,
              headers: {
                ...clientProxy['options'].publishOptions.headers,
                ...request.publishOptions?.headers,
              },
            },
          },
          {
            ...clientProxy['options'].publishOptionsBuilderOptions,
            ...options.publishOptionsBuilderOptions,
          },
        );

        expect(spyPublish).toHaveBeenCalledTimes(0);
        expect(spySendToQueue).toHaveBeenCalledTimes(1);
        expect(spySendToQueue).toHaveBeenCalledWith(
          request.queue,
          'serialized',
          { correlationId: 'correlation-id' },
          spySendToQueue.mock.calls[0][3],
        );
      });

      it('publish', async () => {
        jest.useFakeTimers();

        request.exchange = faker.string.alpha(8);

        const mockChannelWrapper: MockChannelWrapper = (mockClient as unknown as Record<string, unknown>)[
          'channelWrapper'
        ] as MockChannelWrapper;
        const spyPublish = jest.spyOn(mockChannelWrapper, 'publish');
        const spySendToQueue = jest.spyOn(mockChannelWrapper, 'sendToQueue');
        const spySerialize = jest.spyOn(serializer, 'serialize').mockImplementation(() => {
          return {
            ...request,
            content: 'serialized',
          };
        });
        const spyPublishOptionsBuilder = jest.spyOn(publishOptionsBuilder, 'build').mockImplementation(() => {
          return {
            correlationId: 'correlation-id',
          };
        });

        jest.clearAllMocks();

        setTimeout(() => {
          (mockClient as MockAmqpConnectionManager).testEvents(RmqEventsMap.CONNECT);
        }, 50);

        setTimeout(() => {
          mockChannelWrapper.testSetup();
        }, 100);

        const result = RabbitMqAsyncContext.instance.runWithContextAsync(
          () => firstValueFrom(clientProxy.send(request, options)),
          asyncContext,
        );

        await jest.advanceTimersByTimeAsync(100);
        jest.useRealTimers();

        expect(await result).toBeTruthy();
        expect(spySerialize).toHaveBeenCalledTimes(1);
        expect(spySerialize).toHaveBeenCalledWith(request, { serverName, ...clientProxy['options'].serializerOption });
        expect(spyPublishOptionsBuilder).toHaveBeenCalledTimes(1);
        expect(spyPublishOptionsBuilder).toHaveBeenCalledWith(
          {
            asyncContext,
            publishOptions: {
              ...clientProxy['options'].publishOptions,
              ...request.publishOptions,
              headers: {
                ...clientProxy['options'].publishOptions.headers,
                ...request.publishOptions?.headers,
              },
            },
          },
          {
            ...clientProxy['options'].publishOptionsBuilderOptions,
            ...options.publishOptionsBuilderOptions,
          },
        );

        expect(spySendToQueue).toHaveBeenCalledTimes(0);
        expect(spyPublish).toHaveBeenCalledTimes(1);
        expect(spyPublish).toHaveBeenCalledWith(
          request.exchange,
          '',
          'serialized',
          { correlationId: 'correlation-id' },
          spyPublish.mock.calls[0][4],
        );
      });
    });
  });
});
