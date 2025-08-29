import { BehaviorSubject, identity, timeout } from 'rxjs';
import { BeforeApplicationShutdown, Inject, Injectable } from '@nestjs/common';
import { delay, promisesTimeout, TimeoutError } from 'src/modules/date-timestamp';
import { IElkLoggerServiceBuilder, IElkLoggerService, ELK_LOGGER_SERVICE_BUILDER_DI } from 'src/modules/elk-logger';
import { PrometheusManager } from 'src/modules/prometheus';
import { GracefulShutdownConfig } from './graceful-shutdown.config';
import { GracefulShutdownMessages } from '../types/messages';
import { GracefulShutdownEvents } from '../types/types';
import { GracefulShutdownEventHandler } from './graceful-shutdown.event-handler';
import { GracefulShutdownCountHandler } from './graceful-shutdown.count-handle';
import { GRACEFUL_SHUTDOWN_DURATIONS, GRACEFUL_SHUTDOWN_FAILED } from '../types/metrics';

@Injectable()
export class GracefulShutdownService implements BeforeApplicationShutdown {
  private isRun = false;
  private logger: IElkLoggerService;

  constructor(
    private readonly config: GracefulShutdownConfig,
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI)
    loggerBuilder: IElkLoggerServiceBuilder,
    private readonly eventHandler: GracefulShutdownEventHandler,
    private readonly countHandler: GracefulShutdownCountHandler,
    private readonly prometheusManager: PrometheusManager,
  ) {
    this.logger = loggerBuilder.build({
      module: GracefulShutdownService.name,
    });
  }

  public isActive(): boolean {
    return this.isRun;
  }

  async beforeApplicationShutdown(signal?: string) {
    this.logger.info(GracefulShutdownMessages.PROCESS_MESSAGE + ': start', {
      payload: {
        signal,
      },
    });

    if (!this.config.getIsEnabled() || (signal && signal?.toString() !== this.config.getDestroySignal())) {
      this.logger.info(GracefulShutdownMessages.PROCESS_MESSAGE + ': success');

      return;
    }

    this.isRun = true;

    const labels = {
      service: GracefulShutdownService.name,
      signal: signal?.toString() ?? 'undefined',
    };

    const end = this.prometheusManager.histogram().startTimer(GRACEFUL_SHUTDOWN_DURATIONS, { labels });

    try {
      await promisesTimeout(
        this.config.getTimeoutBeforeDestroy(),
        this.eventHandler.emit(GracefulShutdownEvents.BEFORE_DESTROY),
      );

      await promisesTimeout(this.config.getTimeoutDestroy(), this.waitForMethodsDone());

      await promisesTimeout(
        this.config.getTimeoutAfterDestroy(),
        this.eventHandler.emit(GracefulShutdownEvents.AFTER_DESTROY),
      );

      this.logger.info(GracefulShutdownMessages.PROCESS_MESSAGE + ': success', {
        payload: {
          details: ['Waiting Grace Period'],
        },
      });

      end();

      await delay(this.config.getGracePeriod());

      this.logger.info('CALL EXIT 0!');

      process.exit(0);
    } catch (error) {
      end();
      this.prometheusManager.histogram().startTimer(GRACEFUL_SHUTDOWN_FAILED, { labels });

      this.countHandler.statusActiveProcess().then((results) => {
        this.logger.warn(GracefulShutdownMessages.ACTIVE_PROCESS_STATUS_MESSAGE, {
          payload: {
            details: results,
          },
        });
      });

      if (error instanceof TimeoutError) {
        this.logger.error(GracefulShutdownMessages.PROCESS_MESSAGE + ': timeout', {
          payload: {
            error,
          },
        });
      } else {
        this.logger.error(GracefulShutdownMessages.PROCESS_MESSAGE + ': filed', {
          payload: {
            error,
          },
        });
      }

      await delay(this.config.getGracePeriod());

      this.logger.info('CALL EXIT 1!');
      process.exit(1);
    }
  }

  /**
   * Выкидывает ошибку если активные процессы не успели завершиться в установленный период `TIMEOUT_ON_DESTROY`
   */
  private async waitForMethodsDone(): Promise<void> {
    const methodsCountObservable: BehaviorSubject<number> = this.countHandler.getTotalCountActiveMethods();

    this.logger.info(GracefulShutdownMessages.WAIT_METHODS_MESSAGE + ': start');

    return new Promise((resolve, reject) => {
      const subscription = methodsCountObservable
        .pipe(this.config.getTimeoutBeforeDestroy() ? timeout(this.config.getTimeoutDestroy()) : identity)
        .subscribe({
          next: (value) => {
            if (value !== 0) {
              return;
            }
            setTimeout(() => {
              if (subscription) {
                subscription.unsubscribe();
              }
            });

            this.logger.info(GracefulShutdownMessages.WAIT_METHODS_MESSAGE + ': success');

            resolve();
          },
          error: (exception) => {
            setTimeout(() => {
              if (subscription) {
                subscription.unsubscribe();
              }
            });

            const error = this.handleError(exception, methodsCountObservable);

            reject(error);
          },
        });
    });
  }

  private handleError(exception, methodsCountObservable: BehaviorSubject<number>): Error {
    this.logger.error(GracefulShutdownMessages.WAIT_METHODS_MESSAGE + ': timeout', {
      payload: {
        totalCount: methodsCountObservable.value,
        exception,
      },
    });

    return new TimeoutError(this.config.getTimeoutDestroy());
  }
}
