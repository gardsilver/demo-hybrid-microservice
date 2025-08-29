import { BehaviorSubject } from 'rxjs';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { GeneralAsyncContext, MetadataExplorer } from 'src/modules/common';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
  TraceSpanBuilder,
} from 'src/modules/elk-logger';
import { PrometheusManager } from 'src/modules/prometheus';
import {
  ResultsCountActiveProcessType,
  GracefulShutdownCountType,
  GracefulShutdownCountMetadata,
} from '../types/types';
import { ACTIVE_METHODS_DURATIONS, ACTIVE_METHODS_FAILED, ACTIVE_METHODS_GAUGE } from '../types/metrics';
import { GRACEFUL_SHUTDOWN_ON_COUNT_KEY } from '../types/constants';

@Injectable()
export class GracefulShutdownCountHandler implements OnModuleInit {
  private logger: IElkLoggerService;
  private readonly totalCountActiveMethods: BehaviorSubject<number>;

  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI)
    loggerBuilder: IElkLoggerServiceBuilder,
    private readonly prometheusManager: PrometheusManager,
    private readonly metadataExplorer: MetadataExplorer,
  ) {
    this.logger = loggerBuilder.build({
      module: GracefulShutdownCountHandler.name,
    });

    this.totalCountActiveMethods = new BehaviorSubject<number>(0);
  }

  @GeneralAsyncContext.define(() => TraceSpanBuilder.build())
  public async onModuleInit(): Promise<void> {
    this.logger.info('Start init decorators GracefulShutdownOnCount');

    const onEventHandlers =
      this.metadataExplorer.searchAllTargetInstanceMethod<GracefulShutdownCountMetadata>(
        GRACEFUL_SHUTDOWN_ON_COUNT_KEY,
      );

    for (const targetItem of onEventHandlers) {
      Reflect.defineMetadata(
        GRACEFUL_SHUTDOWN_ON_COUNT_KEY,
        {
          instance: this,
          increment: this['increment'],
          decrement: this['decrement'],
        },
        targetItem.method,
      );
    }

    this.logger.info('Completed init decorators GracefulShutdownOnCount');
  }

  public getTotalCountActiveMethods(): BehaviorSubject<number> {
    return this.totalCountActiveMethods;
  }

  public increment(metadata: GracefulShutdownCountType): void {
    this.totalCountActiveMethods.next(this.totalCountActiveMethods.value + 1);

    this.prometheusManager.gauge().increment(ACTIVE_METHODS_GAUGE, {
      labels: {
        service: metadata.service,
        method: metadata.method,
      },
      value: 1,
    });
  }

  public decrement(metadata: Required<GracefulShutdownCountType>): void {
    this.totalCountActiveMethods.next(this.totalCountActiveMethods.value - 1);

    this.prometheusManager.gauge().decrement(ACTIVE_METHODS_GAUGE, {
      labels: {
        service: metadata.service,
        method: metadata.method,
      },
      value: 1,
    });

    this.prometheusManager.histogram().observe(ACTIVE_METHODS_DURATIONS, {
      labels: {
        service: metadata.service,
        method: metadata.method,
      },
      value: metadata.duration,
    });

    if (!metadata.isSuccess) {
      this.prometheusManager.counter().increment(ACTIVE_METHODS_FAILED, {
        labels: {
          service: metadata.service,
          method: metadata.method,
        },
      });
    }
  }

  public async statusActiveProcess(): Promise<ResultsCountActiveProcessType> {
    const total: ResultsCountActiveProcessType = {
      total: 0,
      details: [],
    };

    const values = await this.prometheusManager.gauge().get(ACTIVE_METHODS_GAUGE);

    values.values.forEach((value) => {
      if (value.value) {
        total.total += value.value;
        total.details.push({
          service: value.labels.service.toString(),
          method: value.labels.method.toString(),
          count: value.value,
        });
      }
    });

    return total;
  }
}
