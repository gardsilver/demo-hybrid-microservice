/* eslint-disable @typescript-eslint/unbound-method */
import { Observable } from 'rxjs';
import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerMarkers } from 'src/modules/common';
import {
  INestElkLoggerService,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
  ElkLoggerModule,
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ILogFields,
} from 'src/modules/elk-logger';
import { PrometheusLabels, PrometheusManager, PrometheusModule } from 'src/modules/prometheus';
import { MockConfigService } from 'tests/nestjs';
import { MockElkLoggerService, MockNestElkLoggerService } from 'tests/modules/elk-logger';
import { kafkaHeadersFactory, MockKafkaHeadersRequestBuilder, MockProducerSerializer } from 'tests/modules/kafka';
import { KAFKA_CLIENT_PROXY_DI, KAFKA_CLIENT_REQUEST_OPTIONS_DI } from '../types/tokens';
import {
  IKafkaHeadersRequestBuilder,
  IKafkaRequest,
  IKafkaRequestOptions,
  IKafkaSendOptions,
  IProducerSerializer,
  ProducerMode,
} from '../types/types';
import { KafkaClientProxy } from './kafka-client.proxy';
import { KafkaClientService } from './kafka-client.service';
import { KafkaClientErrorHandler } from '../filters/kafka-client.error.handler';
import { KafkaClientExternalError } from '../errors/kafka-client.external.error';
import { KAFKA_EXTERNAL_REQUEST_DURATIONS, KAFKA_EXTERNAL_REQUEST_FAILED } from '../types/metrics';

