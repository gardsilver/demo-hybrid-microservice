import { ConfigService } from '@nestjs/config';
import { MockConfigService } from 'tests/nestjs';
import { DatabaseConfig } from './database.config';

describe(DatabaseConfig, () => {
  let config: ConfigService;
  let databaseConfig: DatabaseConfig;

  beforeEach(async () => {
    config = undefined;
    databaseConfig = undefined;
  });

  it('default', async () => {
    config = new MockConfigService() as undefined as ConfigService;
    databaseConfig = new DatabaseConfig(config);

    expect(databaseConfig.getMigrationsEnabled()).toEqual(true);
    expect(databaseConfig.getMigrationsTable()).toEqual('migrations');
    expect(databaseConfig.getHost()).toBeUndefined();
    expect(databaseConfig.getPort()).toBeUndefined();
    expect(databaseConfig.getDialect()).toBeUndefined();
    expect(databaseConfig.getDatabaseName()).toBeUndefined();
    expect(databaseConfig.getPrefix()).toBeUndefined();
    expect(databaseConfig.getDatabaseSchema()).toBeUndefined();
    expect(databaseConfig.getUser()).toBeUndefined();
    expect(databaseConfig.getPassword()).toBeUndefined();
    expect(databaseConfig.getLoggingEnabled()).toEqual(false);
  });

  it('by env', async () => {
    config = new MockConfigService({
      DATABASE_MIGRATIONS_ENABLED: 'Yes',
      DATABASE_MIGRATIONS_TABLE: 'Migrations',
      DATABASE_HOST: 'host',
      DATABASE_PORT: '5432',
      DATABASE_DIALECT: 'postgres',
      DATABASE_NAME: 'database',
      DATABASE_PREFIX: 'test',
      DATABASE_SCHEMA: 'public',
      DATABASE_USER: 'user',
      DATABASE_PASSWORD: 'password',
      DATABASE_LOGGING_ENABLED: 'yes',
    }) as undefined as ConfigService;

    databaseConfig = new DatabaseConfig(config);

    expect(databaseConfig.getMigrationsEnabled()).toEqual(true);
    expect(databaseConfig.getMigrationsTable()).toEqual('Migrations');
    expect(databaseConfig.getHost()).toEqual('host');
    expect(databaseConfig.getPort()).toEqual(5432);
    expect(databaseConfig.getDialect()).toEqual('postgres');
    expect(databaseConfig.getDatabaseName()).toEqual('database');
    expect(databaseConfig.getPrefix()).toEqual('test');
    expect(databaseConfig.getDatabaseSchema()).toEqual('public');
    expect(databaseConfig.getUser()).toEqual('user');
    expect(databaseConfig.getPassword()).toEqual('password');
    expect(databaseConfig.getLoggingEnabled()).toEqual(true);
  });
});
