/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import * as fs from 'fs';
import * as path from 'path';
import { LoggerMarkers } from 'src/modules/common';
import { IElkLoggerService, IElkLoggerServiceBuilder, TraceSpanBuilder } from 'src/modules/elk-logger';
import { PrometheusManager } from 'src/modules/prometheus';
import { DatabaseConfig } from '../services/database.config';
import { DatabaseMigrationStatusService } from '../services/database-migration-status.service';
import { IMigration, IModelConfig } from '../types/types';
import { DB_QUERY_DURATIONS, DB_QUERY_FAILED } from '../types/metrics';
import { DatabaseConnectOptionsBuilder } from './database.connect-options.builder';
import { IMigrationSqlBuilder, MigrationSqlBuilder } from './migration-sql.builder';

export abstract class DatabaseConnectBuilder {
  private static db: Sequelize;

  public static async build(
    loggerBuilder: IElkLoggerServiceBuilder,
    prometheusManager: PrometheusManager,
    migrationStatus: DatabaseMigrationStatusService,
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

      prometheusManager.counter().increment(DB_QUERY_FAILED, {
        labels: {
          service: 'DatabaseModule',
          method: 'authenticate',
        },
      });
    }

    if (config.getMigrationsEnabled()) {
      await DatabaseConnectBuilder.migrateUp(config, logger, prometheusManager, migrationStatus);
    }

    return DatabaseConnectBuilder.db;
  }

  private static async migrateUp(
    config: DatabaseConfig,
    logger: IElkLoggerService,
    prometheusManager: PrometheusManager,
    migrationStatus: DatabaseMigrationStatusService,
  ) {
    const labels = {
      service: 'DatabaseModule',
      method: 'migrateUp',
    };

    const databaseSchema = config.getDatabaseSchema();
    const migrationsTable = [config.getPrefix(), config.getMigrationsTable()].filter((v) => v !== undefined).join('_');

    const end = prometheusManager.histogram().startTimer(DB_QUERY_DURATIONS, { labels });

    let sqlBuilder: IMigrationSqlBuilder;
    try {
      sqlBuilder = MigrationSqlBuilder.build(DatabaseConnectBuilder.db.getDialect(), databaseSchema, migrationsTable);
    } catch (error) {
      logger.error('Error applying migrations', {
        markers: [LoggerMarkers.FAILED],
        module: 'migrateUp',
        payload: { error },
      });
      migrationStatus.markFailure(error as Error);
      prometheusManager.counter().increment(DB_QUERY_FAILED, { labels });
      end();

      return;
    }

    let lockAcquired = false;
    let transactionStarted = false;
    let failingMigration: string | undefined;

    try {
      await DatabaseConnectBuilder.db.query(sqlBuilder.createIfNotExistsSql());

      const acquireLockSql = sqlBuilder.acquireLockSql();
      if (acquireLockSql !== undefined) {
        await DatabaseConnectBuilder.db.query(acquireLockSql);
        lockAcquired = true;
      }

      await DatabaseConnectBuilder.db.query(sqlBuilder.beginSql());
      transactionStarted = true;

      const inTransactionLockSql = sqlBuilder.inTransactionLockSql();
      if (inTransactionLockSql !== undefined) {
        await DatabaseConnectBuilder.db.query(inTransactionLockSql);
      }

      const tables: any = await DatabaseConnectBuilder.db.query(sqlBuilder.listTablesSql(), {
        type: QueryTypes.SELECT,
      });

      if (!tables.some((table: { name: string }) => table.name === migrationsTable)) {
        await DatabaseConnectBuilder.db.query(sqlBuilder.createTableSql());
      }

      const migrationsCompleted: any = await DatabaseConnectBuilder.db.query(sqlBuilder.listCompletedMigrationsSql(), {
        type: QueryTypes.SELECT,
      });

      const migrations = fs
        .readdirSync(path.relative(process.cwd(), 'migrations'))
        .filter((file) => path.extname(file) === '.js');

      const tasks: string[] = [];

      migrations.forEach((migration) => {
        if (!migrationsCompleted.some((m: { name: string }) => m.name === migration)) {
          tasks.push(migration);
        }
      });

      for (const migration of tasks) {
        logger.info(`Ran migration ${migration}`, { module: 'migrateUp' });
        failingMigration = migration;

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const instance: IMigration = require(path.resolve(process.cwd(), 'migrations', migration));
        try {
          await instance.up(DatabaseConnectBuilder.db.getQueryInterface(), DatabaseConnectBuilder.db);

          await DatabaseConnectBuilder.db.query(sqlBuilder.insertMigrationSql(migration));

          logger.info(`Migration ${migration} applied`, { module: 'migrateUp' });
          failingMigration = undefined;
        } catch (error) {
          logger.error(`Error applying migration ${migration}`, {
            module: 'migrateUp',
            markers: [LoggerMarkers.FAILED],
            payload: {
              error,
            },
          });

          await DatabaseConnectBuilder.db.query(sqlBuilder.rollbackSql());
          transactionStarted = false;

          throw error;
        }
      }

      await DatabaseConnectBuilder.db.query(sqlBuilder.commitSql());
      transactionStarted = false;
      migrationStatus.markSuccess();
    } catch (error) {
      logger.error(`Error applying migrations`, {
        markers: [LoggerMarkers.FAILED],
        module: 'migrateUp',
        payload: {
          error,
        },
      });

      if (transactionStarted) {
        try {
          await DatabaseConnectBuilder.db.query(sqlBuilder.rollbackSql());
        } catch {
          /** Nothing */
        }
      }

      migrationStatus.markFailure(error as Error, failingMigration);
      prometheusManager.counter().increment(DB_QUERY_FAILED, { labels });
    } finally {
      if (lockAcquired) {
        const releaseLockSql = sqlBuilder!.releaseLockSql();
        if (releaseLockSql !== undefined) {
          try {
            await DatabaseConnectBuilder.db.query(releaseLockSql);
          } catch {
            /** Nothing */
          }
        }
      }
      end();
    }
  }
}
