import { faker } from '@faker-js/faker';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ElkLoggerModule,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
} from 'src/modules/elk-logger';
import { PrometheusManager, PrometheusModule } from 'src/modules/prometheus';
import { MockConfigService } from 'tests/nestjs';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { RabbitMqMicroserviceBuilder } from './rabbit-mq.microservice.builder';
import { RabbitMqServerStatusService } from '../services/rabbit-mq-server.status.service';
import { RabbitMqServer } from '../services/rabbit-mq-server';
import { RabbitMqHealthIndicator } from '../services/rabbit-mq.health-indicator';

describe(RabbitMqMicroserviceBuilder.name, () => {
  let serverName: string;
  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let prometheusManager: PrometheusManager;
  let rabbitMqStatusService: RabbitMqServerStatusService;

  const app = {
    connectMicroservice: jest.fn(),
  } as unknown as NestExpressApplication;

  beforeEach(async () => {
    serverName = faker.string.alpha(4);
    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      imports: [ConfigModule, ElkLoggerModule.forRoot(), PrometheusModule],
      providers: [RabbitMqServerStatusService],
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
    rabbitMqStatusService = module.get(RabbitMqServerStatusService);
  });

  it('init', async () => {
    expect(loggerBuilder).toBeDefined();
    expect(prometheusManager).toBeDefined();
    expect(rabbitMqStatusService).toBeDefined();
  });

  it('setup', async () => {
    const { server, serverHealthIndicator } = RabbitMqMicroserviceBuilder.setup(app, {
      serverName,
      consumer: {
        urls: [
          {
            hostname: 'rabbitmq',
            port: 5672,
            username: 'admin',
            password: 'admin',
          },
        ],
        queueOptions: {
          durable: false,
        },
      },
      prometheusManager,
      rabbitMqStatusService,
    });

    expect(server instanceof RabbitMqServer).toBeTruthy();
    expect(serverHealthIndicator instanceof RabbitMqHealthIndicator).toBeTruthy();
    expect(rabbitMqStatusService.getHealthIndicators()).toEqual([serverHealthIndicator]);
  });
});
