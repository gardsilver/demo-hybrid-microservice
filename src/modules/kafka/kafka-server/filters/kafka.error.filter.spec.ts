import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { ArgumentsHost } from '@nestjs/common';
import { RpcArgumentsHost } from '@nestjs/common/interfaces';
import { KafkaMessage } from '@nestjs/microservices/external/kafka.interface';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerService } from 'src/modules/elk-logger';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { kafkaMessageFactory } from 'tests/modules/kafka';
import { KafkaErrorFilter } from './kafka.error.filter';
import { KafkaServerHelper } from '../helpers/kafka-server.helper';
import { ConsumerMode } from '../types/types';
import { KafkaContext } from '../ctx-host/kafka.context';

describe(KafkaErrorFilter.name, () => {
  let error;
  let logger: IElkLoggerService;
  let kafkaMessage: KafkaMessage;
  let messageOptions;
  let kafkaContext: KafkaContext;
  let host: ArgumentsHost;
  let filter: KafkaErrorFilter;

  beforeEach(async () => {
    jest.clearAllMocks();

    error = new Error('test error');
    logger = new MockElkLoggerService();
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: ELK_LOGGER_SERVICE_BUILDER_DI,
          useValue: {
            build: () => logger,
          },
        },
        KafkaErrorFilter,
      ],
    }).compile();
    filter = module.get(KafkaErrorFilter);

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

    messageOptions = {
      serverName: faker.string.alpha(4),
    };
    kafkaContext = {
      getMode: jest.fn(),
      getMessage: jest.fn(),
      getMessageOptions: jest.fn(),
    } as undefined as KafkaContext;

    host = {
      switchToRpc: () =>
        ({
          getContext: () => kafkaContext,
        }) as undefined as RpcArgumentsHost,
    } as undefined as ArgumentsHost;

    jest.spyOn(KafkaServerHelper, 'isKafka').mockImplementation(() => true);
  });

  it('init', async () => {
    expect(filter).toBeDefined();
  });

  it('ignore', async () => {
    jest.spyOn(KafkaServerHelper, 'isKafka').mockImplementation(() => false);
    const spyLogger = jest.spyOn(logger, 'error');

    filter.catch(error, host);

    expect(spyLogger).toHaveBeenCalledTimes(0);
  });

  it('catch ' + ConsumerMode.EACH_MESSAGE, async () => {
    kafkaContext.getMode = () => ConsumerMode.EACH_MESSAGE;
    kafkaContext.getMessage = () => kafkaMessage;
    kafkaContext.getMessageOptions = () => messageOptions;

    const spyLogger = jest.spyOn(logger, 'error');

    filter.catch(error, host);

    expect(spyLogger).toHaveBeenCalledWith('KAFKA handle message failed', {
      payload: {
        message: kafkaMessage,
        options: messageOptions,
        exception: error,
      },
    });
  });

  it('catch ' + ConsumerMode.EACH_BATCH, async () => {
    kafkaContext.getMode = () => ConsumerMode.EACH_BATCH;
    kafkaContext.getMessage = () => [kafkaMessage];
    kafkaContext.getMessageOptions = () => [messageOptions];

    const spyLogger = jest.spyOn(logger, 'error');

    filter.catch(error, host);

    expect(spyLogger).toHaveBeenCalledWith('KAFKA handle message failed', {
      payload: {
        message: kafkaMessage,
        options: messageOptions,
        exception: error,
      },
    });
  });
});
