import { CommonMessageFields, ConsumeMessage, MessagePropertyHeaders } from 'amqplib';
import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { ArgumentsHost } from '@nestjs/common';
import { RpcArgumentsHost } from '@nestjs/common/interfaces';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerService } from 'src/modules/elk-logger';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { messageFieldsFactory, messagePropertiesFactory, messagePropertyHeadersFactory } from 'tests/amqplib';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { RabbitMqErrorFilter } from './rabbit-mq.error.filter';
import { RabbitMqHelper } from '../helpers/rabbit-mq.helper';
import { RabbitMqContext } from '../ctx-host/rabbit-mq.context';

describe(RabbitMqErrorFilter.name, () => {
  let error;
  let logger: IElkLoggerService;
  let headers: MessagePropertyHeaders;
  let content: string;
  let consumeMessage: ConsumeMessage;
  let rmqContext: RabbitMqContext;
  let host: ArgumentsHost;
  let filter: RabbitMqErrorFilter;

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
        RabbitMqErrorFilter,
      ],
    }).compile();
    filter = module.get(RabbitMqErrorFilter);

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
    content = faker.string.alpha(20);
    consumeMessage = {
      content: Buffer.from(content),
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
      ) as undefined as CommonMessageFields,
    } as undefined as ConsumeMessage;

    rmqContext = new RabbitMqContext<string>([consumeMessage, { ...consumeMessage, content }, undefined, undefined]);

    host = {
      switchToRpc: () =>
        ({
          getContext: () => rmqContext,
        }) as undefined as RpcArgumentsHost,
    } as undefined as ArgumentsHost;

    jest.spyOn(RabbitMqHelper, 'isRabbitMq').mockImplementation(() => true);
  });

  it('init', async () => {
    expect(filter).toBeDefined();
  });

  it('ignore', async () => {
    jest.spyOn(RabbitMqHelper, 'isRabbitMq').mockImplementation(() => false);
    const spyLogger = jest.spyOn(logger, 'error');

    filter.catch(error, host);

    expect(spyLogger).toHaveBeenCalledTimes(0);
  });

  it('catch', async () => {
    const spyLogger = jest.spyOn(logger, 'error');

    filter.catch(error, host);

    expect(spyLogger).toHaveBeenCalledWith('RMQ handle message failed', {
      payload: {
        message: { ...consumeMessage, content },
        exception: error,
      },
    });
  });
});
