import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { Sequelize } from 'sequelize-typescript';
import { ELK_LOGGER_SERVICE_BUILDER_DI, ElkLoggerModule, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { PrometheusManager, PrometheusModule } from 'src/modules/prometheus';
import { DatabaseConfig } from './services/database.config';
import { DatabaseMigrationStatusService } from './services/database-migration-status.service';
import { DatabaseHealthIndicator } from './services/database.health-indicator';
import { IModelConfig } from './types/types';
import { DATABASE_DI } from './types/tokens';
import { DatabaseConnectBuilder } from './builders/database.connect.builder';

@Module({})
export class DatabaseModule {
  public static forRoot(options?: IModelConfig): DynamicModule {
    return {
      module: DatabaseModule,
      global: true,
      imports: [ConfigModule, ElkLoggerModule, PrometheusModule, TerminusModule],
      exports: [DATABASE_DI, DatabaseMigrationStatusService, DatabaseHealthIndicator],
      providers: [
        DatabaseConfig,
        DatabaseMigrationStatusService,
        {
          provide: DATABASE_DI,
          inject: [DatabaseConfig, ELK_LOGGER_SERVICE_BUILDER_DI, PrometheusManager, DatabaseMigrationStatusService],
          useFactory: async (
            config: DatabaseConfig,
            loggerBuilder: IElkLoggerServiceBuilder,
            prometheusManager: PrometheusManager,
            migrationStatus: DatabaseMigrationStatusService,
          ): Promise<Sequelize> => {
            return await DatabaseConnectBuilder.build(
              loggerBuilder,
              prometheusManager,
              migrationStatus,
              config,
              options,
            );
          },
        },
        DatabaseHealthIndicator,
      ],
    };
  }
}
