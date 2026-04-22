import { Sequelize } from 'sequelize-typescript';
import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService, SequelizeHealthIndicator } from '@nestjs/terminus';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
  TraceSpanBuilder,
} from 'src/modules/elk-logger';
import { DATABASE_DI } from '../types/tokens';
import { IDatabaseHealthIndicatorOptions } from '../types/types';
import { DatabaseMigrationStatusService } from './database-migration-status.service';

export const DATABASE_HEALTH_INDICATOR_KEY = 'DataBase';
const DEFAULT_PING_TIMEOUT_MS = 10_000;

@Injectable()
export class DatabaseHealthIndicator {
  private readonly logger: IElkLoggerService;

  constructor(
    @Inject(DATABASE_DI)
    private readonly db: Sequelize,
    private readonly sequelizeHealth: SequelizeHealthIndicator,
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly migrationStatus: DatabaseMigrationStatusService,
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI)
    loggerBuilder: IElkLoggerServiceBuilder,
  ) {
    this.logger = loggerBuilder.build({
      module: DatabaseHealthIndicator.name,
    });
  }

  async isHealthy(options?: IDatabaseHealthIndicatorOptions): Promise<HealthIndicatorResult> {
    const timeout = options?.timeout ?? DEFAULT_PING_TIMEOUT_MS;
    const migrationFailedStatus: 'up' | 'down' = options?.migrationFailedStatus ?? 'down';

    let pingError: Error | undefined;
    try {
      await this.sequelizeHealth.pingCheck(DATABASE_HEALTH_INDICATOR_KEY, { connection: this.db, timeout });
    } catch (error) {
      pingError = error as Error;
    }

    const migrationHealthy = this.migrationStatus.isHealthy();

    const details = {
      ping: pingError ? (pingError.message ?? 'failed') : 'ok',
      migration: migrationHealthy
        ? 'ok'
        : {
            error: this.migrationStatus.getError()?.message,
            failedMigration: this.migrationStatus.getFailedMigration(),
          },
    };

    const indicator = this.healthIndicatorService.check(DATABASE_HEALTH_INDICATOR_KEY);

    // Отказ ping'а всегда валит probe: реальная недоступность БД не конфигурируется.
    if (pingError) {
      return indicator.down(details);
    }

    if (!migrationHealthy) {
      // Оригинальная ошибка миграции уже залогирована в migrateUp (error). Здесь логируем warning
      // только когда probe искусственно возвращает 'up' — чтобы оператор заметил, что зелёный статус
      // скрывает реальную проблему. Для 'down' доп. лог не нужен: probe красный, факт проблемы виден.
      if (migrationFailedStatus === 'up') {
        this.logger.warn('Database migrations failed — probe reports up due to migrationFailedStatus option', {
          payload: {
            migration: details.migration,
            exception: this.migrationStatus.getError(),
          },
          ...TraceSpanBuilder.build(),
        });

        return indicator.up(details);
      }

      return indicator.down(details);
    }

    return indicator.up(details);
  }
}
