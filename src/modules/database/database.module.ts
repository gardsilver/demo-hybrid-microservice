import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Sequelize } from 'sequelize-typescript';
import { ELK_LOGGER_SERVICE_BUILDER_DI, ElkLoggerModule, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { PrometheusManager, PrometheusModule } from 'src/modules/prometheus';
import { DatabaseConfig } from './services/database.config';
import { IModelConfig } from './types/types';
import { DATABASE_DI } from './types/tokens';
import { DatabaseConnectBuilder } from './builders/database.connect.builder';

@Module({})
export class DatabaseModule {
  static forRoot(options?: IModelConfig): DynamicModule {
    return {
      module: DatabaseModule,
      global: true,
      imports: [ConfigModule, ElkLoggerModule, PrometheusModule],
      exports: [DATABASE_DI],
      providers: [
        DatabaseConfig,
        {
          provide: DATABASE_DI,
          inject: [DatabaseConfig, ELK_LOGGER_SERVICE_BUILDER_DI, PrometheusManager],
          useFactory: async (
            config: DatabaseConfig,
            loggerBuilder: IElkLoggerServiceBuilder,
            prometheusManager: PrometheusManager,
          ): Promise<Sequelize> => {
            return await DatabaseConnectBuilder.build(loggerBuilder, prometheusManager, config, options);
          },
        },
      ],
    };
  }
}
