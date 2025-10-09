import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessageHandler } from '@nestjs/microservices';
import { EachBatchPayload, EachMessagePayload, KafkaMessage } from '@nestjs/microservices/external/kafka.interface';
import { ELK_LOGGER_SERVICE_BUILDER_DI, ElkLoggerModule, IElkLoggerService } from 'src/modules/elk-logger';
import { PrometheusManager, PrometheusModule } from 'src/modules/prometheus';
import { KafkaHeadersHelper } from 'src/modules/kafka/kafka-common';
import { MockConfigService } from 'tests/nestjs';
import { MockKafka, MockConsumer } from 'tests/kafkajs';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import {
  kafkaMessageFactory,
  MockConsumerDeserializer,
  MockKafkaHeadersToAsyncContextAdapter,
} from 'tests/modules/kafka';
import { ConsumerMode, IKafkaMessageOptions } from '../types/types';
import { KAFKA_HANDLE_MESSAGE_FAILED, KAFKA_HANDLE_MESSAGE } from '../types/metrics';
import { KafkaContext } from '../ctx-host/kafka.context';
import { KafkaServerService } from './kafka-server.service';

jest.mock('kafkajs', () => {
  return { Kafka: jest.fn((prams?) => new MockKafka(prams)) };
});

let mockDelay = jest.fn();

jest.mock('src/modules/date-timestamp', () => {
  const actualDateTimestamp = jest.requireActual('src/modules/date-timestamp');

  const mockDateTimestamp = Object.assign({}, actualDateTimestamp);

  mockDateTimestamp.delay = jest.fn((ms, callback) => mockDelay(ms, callback));

  return mockDateTimestamp;
});

