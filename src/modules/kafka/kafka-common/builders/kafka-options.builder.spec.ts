import { faker } from '@faker-js/faker';
import { KafkaJSConnectionError } from 'kafkajs';
import { IElkLoggerService, IElkLoggerServiceBuilder, ITraceSpan, TraceSpanBuilder } from 'src/modules/elk-logger';
import { PrometheusManager } from 'src/modules/prometheus';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { KafkaOptionsBuilder } from './kafka-options.builder';
import { KafkaClientOptionsBuilder } from './kafka.client-options.builder';
import {
  IKafkaClientProxyBuilderOptions,
  IRetryOptions,
  KafkaClientConfig,
  KafkaConsumerConfig,
  KafkaProducerConfig,
} from '../types/types';
import { KafkaConsumerOptionsBuilder } from './kafka.consumer-options.builder';
import { KafkaProducerOptionsBuilder } from './kafka.producer-options.builder';

describe(KafkaOptionsBuilder.name, () => {
  let mockHost: string;
  let serverName: string;
  let retryOptions: IRetryOptions;
  let clientOptions: KafkaClientConfig;
  let consumerOptions: KafkaConsumerConfig;
  let producerOptions: KafkaProducerConfig;
  let builderOptions: IKafkaClientProxyBuilderOptions;

  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let mockTraceSpan: ITraceSpan;
  let prometheusManager: PrometheusManager;
  let builder: KafkaOptionsBuilder;

  beforeEach(async () => {
    mockHost = faker.string.alpha(10);
    serverName = faker.string.alpha(5);

    mockTraceSpan = {
      traceId: faker.string.uuid(),
    } as ITraceSpan;

    retryOptions = {
      timeout: faker.number.int(),
      delay: faker.number.int(),
      retryMaxCount: faker.number.int(),
    };

    clientOptions = {
      clientId: faker.string.alpha(10),
      brokers: [mockHost],
    };
    consumerOptions = {
      groupId: faker.string.alpha(10),
    };
    producerOptions = {
      allowAutoTopicCreation: true,
    };

    builderOptions = {
      serverName,
      postfixId: faker.string.alpha(10),
      client: {
        ...{
          ...clientOptions,
          brokers: clientOptions.brokers as undefined as string[],
        },
        retry: {
          ...retryOptions,
        },
      },
      consumer: {
        ...consumerOptions,
        retry: {
          ...retryOptions,
          retry: true,
          statusCodes: [KafkaJSConnectionError.name],
        },
      },
      producer: {
        ...producerOptions,
        retry: {
          ...retryOptions,
        },
      },
    };

    jest.spyOn(TraceSpanBuilder, 'build').mockImplementation(() => mockTraceSpan);
    jest.spyOn(KafkaClientOptionsBuilder, 'build').mockImplementation(() => clientOptions);
    jest.spyOn(KafkaConsumerOptionsBuilder, 'build').mockImplementation(() => consumerOptions);
    jest.spyOn(KafkaProducerOptionsBuilder, 'build').mockImplementation(() => producerOptions);

    logger = new MockElkLoggerService();
    loggerBuilder = {
      build: () => logger,
    };

    prometheusManager = {
      counter: () => ({
        increment: () => {},
      }),
    } as undefined as PrometheusManager;

    builder = new KafkaOptionsBuilder(loggerBuilder, prometheusManager);

    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(builder).toBeDefined();
    expect(builder['isStop']).toBeFalsy();
  });

  it('stop', async () => {
    builder.stop();
    expect(builder['isStop']).toBeTruthy();
  });

  it('build default', async () => {
    const spyLogBuilder = jest.spyOn(loggerBuilder, 'build');
    const spyLog = jest.spyOn(logger, 'error');

    const tgt = builder.build(builderOptions);

    expect(spyLogBuilder).toHaveBeenCalledWith({ module: 'KafkaConsumer', ...mockTraceSpan });

    expect({
      ...tgt,
      consumer: {
        ...tgt.consumer,
        retry: {
          ...tgt.consumer.retry,
          restartOnFailure: undefined,
        },
      },
    }).toEqual({
      ...builderOptions,
      client: {
        ...clientOptions,
        retry: {
          maxRetryTime: retryOptions.timeout,
          initialRetryTime: retryOptions.delay,
          retries: retryOptions.retryMaxCount,
        },
      },
      consumer: {
        ...consumerOptions,
        retry: {
          maxRetryTime: retryOptions.timeout,
          initialRetryTime: retryOptions.delay,
          retries: retryOptions.retryMaxCount,
        },
      },
      producer: {
        ...producerOptions,
        retry: {
          maxRetryTime: retryOptions.timeout,
          initialRetryTime: retryOptions.delay,
          retries: retryOptions.retryMaxCount,
        },
      },
    });

    expect(typeof tgt.consumer.retry.restartOnFailure).toBe('function');

    const restartOnFailure = (error: Error) => tgt.consumer.retry.restartOnFailure(error);

    let error: Error = new KafkaJSConnectionError('Test error');

    expect(await restartOnFailure(error)).toBeFalsy();

    expect(spyLog).toHaveBeenCalledWith('Kafka restart on failure', {
      payload: {
        status: 'stop reconnection',
        serverName,
        brokers: [mockHost],
        error,
      },
    });

    error = new Error('Test error');

    expect(await restartOnFailure(error)).toBeTruthy();

    expect(spyLog).toHaveBeenCalledWith('Kafka restart on failure', {
      payload: {
        status: 'reconnection',
        serverName,
        brokers: [mockHost],
        error,
      },
    });

    builder.stop();

    expect(await restartOnFailure(error)).toBeFalsy();

    expect(spyLog).toHaveBeenCalledWith('Kafka restart on failure', {
      payload: {
        status: 'stop reconnection',
        serverName,
        brokers: [mockHost],
        error,
      },
    });
  });

  it('build without retry', async () => {
    const tgt = builder.build({
      ...builderOptions,
      client: {
        ...builderOptions.client,
        retry: undefined,
      },
      consumer: {
        ...builderOptions.consumer,
        retry: {
          ...builderOptions.consumer.retry,
          retry: false,
        },
      },
    });

    expect(tgt.client.retry).toBeUndefined();
    expect(tgt.consumer.retry).toBeUndefined();
  });

  it('build without consumer and producer', async () => {
    const tgt = builder.build({
      ...builderOptions,
      consumer: undefined,
      producer: undefined,
    });

    expect(tgt).toEqual({
      ...builderOptions,
      client: {
        ...clientOptions,
        retry: {
          maxRetryTime: retryOptions.timeout,
          initialRetryTime: retryOptions.delay,
          retries: retryOptions.retryMaxCount,
        },
      },
      consumer: undefined,
      producer: undefined,
    });
  });
});
