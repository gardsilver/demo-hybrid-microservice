import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ELK_LOGGER_SERVICE_DI,
  ELK_NEST_LOGGER_SERVICE_DI,
  ElkLoggerModule,
  IElkLoggerService,
  INestElkLoggerService,
} from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { AuthModule } from 'src/modules/auth';
import { GracefulShutdownModule } from 'src/modules/graceful-shutdown';
import { DatabaseModule } from 'src/modules/database';
import { KafkaServerModule } from 'src/modules/kafka/kafka-server';
import { RabbitMqServerModule } from 'src/modules/rabbit-mq/rabbit-mq-server';
import { MockElkLoggerService, MockNestElkLoggerService } from 'tests/modules/elk-logger';
import { HealthController } from './controllers/health.controller';
import { HealthModule } from './health.module';

jest.mock('sequelize-typescript', () => jest.requireActual('tests/sequelize-typescript').SEQUELIZE_TYPESCRIPT_MOCK);

describe(HealthModule.name, () => {
  let logger: IElkLoggerService;
  let nestLogger: INestElkLoggerService;
  let controller: HealthController;

  beforeEach(async () => {
    logger = new MockElkLoggerService();
    nestLogger = new MockNestElkLoggerService();

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule,
        ElkLoggerModule.forRoot(),
        HealthModule,
        PrometheusModule,
        AuthModule.forRoot(),
        DatabaseModule.forRoot(),
        GracefulShutdownModule.forRoot(),
        KafkaServerModule.forRoot(),
        RabbitMqServerModule.forRoot(),
      ],
    })
      .overrideProvider(ELK_LOGGER_SERVICE_BUILDER_DI)
      .useValue({
        build: () => logger,
      })
      .overrideProvider(ELK_LOGGER_SERVICE_DI)
      .useValue(logger)
      .overrideProvider(ELK_NEST_LOGGER_SERVICE_DI)
      .useValue(nestLogger)
      .compile();

    controller = module.get(HealthController);
  });

  it('init', async () => {
    expect(controller).toBeDefined();
  });
});
