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
import { ExampleHttpModule } from './';
import { HttpService } from './services/http.service';
import { HttpController } from './controllers/http.controller';

describe(ExampleHttpModule.name, () => {
  let logger: IElkLoggerService;
  let nestLogger: INestElkLoggerService;
  let service: HttpService;
  let controller: HttpController;

  beforeEach(async () => {
    logger = new MockElkLoggerService();
    nestLogger = new MockNestElkLoggerService();
    const module = await Test.createTestingModule({
      imports: [ConfigModule, ElkLoggerModule.forRoot(), AuthModule.forRoot(), PrometheusModule, ExampleHttpModule],
    })
      .overrideProvider(ConfigService)
      .useValue(new MockConfigService())
      .overrideProvider(ELK_LOGGER_SERVICE_DI)
      .useValue(logger)
      .overrideProvider(ELK_NEST_LOGGER_SERVICE_DI)
      .useValue(nestLogger)
      .compile();

    service = module.get(HttpService);
    controller = module.get(HttpController);
  });

  it('init', async () => {
    expect(service).toBeDefined();
    expect(controller).toBeDefined();
  });
});
