import { QueryTypes } from 'sequelize';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ELK_LOGGER_SERVICE_BUILDER_DI, ElkLoggerModule, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { PrometheusManager, PrometheusModule } from 'src/modules/prometheus';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { DatabaseConnectBuilder } from './database.connect.builder';
import { DatabaseConfig } from '../services/database.config';

class MockSequelize {
  async authenticate(): Promise<void> {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async query(): Promise<any> {}
}
const mSequelize = new MockSequelize();

jest.mock('sequelize-typescript', () => {
  return { Sequelize: jest.fn(() => mSequelize) };
});

describe(DatabaseConnectBuilder.build.name, () => {
  let databaseConfig: DatabaseConfig;
  let logger: MockElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;
  let prometheusManager: PrometheusManager;

  beforeEach(async () => {
    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      imports: [ElkLoggerModule.forRoot(), PrometheusModule],
      providers: [
        {
          provide: ConfigService,
          useValue: new MockConfigService({
            DATABASE_HOST: 'host',
            DATABASE_PORT: '5432',
            DATABASE_DIALECT: 'postgres',
            DATABASE_NAME: 'database',
            DATABASE_PREFIX: 'test',
            DATABASE_SCHEMA: 'public',
            DATABASE_USER: 'user',
            DATABASE_PASSWORD: 'password',
          }),
        },
        DatabaseConfig,
      ],
    })
      .overrideProvider(ELK_LOGGER_SERVICE_BUILDER_DI)
      .useValue({
        build: () => logger,
      })
      .compile();

    databaseConfig = module.get(DatabaseConfig);
    loggerBuilder = module.get(ELK_LOGGER_SERVICE_BUILDER_DI);
    prometheusManager = module.get(PrometheusManager);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('build no migrations', async () => {
    const db = await DatabaseConnectBuilder.build(loggerBuilder, prometheusManager, databaseConfig);
    expect(db).toEqual(mSequelize);
  });

  it('build with migrations', async () => {
    jest.spyOn(databaseConfig, 'getMigrationsEnabled').mockImplementation(() => true);
    jest.spyOn(fs, 'readdirSync').mockImplementation(() => []);
    const spyQuery = jest.spyOn(mSequelize, 'query').mockImplementation(async () => []);
    DatabaseConnectBuilder['db'] = undefined;

    const db = await DatabaseConnectBuilder.build(loggerBuilder, prometheusManager, databaseConfig);

    expect(db).toEqual(mSequelize);

    expect(spyQuery).toHaveBeenCalledTimes(7);
    expect(spyQuery).toHaveBeenCalledWith(
      'CREATE TABLE IF NOT EXISTS public.test_migrations (apply_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), name varchar(255) NOT NULL);',
    );
    expect(spyQuery).toHaveBeenCalledWith('BEGIN;');
    expect(spyQuery).toHaveBeenCalledWith('LOCK TABLE public.test_migrations IN ACCESS EXCLUSIVE MODE;');
    expect(spyQuery).toHaveBeenCalledWith("SELECT tablename FROM pg_tables WHERE schemaname = 'public';", {
      type: QueryTypes.SELECT,
    });
    expect(spyQuery).toHaveBeenCalledWith(
      'CREATE TABLE public.test_migrations (apply_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), name varchar(255) NOT NULL);',
    );
    expect(spyQuery).toHaveBeenCalledWith('SELECT migrateTable.name FROM public.test_migrations as migrateTable;', {
      type: QueryTypes.SELECT,
    });
    expect(spyQuery).toHaveBeenCalledWith('COMMIT;');
  });
});
