import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ElkLoggerModule,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
} from 'src/modules/elk-logger';
import { PrometheusManager, PrometheusModule } from 'src/modules/prometheus';
import { KafkaOptionsBuilder } from 'src/modules/kafka/kafka-common';
import { MockConfigService } from 'tests/nestjs';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { KafkaServerStatusService } from '../services/kafka-server.status.service';
import { KafkaMicroserviceBuilder } from './kafka.microservice.builder';
import { KafkaServerHealthIndicator } from '../services/kafka-server.health-indicator';
import { KafkaServerService } from '../services/kafka-server.service';

jest.mock('kafkajs', () => jest.requireActual('tests/kafkajs').KAFKAJS_MOCK);

describe(KafkaMicroserviceBuilder.name, () => {
  let serverName: string;
  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let prometheusManager: PrometheusManager;
  let kafkaStatusService: KafkaServerStatusService;

  const app = {
    connectMicroservice: jest.fn(),
  } as unknown as NestExpressApplication;

  beforeEach(async () => {
    serverName = faker.string.alpha(4);
    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      imports: [ConfigModule, ElkLoggerModule.forRoot(), PrometheusModule],
      providers: [KafkaServerStatusService],
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
    kafkaStatusService = module.get(KafkaServerStatusService);
  });

  it('init', async () => {
    expect(loggerBuilder).toBeDefined();
    expect(prometheusManager).toBeDefined();
    expect(kafkaStatusService).toBeDefined();
  });

  it('setup', async () => {
    jest.spyOn(KafkaOptionsBuilder.prototype, 'build').mockImplementation(() => ({
      postfixId: '-customPostfixId',
    }));

    const { server, serverHealthIndicator } = KafkaMicroserviceBuilder.setup(app, {
      kafkaOptions: { serverName, client: { brokers: ['broker'] } },
      loggerBuilder,
      prometheusManager,
      kafkaStatusService,
    });

    expect(server instanceof KafkaServerService).toBeTruthy();
    expect(server['options']).toEqual({ postfixId: '-customPostfixId', serverName });
    expect(serverHealthIndicator instanceof KafkaServerHealthIndicator).toBeTruthy();
    expect(kafkaStatusService.getHealthIndicators()).toEqual([serverHealthIndicator]);
  });
});
