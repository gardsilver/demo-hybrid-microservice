import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerService, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { PrometheusManager } from 'src/modules/prometheus';
import { UNCAUGHT_EXCEPTION_COUNT, UNCAUGHT_REJECTION_COUNT } from '../types/metrics';
import { UncaughtExceptionHelper } from '../helpers/uncaught-exception.helper';
import { GracefulShutdownConfig } from '../services/graceful-shutdown.config';

@Injectable()
export class UncaughtExceptionFilter implements OnModuleInit {
  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI)
    private readonly loggerBuilder: IElkLoggerServiceBuilder,
    private readonly config: GracefulShutdownConfig,
    private readonly prometheusManager: PrometheusManager,
  ) {}

  onModuleInit() {
    const logger = this.loggerBuilder.build({
      module: UncaughtExceptionFilter.name,
    });

    process.on('uncaughtException', (error) => {
      this.handleException(error, logger);
    });

    process.on('unhandledRejection', (reason) => {
      this.handleRejection(reason, logger);
    });
  }

  private handleException(error, logger: IElkLoggerService): void {
    logger.fatal('Critical error - uncaughtException', {
      payload: { error },
    });

    this.prometheusManager.counter().increment(UNCAUGHT_EXCEPTION_COUNT, {
      labels: UncaughtExceptionHelper.getUncaughtExceptionLabels(error),
    });

    this.closeApp();
  }

  private handleRejection(reason, logger: IElkLoggerService): void {
    logger.fatal('Critical error - unhandledRejection', {
      payload: { reason },
    });

    this.prometheusManager.counter().increment(UNCAUGHT_REJECTION_COUNT, {
      labels: UncaughtExceptionHelper.getRejectionLabels(reason),
    });

    this.closeApp();
  }

  private closeApp() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process.emit(this.config.getDestroySignal() as undefined as any);
  }
}
