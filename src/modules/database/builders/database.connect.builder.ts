/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import * as fs from 'fs';
import * as path from 'path';
import { LoggerMarkers } from 'src/modules/common';
import { IElkLoggerService, IElkLoggerServiceBuilder, TraceSpanBuilder } from 'src/modules/elk-logger';
import { PrometheusManager } from 'src/modules/prometheus';
import { DatabaseConfig } from '../services/database.config';
import { IMigration, IModelConfig } from '../types/types';
import { DB_QUERY_DURATIONS, DB_QUERY_FAILED } from '../types/metrics';
import { DatabaseConnectOptionsBuilder } from './database.connect-options.builder';

export class DatabaseConnectBuilder {
  private static db: Sequelize;

  static async build(
    loggerBuilder: IElkLoggerServiceBuilder,
    prometheusManager: PrometheusManager,
    config: DatabaseConfig,
    modelConfig?: IModelConfig,
  ): Promise<Sequelize> {
    if (DatabaseConnectBuilder.db) {
      return DatabaseConnectBuilder.db;
    }

    const logger = loggerBuilder.build({
      module: 'DatabaseModule',
      markers: [LoggerMarkers.DB],
      ...TraceSpanBuilder.build(),
    });

    const connectOptions = DatabaseConnectOptionsBuilder.build(config, logger);

    DatabaseConnectBuilder.db = new Sequelize({
      ...connectOptions,
      ...modelConfig,
    });

    try {
      const response = await DatabaseConnectBuilder.db.authenticate();

      logger.info('Authenticate success', {
        module: 'init',
        payload: { response },
      });
    } catch (error) {
      logger.error('Authenticate failed', {
        module: 'init',
        markers: [LoggerMarkers.FAILED],
        payload: { error },
      });
      
      return DatabaseConnectBuilder.db;
    }

    if (config.getMigrationsEnabled()) {
      await DatabaseConnectBuilder.migrateUp(config, logger, prometheusManager);
    }

    return DatabaseConnectBuilder.db;
  }

  private static async migrateUp(
    config: DatabaseConfig,
    logger: IElkLoggerService,
    prometheusManager: PrometheusManager,
  ) {
    const labels = {
      service: 'DatabaseModule',
      method: 'migrateUp',
    };

    const databaseSchema = config.getDatabaseSchema();
    const migrationsTable = [config.getPrefix(), config.getMigrationsTable()].filter((v) => v !== undefined).join('_');

    const end = prometheusManager.histogram().startTimer(DB_QUERY_DURATIONS, { labels });

    try {
      const sql = `CREATE TABLE IF NOT EXISTS ${databaseSchema}.${migrationsTable} (apply_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), name varchar(255) NOT NULL);`;

      await DatabaseConnectBuilder.db.query(sql);

      await DatabaseConnectBuilder.db.query('BEGIN;');

      await DatabaseConnectBuilder.db.query(
        `LOCK TABLE ${databaseSchema}.${migrationsTable} IN ACCESS EXCLUSIVE MODE;`,
      );

      const sqlTables = `SELECT tablename FROM pg_tables WHERE schemaname = '${databaseSchema}';`;

      const tables: any = await DatabaseConnectBuilder.db.query(sqlTables, { type: QueryTypes.SELECT });

      if (!tables.some((table) => table.tablename === migrationsTable)) {
        await DatabaseConnectBuilder.db.query(
          `CREATE TABLE ${databaseSchema}.${migrationsTable} (apply_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), name varchar(255) NOT NULL);`,
        );
      }

      const sqlGetMigrationsCompleted = `SELECT migrateTable.name FROM ${databaseSchema}.${migrationsTable} as migrateTable;`;
      const migrationsCompleted: any = await DatabaseConnectBuilder.db.query(sqlGetMigrationsCompleted, {
        type: QueryTypes.SELECT,
      });

      const migrations = fs
        .readdirSync(path.relative(process.cwd(), 'migrations'))
        .filter((file) => path.extname(file) === '.js');

      const tasks = [];

      migrations.forEach((migration) => {
        if (!migrationsCompleted.some((m) => m.name === migration)) {
          tasks.push(migration);
        }
      });

      for (const migration of tasks) {
        logger.info(`Ran migration ${migration}`, { module: 'migrateUp' });

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const instance: IMigration = require(path.resolve(process.cwd(), 'migrations', migration));
        try {
          await instance.up(DatabaseConnectBuilder.db.getQueryInterface(), DatabaseConnectBuilder.db);

          const sql = `INSERT INTO ${databaseSchema}.${migrationsTable} (name) VALUES ('${migration}');`;

          await DatabaseConnectBuilder.db.query(sql);

          logger.info(`Migration ${migration} applied`, { module: 'migrateUp' });
        } catch (error) {
          logger.error(`Error applying migration ${migration}`, {
            module: 'migrateUp',
            markers: [LoggerMarkers.FAILED],
            payload: {
              error,
            },
          });

          await DatabaseConnectBuilder.db.query('ROLLBACK;');

          throw error;
        }
      }

      await DatabaseConnectBuilder.db.query('COMMIT;');
    } catch (error) {
      logger.error(`Error applying migrations`, {
        markers: [LoggerMarkers.FAILED],
        module: 'migrateUp',
        payload: {
          error,
        },
      });

      prometheusManager.counter().increment(DB_QUERY_FAILED);
    } finally {
      end();
    }
  }
}
