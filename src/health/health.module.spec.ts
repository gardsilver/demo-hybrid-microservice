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
import { MockElkLoggerService, MockNestElkLoggerService } from 'tests/modules/elk-logger';
import { mockSequelize } from 'tests/sequelize-typescript';
import { HealthStatusService } from './services/health-status.service';
import { HealthController } from './controllers/health.controller';
import { HealthModule } from './health.module';

jest.mock('sequelize-typescript', () => {
  return { Sequelize: jest.fn(() => mockSequelize) };
});

describe(HealthModule.name, () => {
  let logger: IElkLoggerService;
  let nestLogger: INestElkLoggerService;
  let service: HealthStatusService;
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

    service = module.get(HealthStatusService);
    controller = module.get(HealthController);
  });

  it('init', async () => {
    expect(service).toBeDefined();
    expect(controller).toBeDefined();
  });
});
