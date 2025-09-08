import { ConfigService } from '@nestjs/config';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { MockConfigService } from 'tests/nestjs';
import { DatabaseConnectOptionsBuilder } from './database.connect-options.builder';
import { DatabaseConfig } from '../services/database.config';

describe(DatabaseConnectOptionsBuilder.name, () => {
  it('build with logging', async () => {
    const config = new MockConfigService({
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

    const databaseConfig = new DatabaseConfig(config);
    const logger = new MockElkLoggerService();

    const options = DatabaseConnectOptionsBuilder.build(databaseConfig, logger);

    expect({
      ...options,
      logging: options.logging['length'],
    }).toEqual({
      dialect: 'postgres',
      host: 'host',
      port: 5432,
      schema: 'public',
      database: 'database',
      username: 'user',
      password: 'password',
      benchmark: true,
      logging: 2,
    });

    const spyLogger = jest.spyOn(logger, 'info');

    expect(typeof options.logging).toBe('function');

    (options.logging as (sql: string, timing?: number) => void)('sql', 1);

    expect(spyLogger).toHaveBeenCalledWith('DB query', {
      module: 'query',
      payload: {
        sql: 'sql',
        executeTime: 1,
      },
    });
  });

  it('build with out logging', async () => {
    const config = new MockConfigService() as undefined as ConfigService;
    const databaseConfig = new DatabaseConfig(config);
    const logger = new MockElkLoggerService();

    const options = DatabaseConnectOptionsBuilder.build(databaseConfig, logger);

    expect({
      ...options,
      logging: options.logging['length'],
    }).toEqual({
      benchmark: false,
      logging: 0,
    });
  });
});
