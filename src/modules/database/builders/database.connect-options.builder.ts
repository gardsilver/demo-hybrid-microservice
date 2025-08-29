import { Options, Dialect } from 'sequelize';
import { IElkLoggerService } from 'src/modules/elk-logger';
import { DatabaseConfig } from '../services/database.config';

export interface IConnectOptions
  extends Pick<
    Required<Options>,
    'dialect' | 'host' | 'port' | 'schema' | 'database' | 'username' | 'password' | 'logging' | 'benchmark'
  > {}

export class DatabaseConnectOptionsBuilder {
  static build(config: DatabaseConfig, logger: IElkLoggerService): IConnectOptions {
    return {
      dialect: config.getDialect() as undefined as Dialect,
      host: config.getHost(),
      port: config.getPort(),
      schema: config.getDatabaseSchema(),
      database: config.getDatabaseName(),
      username: config.getUser(),
      password: config.getPassword(),
      benchmark: config.getLoggingEnabled(),
      logging: config.getLoggingEnabled()
        ? (sql, tm?: number) => {
            logger.info('DB query', {
              module: 'query',
              payload: {
                sql,
                executeTime: tm,
              },
            });
          }
        : () => {
            /** Nothing */
          },
    };
  }
}
