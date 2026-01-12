import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ELK_LOGGER_SERVICE_BUILDER_DI, ElkLoggerModule, IElkLoggerService } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { IRabbitMqPublishOptionsBuilder, RabbitMqPublishOptionsBuilder } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { MockConfigService } from 'tests/nestjs';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { MockProducerSerializer, MockRabbitMqPublishOptionsBuilder } from 'tests/modules/rabbit-mq';
import { TestModule, TestService } from 'tests/src/test-module';
import { IProducerSerializer } from './types/types';
import {
  RABBIT_MQ_CLIENT_PRODUCER_REQUEST_SERIALIZER_DI,
  RABBIT_MQ_CLIENT_PROXY_DI,
  RABBIT_MQ_CLIENT_PUBLISH_OPTIONS_BUILDER_DI,
} from './types/tokens';
import { RabbitMqClientErrorHandler } from './filters/rabbit-mq-client.error-handler';
import { RabbitMqClientProxy } from './services/rabbit-mq-client.proxy';
import { RabbitMqClientService } from './services/rabbit-mq-client.service';
import { RabbitMqClientModule } from './rabbit-mq-client.module';
import { ProducerSerializer } from './adapters/producer.serializer';

describe(RabbitMqClientModule.name, () => {
  let serverName: string;
  let logger: IElkLoggerService;
  let serializer: IProducerSerializer;
  let publishOptionsBuilder: IRabbitMqPublishOptionsBuilder;
  let clientProxy: RabbitMqClientProxy;
  let clientService: RabbitMqClientService;
  let handler: RabbitMqClientErrorHandler;

  beforeEach(async () => {
    jest.clearAllMocks();

    logger = new MockElkLoggerService();
    serverName = faker.string.alpha(4);
  });

  describe('default', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule,
          ElkLoggerModule.forRoot(),
          PrometheusModule,
          RabbitMqClientModule.register({
            clientProxyBuilderOptions: {
              useValue: {
                serverName,
                producer: {},
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

      publishOptionsBuilder = module.get(RABBIT_MQ_CLIENT_PUBLISH_OPTIONS_BUILDER_DI);
      serializer = module.get(RABBIT_MQ_CLIENT_PRODUCER_REQUEST_SERIALIZER_DI);
      clientProxy = module.get(RABBIT_MQ_CLIENT_PROXY_DI);
      clientService = module.get(RabbitMqClientService);
      handler = module.get(RabbitMqClientErrorHandler);
    });

    it('init', async () => {
      expect(publishOptionsBuilder).toBeDefined();
      expect(serializer).toBeDefined();
      expect(clientProxy).toBeDefined();
      expect(clientService).toBeDefined();
      expect(handler).toBeDefined();

      expect(publishOptionsBuilder instanceof RabbitMqPublishOptionsBuilder).toBeTruthy();
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
          RabbitMqClientModule.register({
            imports: [TestModule],
            providers: [TestService],

            clientProxyBuilderOptions: {
              useValue: {
                serverName,
                producer: {
                  serializerOption: {},
                  publishOptionsBuilderOptions: { skip: true },
                  publishOptions: {},
                },
              },
            },
            serializer: {
              useClass: MockProducerSerializer,
            },
            publishOptionsBuilder: {
              useClass: MockRabbitMqPublishOptionsBuilder,
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

      publishOptionsBuilder = module.get(RABBIT_MQ_CLIENT_PUBLISH_OPTIONS_BUILDER_DI);
      serializer = module.get(RABBIT_MQ_CLIENT_PRODUCER_REQUEST_SERIALIZER_DI);
      clientProxy = module.get(RABBIT_MQ_CLIENT_PROXY_DI);
      clientService = module.get(RabbitMqClientService);
      handler = module.get(RabbitMqClientErrorHandler);
    });

    it('init', async () => {
      expect(publishOptionsBuilder).toBeDefined();
      expect(serializer).toBeDefined();
      expect(clientProxy).toBeDefined();
      expect(clientService).toBeDefined();
      expect(handler).toBeDefined();

      expect(publishOptionsBuilder instanceof MockRabbitMqPublishOptionsBuilder).toBeTruthy();
      expect(serializer instanceof MockProducerSerializer).toBeTruthy();
    });
  });
});
