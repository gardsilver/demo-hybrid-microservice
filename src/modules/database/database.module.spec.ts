import { Sequelize } from 'sequelize-typescript';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  ElkLoggerModule,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
} from 'src/modules/elk-logger';
import { PrometheusManager, PrometheusModule } from 'src/modules/prometheus';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { DatabaseModule } from './database.module';
import { DatabaseConnectBuilder } from './builders/database.connect.builder';
import { DATABASE_DI } from './types/tokens';
import { DatabaseConfig } from './services/database.config';
import { DatabaseMigrationStatusService } from './services/database-migration-status.service';

describe(DatabaseModule.name, () => {
  let spy: jest.SpyInstance;
  let configService: ConfigService;
  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let prometheusManager: PrometheusManager;
  let migrationStatus: DatabaseMigrationStatusService;
  let db: unknown;

  beforeEach(async () => {
    jest.clearAllMocks();

    spy = jest.spyOn(DatabaseConnectBuilder, 'build').mockImplementation(async () => ({}) as unknown as Sequelize);

    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule,
        ElkLoggerModule.forRoot(),
        PrometheusModule,
        DatabaseModule.forRoot({
          models: [],
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

    configService = module.get(ConfigService);
    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);
    prometheusManager = module.get(PrometheusManager);
    migrationStatus = module.get(DatabaseMigrationStatusService);
    db = module.get(DATABASE_DI);
  });

  it('init', async () => {
    expect(db).toBeDefined();
    expect(db).toEqual({});
    expect(spy).toHaveBeenCalledWith(
      loggerBuilder,
      prometheusManager,
      migrationStatus,
      new DatabaseConfig(configService),
      { models: [] },
    );
  });
});
