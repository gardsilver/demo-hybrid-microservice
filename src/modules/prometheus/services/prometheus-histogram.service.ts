import { Histogram } from 'prom-client';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerMarkers } from 'src/modules/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { MetricType, IHistogramService, IHistogramMetricConfig, PrometheusLabels } from '../types/types';
import { PrometheusMetricBuilder } from '../builders/prometheus-metric.builder';

@Injectable()
export class PrometheusHistogramService implements IHistogramService {
  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI) private readonly loggerBuilder: IElkLoggerServiceBuilder,
    private readonly metricBuilder: PrometheusMetricBuilder,
  ) {}

  observe(
    metricConfig: IHistogramMetricConfig,
    params: {
      labels?: PrometheusLabels;
      value: number;
    },
  ): void {
    const logger = this.loggerBuilder.build({ module: `${PrometheusHistogramService.name}.${this.observe.name}` });

    const metric = this.metricBuilder.build(metricConfig, MetricType.HISTOGRAM) as Histogram;

    try {
      if (params?.labels) {
        metric.observe(params.labels, params.value);
      } else {
        metric.observe(params.value);
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

  startTimer(
    metricConfig: IHistogramMetricConfig,
    params?: {
      labels?: PrometheusLabels;
    },
  ): (labels?: PrometheusLabels) => number {
    const logger = this.loggerBuilder.build({ module: `${PrometheusHistogramService.name}.${this.startTimer.name}` });

    const metric = this.metricBuilder.build(metricConfig, MetricType.HISTOGRAM) as Histogram;

    try {
      return metric.startTimer(params?.labels);
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
}
