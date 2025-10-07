import { firstValueFrom } from 'rxjs';
import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KAFKA_DEFAULT_BROKER, KAFKA_DEFAULT_CLIENT } from '@nestjs/microservices/constants';
import { InvalidMessageException } from '@nestjs/microservices/errors/invalid-message.exception';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ElkLoggerModule,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
  INestElkLoggerService,
} from 'src/modules/elk-logger';
import {
  IKafkaMessage,
  KafkaAsyncContext,
  KafkaClientOptionsBuilder,
  KafkaOptionsBuilder,
  KafkaProducerOptionsBuilder,
} from 'src/modules/kafka/kafka-common';
import { MockConfigService } from 'tests/nestjs';
import { MockKafka, MockProducer } from 'tests/kafkajs';
import { MockElkLoggerService, MockNestElkLoggerService } from 'tests/modules/elk-logger';
import { MockProducerSerializer, MockKafkaHeadersRequestBuilder, kafkaHeadersFactory } from 'tests/modules/kafka';
import {
  IKafkaHeadersRequestBuilder,
  IKafkaRequest,
  IKafkaRequestOptions,
  IProducerSerializer,
  ProducerMode,
} from '../types/types';
import { KafkaClientProxy } from './kafka-client.proxy';

jest.mock('kafkajs', () => {
  const actualKafkaJs = jest.requireActual('kafkajs');

  return Object.assign(actualKafkaJs, { Kafka: jest.fn((prams?) => new MockKafka(prams)) });
});

