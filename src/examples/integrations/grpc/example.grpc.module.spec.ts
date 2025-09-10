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
import { ExampleGrpcModule } from './';
import { GrpcService } from './services/grpc.service';
import { HttpController } from './controllers/http.controller';

describe(ExampleGrpcModule.name, () => {
  let logger: IElkLoggerService;
  let nestLogger: INestElkLoggerService;
  let service: GrpcService;
  let controller: HttpController;

  beforeEach(async () => {
    logger = new MockElkLoggerService();
    nestLogger = new MockNestElkLoggerService();
    const module = await Test.createTestingModule({
      imports: [ConfigModule, ElkLoggerModule.forRoot(), AuthModule.forRoot(), PrometheusModule, ExampleGrpcModule],
    })
      .overrideProvider(ConfigService)
      .useValue(new MockConfigService())
      .overrideProvider(ELK_LOGGER_SERVICE_DI)
      .useValue(logger)
      .overrideProvider(ELK_NEST_LOGGER_SERVICE_DI)
      .useValue(nestLogger)
      .compile();
    service = module.get(GrpcService);
    controller = module.get(HttpController);
  });

  it('init', async () => {
    expect(service).toBeDefined();
    expect(controller).toBeDefined();
  });
});
