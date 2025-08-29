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
import { PruneConfig } from './formatters/prune.config';
import { ElkLoggerConfig } from './services/elk-logger.config';
import { ELK_LOGGER_SERVICE_DI, ELK_NEST_LOGGER_SERVICE_DI, ELK_LOGGER_SERVICE_BUILDER_DI } from './types/tokens';

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
            ignoreObjects: [TestConfig],
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
    expect(loggerService['recordFormatters'].length).toBe(5);
    expect(loggerService['recordFormatters'][2] instanceof TestFormatter).toBeTruthy();

    expect(loggerService['encodeFormatters'].length).toBe(2);
    expect(loggerService['encodeFormatters'][0] instanceof TestEncodeFormatter).toBeTruthy();
  });

  it('NestElkLoggerService', async () => {
    expect(nestLogger['recordFormatters'].length).toBe(5);
    expect(nestLogger['recordFormatters'][2] instanceof TestFormatter).toBeTruthy();

    expect(nestLogger['encodeFormatters'].length).toBe(2);
    expect(nestLogger['encodeFormatters'][0] instanceof TestEncodeFormatter).toBeTruthy();
  });
});