describe(KafkaClientService.name, () => {
  let serverName: string;
  let nestLogger: INestElkLoggerService;
  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let prometheusManager: PrometheusManager;
  let requestOptions: Omit<IKafkaRequestOptions, 'serializer' | 'headerBuilder'>;
  let headerBuilder: IKafkaHeadersRequestBuilder;
  let serializer: IProducerSerializer;
  let clientProxy: KafkaClientProxy;
  let handler: KafkaClientErrorHandler;
  let clientService: KafkaClientService;

  beforeEach(async () => {
    jest.clearAllMocks();

    logger = new MockElkLoggerService();
    nestLogger = new MockNestElkLoggerService();
    serverName = faker.string.alpha(4);

    clientProxy = {
      send: jest.fn(),
      sendBatch: jest.fn(),
      close: jest.fn(),
      connect: jest.fn(),
      unwrap: jest.fn(),
      getServerName: () => serverName,
    } as undefined as KafkaClientProxy;

    requestOptions = {};
    handler = {
      loggingStatus: jest.fn(),
      handleError: jest.fn(),
    } as undefined as KafkaClientErrorHandler;

    const module = await Test.createTestingModule({
      imports: [ConfigModule, ElkLoggerModule.forRoot(), PrometheusModule],
      providers: [
        {
          provide: KafkaClientErrorHandler,
          useValue: handler,
        },
        {
          provide: KAFKA_CLIENT_PROXY_DI,
          useValue: clientProxy,
        },
        {
          provide: KAFKA_CLIENT_REQUEST_OPTIONS_DI,
          useValue: requestOptions,
        },
        KafkaClientService,
      ],
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
    headerBuilder = new MockKafkaHeadersRequestBuilder();
    prometheusManager = module.get(PrometheusManager);
    clientService = module.get(KafkaClientService);
  });

  it('init', async () => {
    expect(clientService).toBeDefined();

    await clientService.close();
    await clientService.connect();
    clientService.unwrap();

    expect(clientProxy.close).toHaveBeenCalledTimes(1);
    expect(clientProxy.connect).toHaveBeenCalledTimes(1);
    expect(clientProxy.unwrap).toHaveBeenCalledTimes(1);
  });

  describe('send/sendBatch', () => {
    let request: IKafkaRequest;
    let options: IKafkaSendOptions;

    beforeEach(async () => {
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
        serializer,
        headerBuilder,
        serializerOption: {
          details: 'message',
        },
      };
    });

    it('send success', async () => {
      const spyLogBuilder = jest.spyOn(loggerBuilder, 'build');
      const spyLogInfo = jest.spyOn(logger, 'info');
      const spyStartTimer = jest.spyOn(prometheusManager.histogram(), 'startTimer');
      const spyIncrement = jest.spyOn(prometheusManager.counter(), 'increment');

      clientProxy.send = jest.fn().mockImplementation(() => {
        return new Observable((subscriber) => {
          subscriber.next([{ status: 'ok' }]);
        });
      });

      const labels: PrometheusLabels = {
        service: serverName,
        method: ProducerMode.SEND,
        topics: request.topic,
      };

      const fieldsLogs: ILogFields = {
        module: 'KafkaClient',
        markers: [LoggerMarkers.KAFKA],
        payload: {
          service: serverName,
          method: ProducerMode.SEND,
          topics: request.topic,
          request: request.data,
        },
      };

      const result = await clientService.request(request, options);

      expect(result).toEqual([{ status: 'ok' }]);
      expect(spyLogBuilder).toHaveBeenCalledWith(fieldsLogs);
      expect(spyLogInfo).toHaveBeenCalledWith('Kafka request', {
        markers: [LoggerMarkers.REQUEST, LoggerMarkers.EXTERNAL],
      });
      expect(handler.loggingStatus).toHaveBeenCalledWith(result, { fieldsLogs });
      expect(spyStartTimer).toHaveBeenCalledWith(KAFKA_EXTERNAL_REQUEST_DURATIONS, { labels });
      expect(spyIncrement).toHaveBeenCalledTimes(0);
    });

    it('sendBatch success', async () => {
      const spyLogBuilder = jest.spyOn(loggerBuilder, 'build');
      const spyLogInfo = jest.spyOn(logger, 'info');
      const spyStartTimer = jest.spyOn(prometheusManager.histogram(), 'startTimer');
      const spyIncrement = jest.spyOn(prometheusManager.counter(), 'increment');

      clientProxy.sendBatch = jest.fn().mockImplementation(() => {
        return new Observable((subscriber) => {
          subscriber.next([{ status: 'ok' }]);
        });
      });

      const labels: PrometheusLabels = {
        service: serverName,
        method: ProducerMode.SEND_BATCH,
        topics: request.topic,
      };

      const fieldsLogs: ILogFields = {
        module: 'KafkaClient',
        markers: [LoggerMarkers.KAFKA],
        payload: {
          service: serverName,
          method: ProducerMode.SEND_BATCH,
          topics: request.topic,
          request: [request.data],
        },
      };

      const result = await clientService.request([request], options);

      expect(result).toEqual([{ status: 'ok' }]);
      expect(spyLogBuilder).toHaveBeenCalledWith(fieldsLogs);
      expect(spyLogInfo).toHaveBeenCalledWith('Kafka request', {
        markers: [LoggerMarkers.REQUEST, LoggerMarkers.EXTERNAL],
      });

      expect(handler.loggingStatus).toHaveBeenCalledWith(result, { fieldsLogs });
      expect(spyStartTimer).toHaveBeenCalledWith(KAFKA_EXTERNAL_REQUEST_DURATIONS, { labels });
      expect(spyIncrement).toHaveBeenCalledTimes(0);
    });

    it('send failed', async () => {
      const error = new Error('Test error');
      const clientError = new KafkaClientExternalError('Client error', 'test');

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
        method: ProducerMode.SEND,
        topics: request.topic,
      };

      const fieldsLogs: ILogFields = {
        module: 'KafkaClient',
        markers: [LoggerMarkers.KAFKA],
        payload: {
          service: serverName,
          method: ProducerMode.SEND,
          topics: request.topic,
          request: request.data,
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
      expect(spyLogInfo).toHaveBeenCalledWith('Kafka request', {
        markers: [LoggerMarkers.REQUEST, LoggerMarkers.EXTERNAL],
      });
      expect(spyHandleError).toHaveBeenCalledWith(error, { fieldsLogs });
      expect(spyStartTimer).toHaveBeenCalledWith(KAFKA_EXTERNAL_REQUEST_DURATIONS, { labels });
      expect(spyIncrement).toHaveBeenCalledWith(KAFKA_EXTERNAL_REQUEST_FAILED, {
        labels: {
          ...labels,
          statusCode: clientError.statusCode?.toString(),
          type: clientError.loggerMarker,
        },
      });
    });

    it('sendBatch failed', async () => {
      const error = new Error('Test error');
      const clientError = new KafkaClientExternalError('Client error', 'test');

      const spyLogBuilder = jest.spyOn(loggerBuilder, 'build');
      const spyLogInfo = jest.spyOn(logger, 'info');
      const spyHandleError = (handler.handleError = jest.fn().mockImplementation(() => clientError));
      const spyStartTimer = jest.spyOn(prometheusManager.histogram(), 'startTimer');
      const spyIncrement = jest.spyOn(prometheusManager.counter(), 'increment');

      clientProxy.sendBatch = jest.fn().mockImplementation(() => {
        return new Observable((subscriber) => {
          subscriber.error(error);
        });
      });

      const labels: PrometheusLabels = {
        service: serverName,
        method: ProducerMode.SEND_BATCH,
        topics: request.topic,
      };

      const fieldsLogs: ILogFields = {
        module: 'KafkaClient',
        markers: [LoggerMarkers.KAFKA],
        payload: {
          service: serverName,
          method: ProducerMode.SEND_BATCH,
          topics: request.topic,
          request: [request.data],
        },
      };

      let err;

      try {
        await clientService.request([request], options);
      } catch (e) {
        err = e;
      }

      expect(err).toEqual(clientError);
      expect(spyLogBuilder).toHaveBeenCalledWith(fieldsLogs);
      expect(spyLogInfo).toHaveBeenCalledWith('Kafka request', {
        markers: [LoggerMarkers.REQUEST, LoggerMarkers.EXTERNAL],
      });
      expect(spyHandleError).toHaveBeenCalledWith(error, { fieldsLogs });
      expect(spyStartTimer).toHaveBeenCalledWith(KAFKA_EXTERNAL_REQUEST_DURATIONS, { labels });
      expect(spyIncrement).toHaveBeenCalledWith(KAFKA_EXTERNAL_REQUEST_FAILED, {
        labels: {
          ...labels,
          statusCode: clientError.statusCode?.toString(),
          type: clientError.loggerMarker,
        },
      });
    });
  });
});
