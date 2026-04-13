import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ElkLoggerModule,
  IElkLoggerService,
  INestElkLoggerService,
} from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { MockConfigService } from 'tests/nestjs';
import { MockElkLoggerService, MockNestElkLoggerService } from 'tests/modules/elk-logger';
import { MockProducerSerializer, MockKafkaHeadersRequestBuilder } from 'tests/modules/kafka';
import { TestModule, TestService } from 'tests/src/test-module';
import { IKafkaHeadersRequestBuilder, IProducerSerializer } from './types/types';
import { KafkaClientService } from './services/kafka-client.service';
import { KafkaClientProxy } from './services/kafka-client.proxy';
import { KafkaClientModule } from './kafka-client.module';
import {
  KAFKA_CLIENT_HEADERS_REQUEST_BUILDER_DI,
  KAFKA_CLIENT_PRODUCER_REQUEST_SERIALIZER_DI,
  KAFKA_CLIENT_PROXY_DI,
} from './types/tokens';
import { KafkaHeadersRequestBuilder } from './builders/kafka.headers-request.builder';
import { ProducerSerializer } from './adapters/producer.serializer';

jest.mock('kafkajs', () => jest.requireActual('tests/kafkajs').KAFKAJS_MOCK_WITH_ORIGINALS);

describe(KafkaClientModule.name, () => {
  let serverName: string;

  let nestLogger: INestElkLoggerService;
  let logger: IElkLoggerService;
  let requestBuilder: IKafkaHeadersRequestBuilder;
  let serializer: IProducerSerializer;
  let clientProxy: KafkaClientProxy;
  let clientService: KafkaClientService;

  beforeEach(async () => {
    jest.clearAllMocks();

    logger = new MockElkLoggerService();
    nestLogger = new MockNestElkLoggerService();
    serverName = faker.string.alpha(4);
  });

  describe('default', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule,
          ElkLoggerModule.forRoot(),
          PrometheusModule,
          KafkaClientModule.register({
            kafkaClientProxyBuilderOptions: {
              useValue: {
                serverName,
                client: {
                  brokers: ['broker'],
                },
              },
            },
          }),
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

      requestBuilder = module.get(KAFKA_CLIENT_HEADERS_REQUEST_BUILDER_DI);
      serializer = module.get(KAFKA_CLIENT_PRODUCER_REQUEST_SERIALIZER_DI);
      clientProxy = module.get(KAFKA_CLIENT_PROXY_DI);
      clientService = module.get(KafkaClientService);
    });

    it('init', async () => {
      expect(requestBuilder).toBeDefined();
      expect(serializer).toBeDefined();
      expect(clientProxy).toBeDefined();
      expect(clientService).toBeDefined();

      expect(requestBuilder instanceof KafkaHeadersRequestBuilder).toBeTruthy();
      expect(serializer instanceof ProducerSerializer).toBeTruthy();
    });
  });

  describe('custom', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule,
          ElkLoggerModule.forRoot(),
          PrometheusModule,
          KafkaClientModule.register({
            imports: [TestModule],
            providers: [TestService],
            kafkaClientProxyBuilderOptions: {
              useValue: {
                serverName,
                client: {
                  brokers: ['broker'],
                },
              },
            },
            serializer: {
              useClass: MockProducerSerializer,
            },
            headerBuilder: {
              useClass: MockKafkaHeadersRequestBuilder,
            },
          }),
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

      requestBuilder = module.get(KAFKA_CLIENT_HEADERS_REQUEST_BUILDER_DI);
      serializer = module.get(KAFKA_CLIENT_PRODUCER_REQUEST_SERIALIZER_DI);
      clientProxy = module.get(KAFKA_CLIENT_PROXY_DI);
      clientService = module.get(KafkaClientService);
    });

    it('init', async () => {
      expect(requestBuilder).toBeDefined();
      expect(serializer).toBeDefined();
      expect(clientProxy).toBeDefined();
      expect(clientService).toBeDefined();

      expect(requestBuilder instanceof MockKafkaHeadersRequestBuilder).toBeTruthy();
      expect(serializer instanceof MockProducerSerializer).toBeTruthy();
    });
  });
});