describe(KafkaClientProxy.name, () => {
  let serverName: string;
  let nestLogger: INestElkLoggerService;
  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let requestBuilder: IKafkaHeadersRequestBuilder;
  let serializer: IProducerSerializer;
  let clientProxy: KafkaClientProxy;

  beforeEach(async () => {
    jest.clearAllMocks();

    logger = new MockElkLoggerService();
    nestLogger = new MockNestElkLoggerService();
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
    module.useLogger(nestLogger);

    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);
    serializer = new MockProducerSerializer();
    requestBuilder = new MockKafkaHeadersRequestBuilder();
  });

  describe('init', () => {
    it('default', async () => {
      const spyClientOptions = jest.spyOn(KafkaClientOptionsBuilder, 'build');
      const spyProducerOptions = jest.spyOn(KafkaProducerOptionsBuilder, 'build');
      const spyRetryOptions = jest.spyOn(KafkaOptionsBuilder, 'createRetryOptions');

      clientProxy = new KafkaClientProxy(
        {
          serverName,
          client: {
            brokers: [],
          },
        },
        loggerBuilder,
        serializer,
        requestBuilder,
      );

      expect(clientProxy.getServerName()).toBe(serverName);
      expect(clientProxy['brokers']).toEqual([KAFKA_DEFAULT_BROKER]);
      expect(clientProxy['clientId']).toBe(KAFKA_DEFAULT_CLIENT + '-client');
      expect(spyClientOptions).toHaveBeenCalledWith(
        { brokers: [] },
        {
          loggerBuilder,
        },
      );
      expect(spyProducerOptions).toHaveBeenCalledWith({});
      expect(spyRetryOptions).toHaveBeenCalledTimes(0);
    });

    it('with retry', async () => {
      const spyClientOptions = jest.spyOn(KafkaClientOptionsBuilder, 'build');
      const spyProducerOptions = jest.spyOn(KafkaProducerOptionsBuilder, 'build');
      const spyRetryOptions = jest.spyOn(KafkaOptionsBuilder, 'createRetryOptions');

      clientProxy = new KafkaClientProxy(
        {
          serverName,
          postfixId: '-postfixId',
          client: {
            clientId: 'clientId',
            brokers: ['broker'],
            retry: {
              timeout: 10_000,
              delay: 500,
              retryMaxCount: 10,
            },
          },
          producer: {
            metadataMaxAge: 2,
            retry: {
              timeout: 20_000,
              delay: 1_000,
              retryMaxCount: 20,
            },
          },
        },
        loggerBuilder,
        serializer,
        requestBuilder,
      );

      expect(clientProxy['brokers']).toEqual(['broker']);
      expect(clientProxy['clientId']).toBe('clientId-postfixId');
      expect(spyClientOptions).toHaveBeenCalledWith(
        {
          clientId: 'clientId',
          brokers: ['broker'],
          retry: {
            timeout: 10_000,
            delay: 500,
            retryMaxCount: 10,
          },
        },
        {
          loggerBuilder,
        },
      );
      expect(spyProducerOptions).toHaveBeenCalledWith({
        metadataMaxAge: 2,
        retry: {
          timeout: 20_000,
          delay: 1_000,
          retryMaxCount: 20,
        },
      });
      expect(spyRetryOptions).toHaveBeenCalledWith({ timeout: 10_000, delay: 500, retryMaxCount: 10 });
      expect(spyRetryOptions).toHaveBeenCalledWith({ timeout: 20_000, delay: 1_000, retryMaxCount: 20 });
    });
  });

  describe('base methods', () => {
    let request: IKafkaRequest;
    let options: IKafkaRequestOptions;
    beforeEach(async () => {
      clientProxy = new KafkaClientProxy(
        {
          serverName,
          client: {
            brokers: [],
          },
        },
        loggerBuilder,
        serializer,
        requestBuilder,
      );

      request = {
        topic: faker.string.alpha(4),
        data: {
          key: faker.string.alpha(4),
          value: faker.string.alpha(6),
          headers: kafkaHeadersFactory.build(
            {
              programsIds: ['1', '30'],
            },
            {
              transient: {
                traceId: undefined,
                spanId: undefined,
                initialSpanId: undefined,
                parentSpanId: undefined,
                requestId: undefined,
                correlationId: undefined,
                replyTopic: undefined,
                replyPartition: undefined,
              },
            },
          ),
        },
      };
      options = {
        serializer: {
          serialize: jest.fn().mockImplementation(() => ({
            value: 'success',
          })),
        },
        headerBuilder: {
          build: jest.fn().mockImplementation(() => ({
            message: 'next',
          })),
        },
        serializerOption: {
          details: 'message',
        },
      };
    });

    it('connect/close/unwrap', async () => {
      const spyConnect = jest.spyOn(MockProducer.prototype, 'connect');
      const spyDisconnect = jest.spyOn(MockProducer.prototype, 'disconnect');
      expect(() => clientProxy.unwrap()).toThrow(
        'Not initialized. Please call the "connect/send" method before accessing the server.',
      );

      await clientProxy.connect();

      expect(clientProxy.unwrap()[0] instanceof MockKafka).toBeTruthy();
      expect(clientProxy.unwrap()[1] instanceof MockProducer).toBeTruthy();

      await clientProxy.connect();

      expect(spyConnect).toHaveBeenCalledTimes(1);
      expect(spyDisconnect).toHaveBeenCalledTimes(0);

      await clientProxy.close();

      expect(spyDisconnect).toHaveBeenCalledTimes(1);

      expect(() => clientProxy.unwrap()).toThrow(
        'Not initialized. Please call the "connect/send" method before accessing the server.',
      );
    });

    describe('send', () => {
      it('send Invalid Message', async () => {
        let error;
        try {
          await firstValueFrom(clientProxy.send(undefined, undefined));
        } catch (err) {
          error = err;
        }
        expect(error).toEqual(new InvalidMessageException());

        error = undefined;
        try {
          await firstValueFrom(clientProxy.send({} as undefined as IKafkaRequest, undefined));
        } catch (err) {
          error = err;
        }
        expect(error).toEqual(new InvalidMessageException());

        error = undefined;
        try {
          await firstValueFrom(
            clientProxy.send({ topic: faker.string.alpha(5) } as undefined as IKafkaRequest, undefined),
          );
        } catch (err) {
          error = err;
        }
        expect(error).toEqual(new InvalidMessageException());

        error = undefined;
        try {
          await firstValueFrom(
            clientProxy.send({ topic: faker.string.alpha(5), data: [] } as undefined as IKafkaRequest, undefined),
          );
        } catch (err) {
          error = err;
        }
        expect(error).toEqual(new InvalidMessageException());
      });

      it('send default for object', async () => {
        const spyConnect = jest.spyOn(MockProducer.prototype, 'connect');
        jest.spyOn(KafkaAsyncContext.instance, 'extend').mockImplementation(() => ({
          message: 'ok',
        }));
        const spySerialize = jest.spyOn(serializer, 'serialize').mockImplementation(() => ({
          value: 'success',
        }));
        const spyHeadersBuild = jest.spyOn(requestBuilder, 'build').mockImplementation(() => ({
          message: 'next',
        }));
        const spySend = jest.spyOn(MockProducer.prototype, 'send');

        await firstValueFrom(clientProxy.send(request));

        expect(spyConnect).toHaveBeenCalledTimes(1);
        expect(spyHeadersBuild).toHaveBeenCalledWith(
          {
            asyncContext: {
              message: 'ok',
            },
            headers: request.data['headers'],
          },
          undefined,
        );

        expect(spySerialize).toHaveBeenCalledWith(
          {
            ...request,
            data: {
              ...request.data,
              headers: {
                message: 'next',
              },
            },
          },
          {
            serverName,
            mode: ProducerMode.SEND,
          },
        );

        expect(spySend).toHaveBeenCalledWith({
          topic: request.topic,
          messages: [
            {
              value: 'success',
            },
          ],
        });
      });

      it('send default for array', async () => {
        const spyConnect = jest.spyOn(MockProducer.prototype, 'connect');
        jest.spyOn(KafkaAsyncContext.instance, 'extend').mockImplementation(() => ({
          message: 'ok',
        }));
        const spySerialize = jest.spyOn(serializer, 'serialize').mockImplementation(() => ({
          value: 'success',
        }));
        const spyHeadersBuild = jest.spyOn(requestBuilder, 'build').mockImplementation(() => ({
          message: 'next',
        }));
        const spySend = jest.spyOn(MockProducer.prototype, 'send');

        await firstValueFrom(
          clientProxy.send({
            ...request,
            data: [request.data as undefined as IKafkaMessage<unknown>],
          }),
        );

        expect(spyConnect).toHaveBeenCalledTimes(1);
        expect(spyHeadersBuild).toHaveBeenCalledWith(
          {
            asyncContext: {
              message: 'ok',
            },
            headers: request.data['headers'],
          },
          undefined,
        );

        expect(spySerialize).toHaveBeenCalledWith(
          {
            ...request,
            data: {
              ...request.data,
              headers: {
                message: 'next',
              },
            },
          },
          {
            serverName,
            mode: ProducerMode.SEND,
          },
        );

        expect(spySend).toHaveBeenCalledWith({
          topic: request.topic,
          messages: [
            {
              value: 'success',
            },
          ],
        });
      });

      it('send skip headerBuilder', async () => {
        const spyHeadersBuild = jest.spyOn(requestBuilder, 'build');

        await firstValueFrom(clientProxy.send(request, { headersBuilderOptions: { skip: true } }));

        expect(spyHeadersBuild).toHaveBeenCalledTimes(0);
      });

      it('send with options', async () => {
        jest.spyOn(KafkaAsyncContext.instance, 'extend').mockImplementation(() => ({
          message: 'ok',
        }));
        const spySerialize = jest.spyOn(serializer, 'serialize');
        const spyHeadersBuild = jest.spyOn(requestBuilder, 'build');
        const spySend = jest.spyOn(MockProducer.prototype, 'send');

        await firstValueFrom(clientProxy.send(request, options));

        expect(spyHeadersBuild).toHaveBeenCalledTimes(0);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(options.headerBuilder.build).toHaveBeenCalledWith(
          {
            asyncContext: {
              message: 'ok',
            },
            headers: request.data['headers'],
          },
          undefined,
        );

        expect(spySerialize).toHaveBeenCalledTimes(0);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(options.serializer.serialize).toHaveBeenCalledWith(
          {
            ...request,
            data: {
              ...request.data,
              headers: {
                message: 'next',
              },
            },
          },
          {
            serverName,
            mode: ProducerMode.SEND,
            details: 'message',
          },
        );

        expect(spySend).toHaveBeenCalledWith({
          topic: request.topic,
          messages: [
            {
              value: 'success',
            },
          ],
        });
      });
    });

    describe('sendBatch', () => {
      it('sendBatch Invalid Message', async () => {
        let error;
        try {
          await firstValueFrom(clientProxy.sendBatch(undefined, undefined));
        } catch (err) {
          error = err;
        }
        expect(error).toEqual(new InvalidMessageException());

        error = undefined;
        try {
          await firstValueFrom(clientProxy.sendBatch([] as undefined as IKafkaRequest[], undefined));
        } catch (err) {
          error = err;
        }
        expect(error).toEqual(new InvalidMessageException());

        error = undefined;
        try {
          await firstValueFrom(clientProxy.sendBatch([{}] as undefined as IKafkaRequest[], undefined));
        } catch (err) {
          error = err;
        }
        expect(error).toEqual(new InvalidMessageException());

        error = undefined;
        try {
          await firstValueFrom(
            clientProxy.sendBatch([{ topic: faker.string.alpha(5) }] as undefined as IKafkaRequest[], undefined),
          );
        } catch (err) {
          error = err;
        }
        expect(error).toEqual(new InvalidMessageException());

        error = undefined;
        try {
          await firstValueFrom(
            clientProxy.sendBatch(
              [{ topic: faker.string.alpha(5), data: [] }] as undefined as IKafkaRequest[],
              undefined,
            ),
          );
        } catch (err) {
          error = err;
        }
        expect(error).toEqual(new InvalidMessageException());
      });

      it('sendBatch default for object', async () => {
        const spyConnect = jest.spyOn(MockProducer.prototype, 'connect');
        jest.spyOn(KafkaAsyncContext.instance, 'extend').mockImplementation(() => ({
          message: 'ok',
        }));
        jest.spyOn(serializer, 'serialize').mockImplementation(() => ({
          value: 'success',
        }));
        jest.spyOn(requestBuilder, 'build').mockImplementation(() => ({
          message: 'next',
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const spyRequestAsMessages = jest.spyOn(clientProxy as any, 'requestAsMessages');
        const spySendBatch = jest.spyOn(MockProducer.prototype, 'sendBatch');

        await firstValueFrom(clientProxy.sendBatch([request]));

        expect(spyConnect).toHaveBeenCalledTimes(1);
        expect(spyRequestAsMessages).toHaveBeenCalledWith(ProducerMode.SEND_BATCH, request, undefined);

        expect(spySendBatch).toHaveBeenCalledWith({
          topicMessages: [
            {
              topic: request.topic,
              messages: [
                {
                  value: 'success',
                },
              ],
            },
          ],
        });
      });

      it('sendBatch with options', async () => {
        jest.spyOn(KafkaAsyncContext.instance, 'extend').mockImplementation(() => ({
          message: 'ok',
        }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const spyRequestAsMessages = jest.spyOn(clientProxy as any, 'requestAsMessages');
        const spySendBatch = jest.spyOn(MockProducer.prototype, 'sendBatch');

        await firstValueFrom(clientProxy.sendBatch([request], options));

        expect(spyRequestAsMessages).toHaveBeenCalledWith(ProducerMode.SEND_BATCH, request, options);

        expect(spySendBatch).toHaveBeenCalledWith({
          topicMessages: [
            {
              topic: request.topic,
              messages: [
                {
                  value: 'success',
                },
              ],
            },
          ],
        });
      });
    });
  });
});
