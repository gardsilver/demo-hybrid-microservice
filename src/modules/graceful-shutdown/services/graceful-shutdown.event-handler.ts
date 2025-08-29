import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { MetadataExplorer, ITargetInstanceMethod, LoggerMarkers, GeneralAsyncContext } from 'src/modules/common';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  IElkLoggerServiceBuilder,
  IElkLoggerService,
  TraceSpanBuilder,
} from 'src/modules/elk-logger';
import { GRACEFUL_SHUTDOWN_ON_EVENT_KEY } from '../types/constants';
import {
  GracefulShutdownEventMetadata,
  GracefulShutdownEvents,
  ResolveEventType,
  ResultsEventType,
} from '../types/types';

interface ITargetOnEvent extends ITargetInstanceMethod<GracefulShutdownEventMetadata> {}

@Injectable()
export class GracefulShutdownEventHandler implements OnModuleInit {
  private onEventHandlers: ITargetOnEvent[];
  private logger: IElkLoggerService;

  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI)
    loggerBuilder: IElkLoggerServiceBuilder,
    private readonly metadataExplorer: MetadataExplorer,
  ) {
    this.logger = loggerBuilder.build({
      module: GracefulShutdownEventHandler.name,
    });
  }

  @GeneralAsyncContext.define(() => TraceSpanBuilder.build())
  public async onModuleInit(): Promise<void> {
    this.logger.info('Start init decorators GracefulShutdownOnEvent');

    this.onEventHandlers =
      this.metadataExplorer.searchAllTargetInstanceMethod<GracefulShutdownEventMetadata>(
        GRACEFUL_SHUTDOWN_ON_EVENT_KEY,
      );
    this.logger.info('Completed init decorators GracefulShutdownOnEvent');
  }

  private getHandlersByEvent(event: GracefulShutdownEvents): ITargetOnEvent[] {
    const handlers = this.onEventHandlers.filter((subscriber) => subscriber.metadata.event === event);
    if (!handlers.length) {
      this.logger.warn(`Have not subscribers on ${event}. Use decorator OnShutdownService for subscribe.`);
    }

    return handlers;
  }

  public async emit(event: GracefulShutdownEvents): Promise<void> {
    this.logger.info(`[${event}]: start`);
    const results = await this.processingEvent(event);

    if (results.isSuccess) {
      this.logger.info(`[${event}]: success`, {
        payload: {
          total: results.total,
        },
      });
    } else {
      this.logger.error(`[${event}]: failed`, {
        payload: {
          ...results,
          details: results.details
            .filter((result) => !result.isSuccess)
            .map(
              (result) => `${result.service}.${result.method}: ${result.message ? result.message : 'Unknown error'}`,
            ),
        },
      });
    }
  }

  private async processingEvent(event: GracefulShutdownEvents): Promise<ResultsEventType> {
    const handlers = this.getHandlersByEvent(event);

    const results = await Promise.all(handlers.map((handler) => this.handleEvent(handler)));

    const totalStats = results.reduce(
      (store, current) => {
        return {
          failed: current.isSuccess ? store.failed : store.failed + 1,
          details: store.details.concat(current),
        };
      },
      {
        failed: 0,
        details: [],
      },
    );

    return {
      event,
      isSuccess: totalStats.failed === 0,
      total: results.length,
      ...totalStats,
    };
  }

  private async handleEvent(handler: ITargetOnEvent): Promise<ResolveEventType> {
    const payload = {
      event: handler.metadata.event,
      service: handler.instance.constructor.name,
      method: handler.method.name,
    };

    const handleMessage = handler.metadata.message
      ? `${payload.service}: ${handler.metadata.message}`
      : `${payload.service}: call ${payload.method}`;

    this.logger.debug(handleMessage + `. Start ${payload.event}`, {
      payload,
    });

    try {
      await Promise.all([handler.method.apply(handler.instance)]);

      this.logger.debug(handleMessage + `. Success ${payload.event}`, {
        markers: [LoggerMarkers.SUCCESS],
        payload,
      });

      return {
        service: payload.service,
        method: payload.method,
        isSuccess: true,
      };
    } catch (exception) {
      this.logger.error(handleMessage + `. Failed ${payload.event}`, {
        markers: [LoggerMarkers.FAILED],
        payload: {
          ...payload,
          exception,
        },
      });

      return {
        service: payload.service,
        method: payload.method,
        isSuccess: false,
        message: exception.message,
      };
    }
  }
}
