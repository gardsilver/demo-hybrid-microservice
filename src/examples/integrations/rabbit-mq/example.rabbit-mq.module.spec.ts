import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  ELK_LOGGER_SERVICE_DI,
  ELK_NEST_LOGGER_SERVICE_DI,
  ElkLoggerModule,
  IElkLoggerService,
  INestElkLoggerService,
} from 'src/modules/elk-logger';
import { AuthModule } from 'src/modules/auth';
import { PrometheusModule } from 'src/modules/prometheus';
import { MockConfigService } from 'tests/nestjs';
import { MockElkLoggerService, MockNestElkLoggerService } from 'tests/modules/elk-logger';
import { RabbitMqService } from './services/rabbit-mq.service';
import { HttpController } from './controllers/http.controller';
import { ExampleRabbitMqModule } from './example.rabbit-mq.module';

describe(ExampleRabbitMqModule.name, () => {
  let logger: IElkLoggerService;
  let nestLogger: INestElkLoggerService;
  let service: RabbitMqService;
  let controller: HttpController;

  beforeEach(async () => {
    logger = new MockElkLoggerService();
    nestLogger = new MockNestElkLoggerService();
    const module = await Test.createTestingModule({
      imports: [ConfigModule, ElkLoggerModule.forRoot(), AuthModule.forRoot(), PrometheusModule, ExampleRabbitMqModule],
    })
      .overrideProvider(ConfigService)
      .useValue(new MockConfigService())
      .overrideProvider(ELK_LOGGER_SERVICE_DI)
      .useValue(logger)
      .overrideProvider(ELK_NEST_LOGGER_SERVICE_DI)
      .useValue(nestLogger)
      .compile();
    service = module.get(RabbitMqService);
    controller = module.get(HttpController);
  });

  it('init', async () => {
    expect(service).toBeDefined();
    expect(controller).toBeDefined();
  });
});
