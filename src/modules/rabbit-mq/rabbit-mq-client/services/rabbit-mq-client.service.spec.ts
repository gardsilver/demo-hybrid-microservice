/* eslint-disable @typescript-eslint/unbound-method */
import { Observable } from 'rxjs';
import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerMarkers } from 'src/modules/common';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ElkLoggerModule,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
  ILogFields,
} from 'src/modules/elk-logger';
import { PrometheusLabels, PrometheusManager, PrometheusModule } from 'src/modules/prometheus';
import { IRabbitMqProducerMessage } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { MockConfigService } from 'tests/nestjs';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { IRabbitMqSendOptions } from '../types/types';
import { RABBIT_MQ_EXTERNAL_REQUEST_DURATIONS, RABBIT_MQ_EXTERNAL_REQUEST_FAILED } from '../types/metrics';
import { RABBIT_MQ_CLIENT_PROXY_DI } from '../types/tokens';
import { RabbitMqClientExternalError } from '../errors/rabbit-mq-client.external.error';
import { RabbitMqClientErrorHandler } from '../filters/rabbit-mq-client.error-handler';
import { RabbitMqClientProxy } from './rabbit-mq-client.proxy';
import { RabbitMqClientService } from './rabbit-mq-client.service';

describe(RabbitMqClientService.name, () => {
  let request: IRabbitMqProducerMessage;
  let options: IRabbitMqSendOptions;

  let serverName: string;
  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let prometheusManager: PrometheusManager;
  let handler: RabbitMqClientErrorHandler;
  let clientProxy: RabbitMqClientProxy;
  let clientService: RabbitMqClientService;

  beforeEach(async () => {
    jest.clearAllMocks();

    logger = new MockElkLoggerService();
    serverName = faker.string.alpha(4);

    clientProxy = {
      send: jest.fn(),
      close: jest.fn(),
      connect: jest.fn(),
      unwrap: jest.fn(),
      on: jest.fn(),
      getServerName: () => serverName,
    } as undefined as RabbitMqClientProxy;

    handler = {
      loggingStatus: jest.fn(),
      handleError: jest.fn(),
    } as undefined as RabbitMqClientErrorHandler;

    const module = await Test.createTestingModule({
      imports: [ConfigModule, ElkLoggerModule.forRoot(), PrometheusModule],
      providers: [
        {
          provide: RABBIT_MQ_CLIENT_PROXY_DI,
          useValue: clientProxy,
        },
        {
          provide: RabbitMqClientErrorHandler,
          useValue: handler,
        },
        RabbitMqClientService,
      ],
    })
      .overrideProvider(ConfigService)
      .useValue(new MockConfigService())
      .overrideProvider(ELK_LOGGER_SERVICE_BUILDER_DI)
      .useValue({
        build: () => logger,
      })
      .compile();

    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);
    prometheusManager = module.get(PrometheusManager);
    clientService = module.get(RabbitMqClientService);

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
  });

  it('init', async () => {
    expect(clientService).toBeDefined();
  });

  it('request success', async () => {
    const spyLogBuilder = jest.spyOn(loggerBuilder, 'build');
    const spyLogInfo = jest.spyOn(logger, 'info');
    const spyStartTimer = jest.spyOn(prometheusManager.histogram(), 'startTimer');
    const spyIncrement = jest.spyOn(prometheusManager.counter(), 'increment');

    clientProxy.send = jest.fn().mockImplementation(() => {
      return new Observable((subscriber) => {
        subscriber.next(true);
      });
    });

    const labels: PrometheusLabels = {
      service: serverName,
      queue: request.queue ?? '',
      exchange: request.exchange ?? '',
      routing: request.routingKey ?? '',
    };

    const fieldsLogs: ILogFields = {
      module: 'RabbitMqClient',
      markers: [LoggerMarkers.RABBIT_MQ],
      payload: {
        service: serverName,
        request,
      },
    };

    const result = await clientService.request(request, options);

    expect(result).toEqual(true);
    expect(spyLogBuilder).toHaveBeenCalledWith(fieldsLogs);
    expect(spyLogInfo).toHaveBeenCalledWith('RMQ request', {
      markers: [LoggerMarkers.REQUEST, LoggerMarkers.EXTERNAL],
    });
    expect(handler.loggingStatus).toHaveBeenCalledWith(result, { fieldsLogs });
    expect(spyStartTimer).toHaveBeenCalledWith(RABBIT_MQ_EXTERNAL_REQUEST_DURATIONS, { labels });
    expect(spyIncrement).toHaveBeenCalledTimes(0);
  });

  it('request failed', async () => {
    request.queue = faker.string.alpha(6);
    request.exchange = faker.string.alpha(6);
    request.routingKey = faker.string.alpha(6);

    const error = new Error('Test error');
    const clientError = new RabbitMqClientExternalError('Client error', 'test');

    const spyLogBuilder = jest.spyOn(loggerBuilder, 'build');
    const spyLogInfo = jest.spyOn(logger, 'info');
    const spyHandleError = (handler.handleError = jest.fn().mockImplementation(() => clientError));
    const spyStartTimer = jest.spyOn(prometheusManager.histogram(), 'startTimer');
    const spyIncrement = jest.spyOn(prometheusManager.counter(), 'increment');

    clientProxy.send = jest.fn().mockImplementation(() => {
      return new Observable((subscriber) => {
        subscriber.error(error);
      });
    });

    const labels: PrometheusLabels = {
      service: serverName,
      queue: request.queue ?? '',
      exchange: request.exchange ?? '',
      routing: request.routingKey ?? '',
    };

    const fieldsLogs: ILogFields = {
      module: 'RabbitMqClient',
      markers: [LoggerMarkers.RABBIT_MQ],
      payload: {
        service: serverName,
        request,
      },
    };

    let err;

    try {
      await clientService.request(request, options);
    } catch (e) {
      err = e;
    }

    expect(err).toEqual(clientError);
    expect(spyLogBuilder).toHaveBeenCalledWith(fieldsLogs);
    expect(spyLogInfo).toHaveBeenCalledWith('RMQ request', {
      markers: [LoggerMarkers.REQUEST, LoggerMarkers.EXTERNAL],
    });
    expect(spyHandleError).toHaveBeenCalledWith(error, { fieldsLogs });
    expect(spyStartTimer).toHaveBeenCalledWith(RABBIT_MQ_EXTERNAL_REQUEST_DURATIONS, { labels });
    expect(spyIncrement).toHaveBeenCalledWith(RABBIT_MQ_EXTERNAL_REQUEST_FAILED, {
      labels: {
        ...labels,
        statusCode: clientError.statusCode?.toString(),
        type: clientError.loggerMarker,
      },
    });
  });
});