describe(KafkaServerService.name, () => {
  let extras;
  let logger: IElkLoggerService;
  let prometheusManager: PrometheusManager;
  let messageHandler: MessageHandler;
  let serverName: string;
  let server: KafkaServerService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockDelay = jest.fn(() => Promise.resolve());
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

    serverName = faker.string.alpha(5);
    extras = {
      serverName,
    };
    messageHandler = {} as undefined as MessageHandler;

    server = new KafkaServerService({ serverName }, prometheusManager);

    jest.spyOn(server['logger'], 'error').mockImplementation(() => jest.fn());
    jest.spyOn(server['logger'], 'warn').mockImplementation(() => jest.fn());
  });

  it('init', async () => {
    const spyOn = jest.spyOn(MockConsumer.prototype, 'on');
    const spyConnect = jest.spyOn(MockConsumer.prototype, 'connect');
    const spyDisconnect = jest.spyOn(MockConsumer.prototype, 'disconnect');
    const spyRun = jest.spyOn(MockConsumer.prototype, 'run');

    const callback = jest.fn();

    expect(() => server.unwrap()).toThrow(
      'Not initialized. Please call the "listen"/"startAllMicroservices" method before accessing the server.',
    );

    await server.listen(callback);

    expect(callback).toHaveBeenCalledWith();

    let [client, eachConsumer, batchConsumer] = server.unwrap();
    expect(client).toBeDefined();
    expect(client instanceof MockKafka).toBeTruthy();
    expect(eachConsumer).toBe(null);
    expect(batchConsumer).toBe(null);

    await server.close();

    expect(() => server.unwrap()).toThrow(
      'Not initialized. Please call the "listen"/"startAllMicroservices" method before accessing the server.',
    );

    server.addHandler('eachMessage', messageHandler, true, extras);
    server.addHandler('eachBatch', messageHandler, true, { ...extras, mode: ConsumerMode.EACH_BATCH });

    await server.listen(callback);

    [client, eachConsumer, batchConsumer] = server.unwrap();

    expect(client).toBeDefined();
    expect(client instanceof MockKafka).toBeTruthy();
    expect(eachConsumer).toBeDefined();
    expect(eachConsumer instanceof MockConsumer).toBeTruthy();
    expect(batchConsumer).toBeDefined();
    expect(batchConsumer instanceof MockConsumer).toBeTruthy();

    expect(spyOn).toHaveBeenCalledTimes(12);
    expect(spyConnect).toHaveBeenCalledTimes(2);
    expect(spyRun).toHaveBeenCalledTimes(2);
    expect(spyDisconnect).toHaveBeenCalledTimes(0);

    await server.close();

    expect(spyDisconnect).toHaveBeenCalledTimes(2);

    const error = new Error('Test error');
    server['createClient'] = jest.fn().mockImplementation(() => {
      throw error;
    });
    mockDelay.mockImplementation(async (ms, callback) => {
      await server.close();
      if (callback) {
        callback();
      }
      return Promise.resolve();
    });

    await server.listen(callback);

    expect(callback).toHaveBeenCalledWith(error);
  });

  describe('Handle eachMessage', () => {
    let topic: string;
    let kafkaMessage: KafkaMessage;

    beforeEach(async () => {
      jest.clearAllMocks();

      topic = faker.string.alpha(5);

      kafkaMessage = kafkaMessageFactory.build(undefined, {
        transient: {
          key: 'key',
          value: 'success',
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

      extras = {
        ...extras,
        headerAdapter: new MockKafkaHeadersToAsyncContextAdapter(),
        deserializer: new MockConsumerDeserializer(),
        mode: ConsumerMode.EACH_MESSAGE,
      };
    });

    it('Skip handleEachMessage ', async () => {
      const spyCount = jest.spyOn(prometheusManager.counter(), 'increment');
      const spyHandleEvent = jest.spyOn(server, 'handleEvent');
      const spyDeserialize = jest.spyOn(MockConsumerDeserializer.prototype, 'deserialize').mockImplementation(() => ({
        pattern: undefined,
        data: undefined,
      }));

      server.addHandler(topic, messageHandler, true, extras);

      const payload: EachMessagePayload = {
        topic,
        message: kafkaMessage,
        partition: faker.number.int(3),
        heartbeat: jest.fn(),
      } as undefined as EachMessagePayload;

      await server['handleEachMessage'](payload);

      expect(spyDeserialize).toHaveBeenCalledWith(kafkaMessage, {
        serverName,
        topic,
        mode: ConsumerMode.EACH_MESSAGE,
      });
      expect(spyHandleEvent).toHaveBeenCalledTimes(0);
      expect(spyCount).toHaveBeenCalledWith(KAFKA_HANDLE_MESSAGE, {
        labels: {
          service: serverName,
          topics: topic,
          method: ConsumerMode.EACH_MESSAGE,
        },
      });
    });

    it('Run handleEachMessage ', async () => {
      const spyCount = jest.spyOn(prometheusManager.counter(), 'increment');
      const spyHandleEvent = jest.spyOn(server, 'handleEvent').mockImplementation(jest.fn());
      const spyDeserialize = jest
        .spyOn(MockConsumerDeserializer.prototype, 'deserialize')
        .mockImplementation((value, options) => ({
          pattern: options.topic,
          data: value.value
            ? {
                key: value.key.toString(),
                value: value.value.toString(),
                headers: KafkaHeadersHelper.normalize(value.headers ?? {}),
              }
            : undefined,
        }));

      server.addHandler(topic, messageHandler, true, extras);

      const payload: EachMessagePayload = {
        topic,
        message: kafkaMessage,
        partition: faker.number.int(3),
        heartbeat: jest.fn(),
      } as undefined as EachMessagePayload;

      const kafkaContext = new KafkaContext([
        kafkaMessage,
        payload.partition,
        payload.topic,
        server['consumer'],
        () => payload.heartbeat(),
        ConsumerMode.EACH_MESSAGE,
        {
          serverName,
          mode: ConsumerMode.EACH_MESSAGE,
          topic,
        } as undefined as IKafkaMessageOptions,
      ]);

      await server['handleEachMessage'](payload);

      expect(spyDeserialize).toHaveBeenCalledWith(kafkaMessage, {
        serverName,
        topic,
        mode: ConsumerMode.EACH_MESSAGE,
      });

      expect(spyHandleEvent).toHaveBeenCalledTimes(1);
      expect(spyHandleEvent.mock.calls[0][0]).toBe(topic);
      expect(spyHandleEvent.mock.calls[0][1]).toEqual({
        pattern: topic,
        data: {
          key: 'key',
          value: 'success',
          headers: kafkaMessage.headers,
          correlationId: undefined,
          replyPartition: undefined,
          replyTopic: undefined,
        },
      });
      expect(spyHandleEvent.mock.calls[0][2] instanceof KafkaContext).toBeTruthy();

      const callKafkaContext = spyHandleEvent.mock.calls[0][2];

      expect(callKafkaContext.getMessageOptions()).toEqual(kafkaContext.getMessageOptions());

      expect({
        getMessage: callKafkaContext.getMessage(),
        getPartition: callKafkaContext.getPartition(),
        getTopic: callKafkaContext.getTopic(),
        getConsumer: callKafkaContext.getConsumer(),
        getHeartbeat: typeof callKafkaContext.getHeartbeat(),
        getMode: callKafkaContext.getMode(),
        getMessageOptions: callKafkaContext.getMessageOptions(),
      }).toEqual({
        getMessage: kafkaContext.getMessage(),
        getPartition: kafkaContext.getPartition(),
        getTopic: kafkaContext.getTopic(),
        getConsumer: kafkaContext.getConsumer(),
        getHeartbeat: typeof kafkaContext.getHeartbeat(),
        getMode: kafkaContext.getMode(),
        getMessageOptions: kafkaContext.getMessageOptions(),
      });

      expect(spyCount).toHaveBeenCalledWith(KAFKA_HANDLE_MESSAGE, {
        labels: {
          service: serverName,
          topics: topic,
          method: ConsumerMode.EACH_MESSAGE,
        },
      });
    });

    it('Failed handleEachMessage', async () => {
      const error = new Error('Deserialize error!!!');

      const spyCount = jest.spyOn(prometheusManager.counter(), 'increment');
      const spyHandleEvent = jest.spyOn(server, 'handleEvent').mockImplementation(jest.fn());
      const spyDeserialize = jest.spyOn(MockConsumerDeserializer.prototype, 'deserialize').mockImplementation(() => {
        throw error;
      });

      server.addHandler(topic, messageHandler, true, extras);

      const payload: EachMessagePayload = {
        topic,
        message: kafkaMessage,
        partition: faker.number.int(3),
        heartbeat: jest.fn(),
      } as undefined as EachMessagePayload;

      await server['handleEachMessage'](payload);

      expect(spyDeserialize).toHaveBeenCalledWith(kafkaMessage, {
        serverName,
        topic,
        mode: ConsumerMode.EACH_MESSAGE,
      });

      expect(spyHandleEvent).toHaveBeenCalledTimes(0);

      expect(spyCount).toHaveBeenCalledWith(KAFKA_HANDLE_MESSAGE, {
        labels: {
          service: serverName,
          topics: topic,
          method: ConsumerMode.EACH_MESSAGE,
        },
      });
      expect(spyCount).toHaveBeenCalledWith(KAFKA_HANDLE_MESSAGE_FAILED, {
        labels: {
          service: serverName,
          topics: topic,
          method: ConsumerMode.EACH_MESSAGE,
          errorType: error.name,
        },
      });
    });
  });

  describe('Handle eachBatch', () => {
    let topic: string;
    let kafkaMessage: KafkaMessage;

    beforeEach(async () => {
      jest.clearAllMocks();

      topic = faker.string.alpha(5);

      kafkaMessage = kafkaMessageFactory.build(undefined, {
        transient: {
          key: 'key',
          value: 'success',
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

      extras = {
        ...extras,
        headerAdapter: new MockKafkaHeadersToAsyncContextAdapter(),
        deserializer: new MockConsumerDeserializer(),
        mode: ConsumerMode.EACH_BATCH,
      };
    });

    it('Skip handleBatchMessages ', async () => {
      const spyCount = jest.spyOn(prometheusManager.counter(), 'increment');
      const spyHandleEvent = jest.spyOn(server, 'handleEvent');
      const spyDeserialize = jest.spyOn(MockConsumerDeserializer.prototype, 'deserialize').mockImplementation(() => ({
        pattern: undefined,
        data: undefined,
      }));

      server.addHandler(topic, messageHandler, true, extras);

      const payload: EachBatchPayload = {
        batch: {
          topic,
          partition: faker.number.int(3),
          messages: [kafkaMessage],
        },
        heartbeat: jest.fn(),
      } as undefined as EachBatchPayload;

      await server['handleBatchMessages'](payload);

      expect(spyDeserialize).toHaveBeenCalledWith(kafkaMessage, {
        serverName,
        topic,
        mode: ConsumerMode.EACH_BATCH,
      });
      expect(spyHandleEvent).toHaveBeenCalledTimes(0);

      expect(spyCount).toHaveBeenCalledWith(KAFKA_HANDLE_MESSAGE, {
        labels: {
          service: serverName,
          topics: topic,
          method: ConsumerMode.EACH_BATCH,
        },
        value: payload.batch.messages.length,
      });
    });

    it('Run handleBatchMessages', async () => {
      const spyCount = jest.spyOn(prometheusManager.counter(), 'increment');
      const spyHandleEvent = jest.spyOn(server, 'handleEvent').mockImplementation(jest.fn());
      const spyDeserialize = jest
        .spyOn(MockConsumerDeserializer.prototype, 'deserialize')
        .mockImplementation((value, options) => ({
          pattern: options.topic,
          data: value.value
            ? {
                key: value.key.toString(),
                value: value.value.toString(),
                headers: KafkaHeadersHelper.normalize(value.headers ?? {}),
              }
            : undefined,
        }));

      server.addHandler(topic, messageHandler, true, extras);

      const payload: EachBatchPayload = {
        batch: {
          topic,
          partition: faker.number.int(3),
          messages: [kafkaMessage],
        },
        heartbeat: jest.fn(),
      } as undefined as EachBatchPayload;

      const kafkaContext = new KafkaContext([
        [kafkaMessage],
        payload.batch.partition,
        payload.batch.topic,
        server['consumer'],
        () => payload.heartbeat(),
        ConsumerMode.EACH_BATCH,
        [
          {
            serverName,
            mode: ConsumerMode.EACH_BATCH,
            topic,
          } as undefined as IKafkaMessageOptions,
        ],
      ]);

      await server['handleBatchMessages'](payload);

      expect(spyDeserialize).toHaveBeenCalledWith(kafkaMessage, {
        serverName,
        topic,
        mode: ConsumerMode.EACH_BATCH,
      });

      expect(spyHandleEvent).toHaveBeenCalledTimes(1);
      expect(spyHandleEvent.mock.calls[0][0]).toBe(topic);
      expect(spyHandleEvent.mock.calls[0][1]).toEqual([
        {
          pattern: topic,
          data: {
            key: 'key',
            value: 'success',
            headers: kafkaMessage.headers,
            correlationId: undefined,
            replyPartition: undefined,
            replyTopic: undefined,
          },
        },
      ]);
      expect(spyHandleEvent.mock.calls[0][2] instanceof KafkaContext).toBeTruthy();

      const callKafkaContext = spyHandleEvent.mock.calls[0][2];

      expect(callKafkaContext.getMessageOptions()).toEqual(kafkaContext.getMessageOptions());

      expect({
        getMessage: callKafkaContext.getMessage(),
        getPartition: callKafkaContext.getPartition(),
        getTopic: callKafkaContext.getTopic(),
        getConsumer: callKafkaContext.getConsumer(),
        getHeartbeat: typeof callKafkaContext.getHeartbeat(),
        getMode: callKafkaContext.getMode(),
        getMessageOptions: callKafkaContext.getMessageOptions(),
      }).toEqual({
        getMessage: kafkaContext.getMessage(),
        getPartition: kafkaContext.getPartition(),
        getTopic: kafkaContext.getTopic(),
        getConsumer: kafkaContext.getConsumer(),
        getHeartbeat: typeof kafkaContext.getHeartbeat(),
        getMode: kafkaContext.getMode(),
        getMessageOptions: kafkaContext.getMessageOptions(),
      });

      expect(spyCount).toHaveBeenCalledWith(KAFKA_HANDLE_MESSAGE, {
        labels: {
          service: serverName,
          topics: topic,
          method: ConsumerMode.EACH_BATCH,
        },
        value: payload.batch.messages.length,
      });
    });

    it('Failed handleBatchMessages', async () => {
      const error = new Error('Deserialize error!!!');

      const spyCount = jest.spyOn(prometheusManager.counter(), 'increment');
      const spyHandleEvent = jest.spyOn(server, 'handleEvent').mockImplementation(jest.fn());
      const spyDeserialize = jest.spyOn(MockConsumerDeserializer.prototype, 'deserialize').mockImplementation(() => {
        throw error;
      });

      server.addHandler(topic, messageHandler, true, extras);

      const payload: EachBatchPayload = {
        batch: {
          topic,
          partition: faker.number.int(3),
          messages: [kafkaMessage],
        },
        heartbeat: jest.fn(),
      } as undefined as EachBatchPayload;

      await server['handleBatchMessages'](payload);

      expect(spyDeserialize).toHaveBeenCalledWith(kafkaMessage, {
        serverName,
        topic,
        mode: ConsumerMode.EACH_BATCH,
      });

      expect(spyHandleEvent).toHaveBeenCalledTimes(0);

      expect(spyCount).toHaveBeenCalledWith(KAFKA_HANDLE_MESSAGE, {
        labels: {
          service: serverName,
          topics: topic,
          method: ConsumerMode.EACH_BATCH,
        },
        value: payload.batch.messages.length,
      });
      expect(spyCount).toHaveBeenCalledWith(KAFKA_HANDLE_MESSAGE_FAILED, {
        labels: {
          service: serverName,
          topics: topic,
          method: ConsumerMode.EACH_BATCH,
          errorType: error.name,
        },
        value: payload.batch.messages.length,
      });
    });
  });
});
