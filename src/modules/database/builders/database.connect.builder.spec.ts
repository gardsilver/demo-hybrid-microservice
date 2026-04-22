/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryTypes } from 'sequelize';
import fs from 'fs';
import path from 'path';
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
import { DatabaseMigrationStatusService } from '../services/database-migration-status.service';

jest.mock('sequelize-typescript', () => jest.requireActual('tests/sequelize-typescript').SEQUELIZE_TYPESCRIPT_MOCK);

const mockMigrations = {
  async up(_queryInterface: unknown, sequelize: { query: (sql: string) => void }) {
    sequelize.query('SELECT 1');
  },
  async down(_queryInterface: unknown, _sequelize: unknown) {
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
  let migrationStatus: DatabaseMigrationStatusService;

  const setUp = async (envOverrides: Record<string, string> = {}) => {
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
            ...envOverrides,
          }),
        },
        DatabaseConfig,
        DatabaseMigrationStatusService,
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
    migrationStatus = module.get(DatabaseMigrationStatusService);

    jest.clearAllMocks();
  };

  beforeEach(async () => {
    await setUp();
  });

  afterEach(() => {
    mockSequelize.setDialect('postgres');
    DatabaseConnectBuilder['db'] = undefined as unknown as (typeof DatabaseConnectBuilder)['db'];
    jest.restoreAllMocks();
  });

  it('build no migrations', async () => {
    jest.spyOn(databaseConfig, 'getMigrationsEnabled').mockImplementation(() => false);

    const db = await DatabaseConnectBuilder.build(loggerBuilder, prometheusManager, migrationStatus, databaseConfig);

    expect(db).toEqual(mockSequelize);
    // Миграции не включены — статус остаётся healthy (ничего не было помечено как failure).
    expect(migrationStatus.isHealthy()).toBe(true);
  });

  describe('postgres dialect', () => {
    beforeEach(() => {
      mockSequelize.setDialect('postgres');
    });

    it('build with migrations success', async () => {
      const sqlGetMigrationsCompleted = 'SELECT name FROM public.test_migrations;';

      jest.spyOn(path, 'resolve').mockImplementation(() => 'test-migrations_002.js');

      jest.spyOn(databaseConfig, 'getMigrationsEnabled').mockImplementation(() => true);
      jest
        .spyOn(fs, 'readdirSync')
        .mockImplementation(() => ['test-migrations_001.js', 'test-migrations_002.js'] as any[]);

      const spyQuery = jest.spyOn(mockSequelize, 'query').mockImplementation(async (sql?: string) => {
        const responses: Record<string, unknown[]> = {
          [sqlGetMigrationsCompleted]: [{ name: 'test-migrations_001.js' }],
        };

        return sql ? (responses[sql] ?? []) : [];
      });

      const db = await DatabaseConnectBuilder.build(loggerBuilder, prometheusManager, migrationStatus, databaseConfig);

      expect(db).toEqual(mockSequelize);

      expect(spyQuery).toHaveBeenCalledWith(
        'CREATE TABLE IF NOT EXISTS public.test_migrations (apply_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), name varchar(255) NOT NULL);',
      );
      expect(spyQuery).toHaveBeenCalledWith('BEGIN;');
      expect(spyQuery).toHaveBeenCalledWith('LOCK TABLE public.test_migrations IN ACCESS EXCLUSIVE MODE;');
      expect(spyQuery).toHaveBeenCalledWith("SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public';", {
        type: QueryTypes.SELECT,
      });
      expect(spyQuery).toHaveBeenCalledWith(
        'CREATE TABLE public.test_migrations (apply_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), name varchar(255) NOT NULL);',
      );
      expect(spyQuery).toHaveBeenCalledWith(sqlGetMigrationsCompleted, { type: QueryTypes.SELECT });

      expect(spyQuery).toHaveBeenCalledWith('SELECT 1');
      expect(spyQuery).toHaveBeenCalledWith(
        "INSERT INTO public.test_migrations (name) VALUES ('test-migrations_002.js');",
      );
      expect(spyQuery).toHaveBeenCalledWith('COMMIT;');

      // advisory-lock не применяется в Postgres
      expect(spyQuery).not.toHaveBeenCalledWith(expect.stringContaining('GET_LOCK'));
      expect(spyQuery).not.toHaveBeenCalledWith(expect.stringContaining('RELEASE_LOCK'));

      expect(migrationStatus.isHealthy()).toBe(true);
      expect(migrationStatus.getError()).toBeUndefined();
    });

    it('build with migrations failed', async () => {
      const error = new Error('Query Error');

      jest.spyOn(mockMigrations, 'up').mockImplementation(() => {
        throw error;
      });

      const spyLogger = jest.spyOn(logger, 'error');
      const sqlTables = "SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public';";
      const sqlGetMigrationsCompleted = 'SELECT name FROM public.test_migrations;';

      jest.spyOn(path, 'resolve').mockImplementation(() => 'test-migrations_002.js');

      jest.spyOn(databaseConfig, 'getMigrationsEnabled').mockImplementation(() => true);
      jest
        .spyOn(fs, 'readdirSync')
        .mockImplementation(() => ['test-migrations_001.js', 'test-migrations_002.js'] as any[]);

      const spyQuery = jest.spyOn(mockSequelize, 'query').mockImplementation(async (sql?: string) => {
        const responses: Record<string, unknown[]> = {
          [sqlGetMigrationsCompleted]: [{ name: 'test-migrations_001.js' }],
          [sqlTables]: [{ name: 'test_migrations' }],
        };

        return sql ? (responses[sql] ?? []) : [];
      });

      const db = await DatabaseConnectBuilder.build(loggerBuilder, prometheusManager, migrationStatus, databaseConfig);

      expect(db).toEqual(mockSequelize);

      expect(spyQuery).toHaveBeenCalledWith(
        'CREATE TABLE IF NOT EXISTS public.test_migrations (apply_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), name varchar(255) NOT NULL);',
      );
      expect(spyQuery).toHaveBeenCalledWith('BEGIN;');
      expect(spyQuery).toHaveBeenCalledWith('LOCK TABLE public.test_migrations IN ACCESS EXCLUSIVE MODE;');
      expect(spyQuery).toHaveBeenCalledWith(sqlTables, { type: QueryTypes.SELECT });
      expect(spyQuery).toHaveBeenCalledWith(sqlGetMigrationsCompleted, { type: QueryTypes.SELECT });

      expect(spyLogger).toHaveBeenCalledWith('Error applying migration test-migrations_002.js', {
        module: 'migrateUp',
        markers: [LoggerMarkers.FAILED],
        payload: { error },
      });

      expect(spyQuery).toHaveBeenCalledWith('ROLLBACK;');

      expect(migrationStatus.isHealthy()).toBe(false);
      expect(migrationStatus.getError()).toBe(error);
      expect(migrationStatus.getFailedMigration()).toBe('test-migrations_002.js');
    });
  });

  describe('mysql dialect', () => {
    beforeEach(async () => {
      await setUp({
        DATABASE_DIALECT: 'mysql',
        DATABASE_PORT: '3306',
        DATABASE_SCHEMA: 'demo',
      });
      mockSequelize.setDialect('mysql');
    });

    it('build with migrations success', async () => {
      const sqlGetMigrationsCompleted = 'SELECT name FROM demo.test_migrations;';

      jest.spyOn(path, 'resolve').mockImplementation(() => 'test-migrations_002.js');

      jest.spyOn(databaseConfig, 'getMigrationsEnabled').mockImplementation(() => true);
      jest
        .spyOn(fs, 'readdirSync')
        .mockImplementation(() => ['test-migrations_001.js', 'test-migrations_002.js'] as any[]);

      const spyQuery = jest.spyOn(mockSequelize, 'query').mockImplementation(async (sql?: string) => {
        const responses: Record<string, unknown[]> = {
          [sqlGetMigrationsCompleted]: [{ name: 'test-migrations_001.js' }],
        };

        return sql ? (responses[sql] ?? []) : [];
      });

      const db = await DatabaseConnectBuilder.build(loggerBuilder, prometheusManager, migrationStatus, databaseConfig);

      expect(db).toEqual(mockSequelize);

      expect(spyQuery).toHaveBeenCalledWith(
        'CREATE TABLE IF NOT EXISTS demo.test_migrations (apply_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, name varchar(255) NOT NULL);',
      );
      // Advisory lock берётся до транзакции.
      expect(spyQuery).toHaveBeenCalledWith("SELECT GET_LOCK('migration_demo_test_migrations', 30);");
      expect(spyQuery).toHaveBeenCalledWith('START TRANSACTION;');

      // LOCK TABLE ... IN ACCESS EXCLUSIVE MODE не применяется в MySQL.
      expect(spyQuery).not.toHaveBeenCalledWith(expect.stringContaining('LOCK TABLE'));
      expect(spyQuery).not.toHaveBeenCalledWith(expect.stringContaining('ACCESS EXCLUSIVE'));
      // pg_tables / TIMESTAMPTZ не применяются в MySQL.
      expect(spyQuery).not.toHaveBeenCalledWith(expect.stringContaining('pg_tables'));
      expect(spyQuery).not.toHaveBeenCalledWith(expect.stringContaining('TIMESTAMPTZ'));

      expect(spyQuery).toHaveBeenCalledWith(
        "SELECT TABLE_NAME AS name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'demo';",
        { type: QueryTypes.SELECT },
      );
      expect(spyQuery).toHaveBeenCalledWith(
        'CREATE TABLE demo.test_migrations (apply_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, name varchar(255) NOT NULL);',
      );
      expect(spyQuery).toHaveBeenCalledWith(sqlGetMigrationsCompleted, { type: QueryTypes.SELECT });

      expect(spyQuery).toHaveBeenCalledWith('SELECT 1');
      expect(spyQuery).toHaveBeenCalledWith(
        "INSERT INTO demo.test_migrations (name) VALUES ('test-migrations_002.js');",
      );
      expect(spyQuery).toHaveBeenCalledWith('COMMIT;');
      // Релиз advisory lock после транзакции.
      expect(spyQuery).toHaveBeenCalledWith("SELECT RELEASE_LOCK('migration_demo_test_migrations');");

      expect(migrationStatus.isHealthy()).toBe(true);
    });

    it('build with migrations failed — rollback и release lock', async () => {
      const error = new Error('Query Error');

      jest.spyOn(mockMigrations, 'up').mockImplementation(() => {
        throw error;
      });

      const spyLogger = jest.spyOn(logger, 'error');
      const sqlTables = "SELECT TABLE_NAME AS name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'demo';";
      const sqlGetMigrationsCompleted = 'SELECT name FROM demo.test_migrations;';

      jest.spyOn(path, 'resolve').mockImplementation(() => 'test-migrations_002.js');

      jest.spyOn(databaseConfig, 'getMigrationsEnabled').mockImplementation(() => true);
      jest
        .spyOn(fs, 'readdirSync')
        .mockImplementation(() => ['test-migrations_001.js', 'test-migrations_002.js'] as any[]);

      const spyQuery = jest.spyOn(mockSequelize, 'query').mockImplementation(async (sql?: string) => {
        const responses: Record<string, unknown[]> = {
          [sqlGetMigrationsCompleted]: [{ name: 'test-migrations_001.js' }],
          [sqlTables]: [{ name: 'test_migrations' }],
        };

        return sql ? (responses[sql] ?? []) : [];
      });

      const db = await DatabaseConnectBuilder.build(loggerBuilder, prometheusManager, migrationStatus, databaseConfig);

      expect(db).toEqual(mockSequelize);

      expect(spyLogger).toHaveBeenCalledWith('Error applying migration test-migrations_002.js', {
        module: 'migrateUp',
        markers: [LoggerMarkers.FAILED],
        payload: { error },
      });

      expect(spyQuery).toHaveBeenCalledWith('ROLLBACK;');
      // Lock должен быть всё равно освобождён
      expect(spyQuery).toHaveBeenCalledWith("SELECT RELEASE_LOCK('migration_demo_test_migrations');");

      expect(migrationStatus.isHealthy()).toBe(false);
      expect(migrationStatus.getError()).toBe(error);
      expect(migrationStatus.getFailedMigration()).toBe('test-migrations_002.js');
    });
  });

  it('unsupported dialect — миграции не применяются и пишется ошибка', async () => {
    mockSequelize.setDialect('sqlite');
    const spyLogger = jest.spyOn(logger, 'error');

    jest.spyOn(databaseConfig, 'getMigrationsEnabled').mockImplementation(() => true);

    const spyQuery = jest.spyOn(mockSequelize, 'query').mockImplementation(async () => []);

    await DatabaseConnectBuilder.build(loggerBuilder, prometheusManager, migrationStatus, databaseConfig);

    expect(spyLogger).toHaveBeenCalledWith(
      'Error applying migrations',
      expect.objectContaining({
        module: 'migrateUp',
        markers: [LoggerMarkers.FAILED],
        payload: expect.objectContaining({
          error: expect.objectContaining({
            message: expect.stringContaining("unsupported dialect 'sqlite'"),
          }),
        }),
      }),
    );
    // Ни один SQL миграций не исполнился
    expect(spyQuery).not.toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE'));

    // Статус миграций помечен как failure — health-индикатор это отразит.
    expect(migrationStatus.isHealthy()).toBe(false);
    expect(migrationStatus.getError()?.message).toContain("unsupported dialect 'sqlite'");
    expect(migrationStatus.getFailedMigration()).toBeUndefined();
  });

  it('build with connection error', async () => {
    const error = new Error('Connection Error');
    const spyLogger = jest.spyOn(logger, 'error');

    jest.spyOn(mockSequelize, 'authenticate').mockImplementation(async () => {
      throw error;
    });

    await DatabaseConnectBuilder.build(loggerBuilder, prometheusManager, migrationStatus, databaseConfig);

    expect(spyLogger).toHaveBeenCalledWith('Authenticate failed', {
      module: 'init',
      markers: [LoggerMarkers.FAILED],
      payload: { error },
    });
  });
});
