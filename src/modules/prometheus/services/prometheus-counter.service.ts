import { Counter } from 'prom-client';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerMarkers } from 'src/modules/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import {
  MetricType,
  ICounterService,
  ICounterMetricConfig,
  PrometheusLabels,
  ICounterMetricValues,
} from '../types/types';
import { PrometheusMetricBuilder } from '../builders/prometheus-metric.builder';

@Injectable()
export class PrometheusCounterService implements ICounterService {
  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI) private readonly loggerBuilder: IElkLoggerServiceBuilder,
    private readonly metricBuilder: PrometheusMetricBuilder,
  ) {}

  public increment(
    metricConfig: ICounterMetricConfig,
    params?: {
      labels?: PrometheusLabels;
      value?: number;
    },
  ): void {
    const logger = this.loggerBuilder.build({ module: `${PrometheusCounterService.name}.${this.increment.name}` });

    const metric = this.metricBuilder.build(metricConfig, MetricType.COUNTER) as Counter;

    try {
      if (params?.labels) {
        metric.inc(params.labels, params?.value);
      } else {
        metric.inc(params?.value);
      }
    } catch (error) {
      logger.error('Prometheus fail', {
        payload: {
          metricConfig,
          params,
          error,
        },
        markers: ['prometheus', LoggerMarkers.ERROR],
      });
    }
  }

  public async get(metricConfig: ICounterMetricConfig): Promise<ICounterMetricValues> {
    const logger = this.loggerBuilder.build({ module: `${PrometheusCounterService.name}.${this.get.name}` });
    const metric = this.metricBuilder.build(metricConfig, MetricType.COUNTER) as Counter;

    try {
      return await metric.get();
    } catch (error) {
      logger.error('Prometheus fail', {
        payload: {
          metricConfig,
          error,
        },
        markers: ['prometheus', LoggerMarkers.ERROR],
      });
    }
  }
}
