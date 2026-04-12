import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MockConfigService } from 'tests/nestjs';
import { MockEncodeFormatter, MockFormatter } from 'tests/modules/elk-logger';
import { TestConfig, TestModule, TestService } from 'tests/src/test-module';
import { ElkLoggerModule } from './elk-logger.module';
import {
  IElkLoggerService,
  IElkLoggerServiceBuilder,
  ILogFields,
  INestElkLoggerService,
} from './types/elk-logger.types';
import { ELK_LOGGER_SERVICE_DI, ELK_NEST_LOGGER_SERVICE_DI, ELK_LOGGER_SERVICE_BUILDER_DI } from './types/tokens';
import { PruneConfig } from './formatters/prune.config';
import { ElkLoggerConfig } from './services/elk-logger.config';

class TestFormatter extends MockFormatter {
  constructor(private readonly testService: TestService) {
    super();
  }
}

class TestEncodeFormatter extends MockEncodeFormatter {
  constructor(private readonly testService: TestService) {
    super();
  }
}

describe(ElkLoggerModule.name, () => {
  let elkLoggerConfig: ElkLoggerConfig;
  let pruneConfig: PruneConfig;
  let loggerService: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let nestLogger: INestElkLoggerService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule,
        ElkLoggerModule.forRoot({
          imports: [TestModule],
          providers: [TestService],
          defaultFields: {
            markers: ['test'],
            index: 'custom field',
          } as ILogFields,
          formattersOptions: {
            ignoreObjects: {
              useFactory: () => [TestConfig],
            },
            sortFields: ['index'],
          },
          formatters: {
            inject: [TestService],
            useFactory: (testService: TestService) => {
              return [new TestFormatter(testService)];
            },
          },
          encoders: {
            inject: [TestService],
            useFactory: (testService: TestService) => {
              return [new TestEncodeFormatter(testService)];
            },
          },
        }),
      ],
    })
      .overrideProvider(ConfigService)
      .useValue(new MockConfigService())
      .compile();

    elkLoggerConfig = module.get(ElkLoggerConfig);
    pruneConfig = module.get(PruneConfig);
    loggerService = module.get(ELK_LOGGER_SERVICE_DI);
    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);
    nestLogger = module.get(ELK_NEST_LOGGER_SERVICE_DI);
  });

  it('init', async () => {
    expect(elkLoggerConfig).toBeDefined();
    expect(pruneConfig).toBeDefined();
    expect(loggerService).toBeDefined();
    expect(loggerBuilder).toBeDefined();
    expect(nestLogger).toBeDefined();
  });

  it('ElkLoggerConfig', async () => {
    expect(elkLoggerConfig.getDefaultFields()).toEqual({ markers: ['test'], index: 'custom field' });
    expect(elkLoggerConfig.getIgnoreObjects().includes(TestConfig)).toBeTruthy();
    expect(elkLoggerConfig.getSortFields()).toEqual(['index']);
  });

  it('ElkLoggerService', async () => {
    const service = loggerService as unknown as Record<string, unknown[]>;
    expect(service['recordFormatters'].length).toBe(5);
    expect(service['recordFormatters'][2] instanceof TestFormatter).toBeTruthy();

    expect(service['encodeFormatters'].length).toBe(2);
    expect(service['encodeFormatters'][0] instanceof TestEncodeFormatter).toBeTruthy();
  });

  it('NestElkLoggerService', async () => {
    const logger = nestLogger as unknown as Record<string, unknown[]>;
    expect(logger['recordFormatters'].length).toBe(5);
    expect(logger['recordFormatters'][2] instanceof TestFormatter).toBeTruthy();

    expect(logger['encodeFormatters'].length).toBe(2);
    expect(logger['encodeFormatters'][0] instanceof TestEncodeFormatter).toBeTruthy();
  });
});
