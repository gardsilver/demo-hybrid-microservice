import { DiscoveryModule } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { DynamicModule, Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { MetadataExplorer } from 'src/modules/common';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { GracefulShutdownConfig } from './services/graceful-shutdown.config';
import { UncaughtExceptionFilter } from './filters/uncaught-exception.filter';
import { GracefulShutdownEventHandler } from './services/graceful-shutdown.event-handler';
import { GracefulShutdownCountHandler } from './services/graceful-shutdown.count-handle';
import { GracefulShutdownService } from './services/graceful-shutdown.service';
import { GracefulShutdownHealthIndicatorService } from './services/graceful-shutdown.health-indicator.service';

@Module({})
export class GracefulShutdownModule {
  static forRoot(): DynamicModule {
    return {
      module: GracefulShutdownModule,
      global: true,
      imports: [DiscoveryModule, ConfigModule, ElkLoggerModule, PrometheusModule, TerminusModule],
      providers: [
        MetadataExplorer,
        GracefulShutdownConfig,
        GracefulShutdownEventHandler,
        GracefulShutdownCountHandler,
        UncaughtExceptionFilter,
        GracefulShutdownService,
        GracefulShutdownHealthIndicatorService,
      ],
      exports: [GracefulShutdownHealthIndicatorService],
    };
  }
}
