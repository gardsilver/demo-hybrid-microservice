/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryTypes } from 'sequelize';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { LoggerMarkers } from 'src/modules/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, ElkLoggerModule, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { PrometheusManager, PrometheusModule } from 'src/modules/prometheus';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { mockSequelize } from 'tests/sequelize-typescript';
import { DatabaseConnectBuilder } from './database.connect.builder';
import { DatabaseConfig } from '../services/database.config';

jest.mock('sequelize-typescript', () => {
  return { Sequelize: jest.fn(() => mockSequelize) };
});

const mockMigrations = {
  async up(queryInterface, sequelize) {
    sequelize.query('SELECT 1');
  },
  async down(queryInterface, sequelize) {
    throw new Error('Откат миграции запрещен');
  },
};

jest.mock('test-migrations_002.js', () => mockMigrations, {
  virtual: true,
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

    jest.clearAllMocks();
  });

  it('build no migrations', async () => {
    jest.spyOn(databaseConfig, 'getMigrationsEnabled').mockImplementation(() => false);

    const db = await DatabaseConnectBuilder.build(loggerBuilder, prometheusManager, databaseConfig);

    expect(db).toEqual(mockSequelize);
  });

  it('build with migrations success', async () => {
    const sqlGetMigrationsCompleted = 'SELECT migrateTable.name FROM public.test_migrations as migrateTable;';

    jest.spyOn(path, 'resolve').mockImplementation(() => 'test-migrations_002.js');

    jest.spyOn(databaseConfig, 'getMigrationsEnabled').mockImplementation(() => true);
    jest
      .spyOn(fs, 'readdirSync')
      .mockImplementation(() => ['test-migrations_001.js', 'test-migrations_002.js'] as any[]);

    const spyQuery = jest.spyOn(mockSequelize, 'query').mockImplementation(async (sql?: string) => {
      return (
        {
          [sqlGetMigrationsCompleted]: [
            {
              name: 'test-migrations_001.js',
            },
          ],
        }[sql] ?? []
      );
    });

    let db = await DatabaseConnectBuilder.build(loggerBuilder, prometheusManager, databaseConfig);

    expect(db).toEqual(mockSequelize);
    expect(spyQuery).toHaveBeenCalledTimes(0);

    DatabaseConnectBuilder['db'] = undefined;

    db = await DatabaseConnectBuilder.build(loggerBuilder, prometheusManager, databaseConfig);

    expect(db).toEqual(mockSequelize);

    expect(spyQuery).toHaveBeenCalledTimes(9);

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
    expect(spyQuery).toHaveBeenCalledWith(sqlGetMigrationsCompleted, {
      type: QueryTypes.SELECT,
    });

    expect(spyQuery).toHaveBeenCalledWith('SELECT 1');
    expect(spyQuery).toHaveBeenCalledWith(
      "INSERT INTO public.test_migrations (name) VALUES ('test-migrations_002.js');",
    );

    expect(spyQuery).toHaveBeenCalledWith('COMMIT;');
  });

  it('build with migrations filed', async () => {
    const error = new Error('Query Error');

    jest.spyOn(mockMigrations, 'up').mockImplementation(() => {
      throw error;
    });

    const spyLogger = jest.spyOn(logger, 'error');
    const sqlTables = "SELECT tablename FROM pg_tables WHERE schemaname = 'public';";
    const sqlGetMigrationsCompleted = 'SELECT migrateTable.name FROM public.test_migrations as migrateTable;';

    jest.spyOn(path, 'resolve').mockImplementation(() => 'test-migrations_002.js');

    jest.spyOn(databaseConfig, 'getMigrationsEnabled').mockImplementation(() => true);
    jest
      .spyOn(fs, 'readdirSync')
      .mockImplementation(() => ['test-migrations_001.js', 'test-migrations_002.js'] as any[]);

    const spyQuery = jest.spyOn(mockSequelize, 'query').mockImplementation(async (sql: string) => {
      return (
        {
          [sqlGetMigrationsCompleted]: [
            {
              name: 'test-migrations_001.js',
            },
          ],
          [sqlTables]: [
            {
              tablename: 'test_migrations',
            },
          ],
        }[sql] ?? []
      );
    });

    let db = await DatabaseConnectBuilder.build(loggerBuilder, prometheusManager, databaseConfig);

    expect(db).toEqual(mockSequelize);
    expect(spyQuery).toHaveBeenCalledTimes(0);

    DatabaseConnectBuilder['db'] = undefined;

    db = await DatabaseConnectBuilder.build(loggerBuilder, prometheusManager, databaseConfig);

    expect(db).toEqual(mockSequelize);

    expect(spyQuery).toHaveBeenCalledTimes(6);

    expect(spyQuery).toHaveBeenCalledWith(
      'CREATE TABLE IF NOT EXISTS public.test_migrations (apply_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), name varchar(255) NOT NULL);',
    );
    expect(spyQuery).toHaveBeenCalledWith('BEGIN;');
    expect(spyQuery).toHaveBeenCalledWith('LOCK TABLE public.test_migrations IN ACCESS EXCLUSIVE MODE;');
    expect(spyQuery).toHaveBeenCalledWith(sqlTables, {
      type: QueryTypes.SELECT,
    });
    expect(spyQuery).toHaveBeenCalledWith(sqlGetMigrationsCompleted, {
      type: QueryTypes.SELECT,
    });

    expect(spyLogger).toHaveBeenCalledWith('Error applying migration test-migrations_002.js', {
      module: 'migrateUp',
      markers: [LoggerMarkers.FAILED],
      payload: {
        error,
      },
    });

    expect(spyQuery).toHaveBeenCalledWith('ROLLBACK;');
  });

  it('build with connection error', async () => {
    const error = new Error('Connection Error');
    const spyLogger = jest.spyOn(logger, 'error');

    jest.spyOn(mockSequelize, 'authenticate').mockImplementation(async () => {
      throw error;
    });

    DatabaseConnectBuilder['db'] = undefined;

    await DatabaseConnectBuilder.build(loggerBuilder, prometheusManager, databaseConfig);

    expect(spyLogger).toHaveBeenCalledWith('Authenticate failed', {
      module: 'init',
      markers: [LoggerMarkers.FAILED],
      payload: { error },
    });
  });
});
